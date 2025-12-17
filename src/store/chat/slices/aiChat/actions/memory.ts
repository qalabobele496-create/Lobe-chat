import { chainIncrementalSummary } from '@lobechat/prompts';
import { TraceNameMap, UIChatMessage } from '@lobechat/types';
import { StateCreator } from 'zustand/vanilla';

import { chatService } from '@/services/chat';
import { topicService } from '@/services/topic';
import { ChatStore } from '@/store/chat';
import { useUserStore } from '@/store/user';
import { systemAgentSelectors } from '@/store/user/selectors';

import { topicSelectors } from '../../../selectors';
import { chatSelectors } from '../../../selectors';

// Delimiter used to separate individual summaries in the accumulated history
const SUMMARY_DELIMITER = '\n\n---\n\n';

// Number of messages per compression batch
const BATCH_SIZE = 10;

/**
 * Check if a message contains file attachments
 */
const hasFileAttachments = (message: UIChatMessage): boolean => {
  return !!(message.fileList && message.fileList.length > 0);
};

/**
 * Format file messages as context string for the AI
 */
const formatFilesContext = (messages: UIChatMessage[]): string => {
  const fileMessages = messages.filter(hasFileAttachments);
  if (fileMessages.length === 0) return '';

  return fileMessages
    .map((msg) => {
      const files = msg.fileList!
        .map((f) => `[File: ${f.name}]\n${f.content || '(content not available)'}`)
        .join('\n\n');
      return `${msg.content}\n\n${files}`;
    })
    .join('\n\n');
};

export interface ChatMemoryAction {
  /**
   * Clear the history summary for the current topic.
   * Resets historySummary and all related metadata.
   */
  clearHistorySummary: () => Promise<void>;
  /**
   * Incrementally summarize history messages in batches with contextual awareness.
   * Each batch uses previous summaries + file attachments as context.
   * Files are NEVER compressed but passed as permanent context.
   *
   * Flow:
   * - S1 = compress(M2-M11, context: M1-files)
   * - S2 = compress(M12-M21, context: M1-files + S1)
   * - S3 = compress(M22-M31, context: M1-files + S1 + S2)
   *
   * @param messages - All messages to process (including file messages)
   * @param options - Optional configuration (e.g., forceReset for manual summary)
   */
  internal_summaryHistory: (messages: UIChatMessage[], options?: { forceReset?: boolean }) => Promise<void>;
  /**
   * Manually trigger a full summary of all messages in the current topic.
   * Clears existing summary and creates a new one from scratch.
   */
  triggerManualSummary: () => Promise<void>;
}

export const chatMemory: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatMemoryAction
> = (set, get) => ({
  clearHistorySummary: async () => {
    const topicId = get().activeTopicId;
    if (!topicId) return;

    await topicService.updateTopic(topicId, {
      historySummary: '',
      metadata: {
        lastSummarizedMessageIndex: 0,
        summarizationCount: 0,
      },
    });
    await get().refreshTopic();
    await get().refreshMessages();
  },

  internal_summaryHistory: async (messages, options) => {
    const topicId = get().activeTopicId;
    if (!topicId) return;

    // Get current topic to access previous summaries and metadata
    const topic = topicSelectors.currentActiveTopic(get());

    // If forceReset is true (Manual Summary), start fresh. Otherwise, use accumulated summary.
    let accumulatedSummary = options?.forceReset ? '' : (topic?.historySummary || '');

    const currentLastIndex = options?.forceReset ? 0 : (topic?.metadata?.lastSummarizedMessageIndex ?? 0);
    let summaryCount = options?.forceReset ? 0 : (topic?.metadata?.summarizationCount ?? 0);

    const { model, provider } = systemAgentSelectors.historyCompress(useUserStore.getState());

    // Separate file messages (permanent context) from compressible messages
    const fileMessages = messages.filter(hasFileAttachments);
    const compressibleMessages = messages.filter((m) => !hasFileAttachments(m));

    // Skip compression if not enough compressible messages
    if (compressibleMessages.length < BATCH_SIZE) return;

    // Format files as permanent context (never compressed)
    const filesContext = formatFilesContext(fileMessages);

    // Calculate how many complete batches we can create
    const totalBatches = Math.floor(compressibleMessages.length / BATCH_SIZE);

    if (totalBatches === 0) return;

    // Process each batch sequentially with accumulated context
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = startIdx + BATCH_SIZE;
      const batchMessages = compressibleMessages.slice(startIdx, endIdx);

      // Build context: files + previous summaries
      let contextForBatch = filesContext;
      if (accumulatedSummary) {
        contextForBatch = contextForBatch
          ? `${contextForBatch}\n\n[PREVIOUS SUMMARIES]\n${accumulatedSummary}`
          : `[PREVIOUS SUMMARIES]\n${accumulatedSummary}`;
      }

      let batchSummary = '';
      await chatService.fetchPresetTaskResult({
        onFinish: async (text) => {
          batchSummary = text;
        },
        // Pass context (files + previous summaries) to maintain narrative continuity
        params: {
          ...chainIncrementalSummary(contextForBatch || undefined, batchMessages),
          model,
          provider,
          stream: false,
        },
        trace: {
          sessionId: get().activeId,
          topicId: get().activeTopicId,
          traceName: TraceNameMap.SummaryHistoryMessages,
        },
      });

      // Append this batch's summary to accumulated summaries
      accumulatedSummary = accumulatedSummary
        ? `${accumulatedSummary}${SUMMARY_DELIMITER}${batchSummary}`
        : batchSummary;

      summaryCount++;
    }

    // Calculate new last summarized index (based on compressible messages only)
    const messagesProcessed = totalBatches * BATCH_SIZE;
    const newLastIndex = currentLastIndex + messagesProcessed;

    await topicService.updateTopic(topicId, {
      historySummary: accumulatedSummary,
      metadata: {
        ...topic?.metadata,
        model,
        provider,
        lastSummarizedMessageIndex: newLastIndex,
        summarizationCount: summaryCount,
      },
    });
    await get().refreshTopic();
    await get().refreshMessages();
  },

  triggerManualSummary: async () => {
    const topicId = get().activeTopicId;
    if (!topicId) return;

    // First, clear existing summary (just to be safe/keep state clean)
    await get().clearHistorySummary();

    // Get all messages in the current topic
    const messages = chatSelectors.activeBaseChats(get());

    // Trigger the summary with all messages + force reset to ignore stale store state
    await get().internal_summaryHistory(messages, { forceReset: true });
  },
});



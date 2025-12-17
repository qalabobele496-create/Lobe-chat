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

export interface ChatMemoryAction {
  /**
   * Clear the history summary for the current topic.
   * Resets historySummary and all related metadata.
   */
  clearHistorySummary: () => Promise<void>;
  /**
   * Incrementally summarize history messages in batches.
   * Each batch of BATCH_SIZE messages creates one summary (S1, S2, S3...).
   * Example: 30 messages with historyCount=10 → S1(M1-M10) + S2(M11-M20) + M21-M30
   * @param messages - The new messages to summarize (not yet summarized)
   */
  internal_summaryHistory: (messages: UIChatMessage[]) => Promise<void>;
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
      historySummary: undefined,
      metadata: {
        lastSummarizedMessageIndex: 0,
        summarizationCount: 0,
      },
    });
    await get().refreshTopic();
    await get().refreshMessages();
  },

  internal_summaryHistory: async (messages) => {
    const topicId = get().activeTopicId;
    if (messages.length < BATCH_SIZE || !topicId) return;

    // Get current topic to access previous summaries and metadata
    const topic = topicSelectors.currentActiveTopic(get());
    let accumulatedSummary = topic?.historySummary || '';
    const currentLastIndex = topic?.metadata?.lastSummarizedMessageIndex ?? 0;
    let summaryCount = topic?.metadata?.summarizationCount ?? 0;

    const { model, provider } = systemAgentSelectors.historyCompress(useUserStore.getState());

    // Calculate how many complete batches we can create
    const totalBatches = Math.floor(messages.length / BATCH_SIZE);

    if (totalBatches === 0) return;

    // Process each batch sequentially
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = startIdx + BATCH_SIZE;
      const batchMessages = messages.slice(startIdx, endIdx);

      let batchSummary = '';
      await chatService.fetchPresetTaskResult({
        onFinish: async (text) => {
          batchSummary = text;
        },
        // Generate summary for this batch only (independent summary)
        params: { ...chainIncrementalSummary(undefined, batchMessages), model, provider, stream: false },
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

    // Calculate new last summarized index (all complete batches processed)
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

    // First, clear existing summary
    await get().clearHistorySummary();

    // Get all messages in the current topic
    const messages = chatSelectors.activeBaseChats(get());
    if (messages.length < BATCH_SIZE) return;

    // Trigger the summary with all messages
    await get().internal_summaryHistory(messages);
  },
});


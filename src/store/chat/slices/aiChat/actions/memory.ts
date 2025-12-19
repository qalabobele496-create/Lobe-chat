import { chainIncrementalSummary } from '@lobechat/prompts';
import { TraceNameMap, UIChatMessage } from '@lobechat/types';
import { message } from 'antd';
import { StateCreator } from 'zustand/vanilla';

import { chatService } from '@/services/chat';
import { ChatStore } from '@/store/chat';
import { useUserStore } from '@/store/user';
import { systemAgentSelectors } from '@/store/user/selectors';

import { topicSelectors } from '../../../selectors';
import { chatSelectors } from '../../../selectors';

// Delimiter used to separate individual summaries in the accumulated history
// Using a unique delimiter that won't appear in normal markdown content
const SUMMARY_DELIMITER = '\n\n<!-- SUMMARY_BREAK -->\n\n';

// Number of messages per compression batch
const BATCH_SIZE = 10;

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Helper function to delay execution
 */
const delay = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

/**
 * Helper function to execute with retry logic
 */
const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelayMs: number = RETRY_DELAY_MS,
): Promise<T> => {
  let lastError: Error | undefined;
  let currentDelay = initialDelayMs;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`[memory.ts] Attempt ${attempt}/${maxRetries} failed:`, error);
      
      if (attempt < maxRetries) {
        console.log(`[memory.ts] Retrying in ${currentDelay}ms...`);
        await delay(currentDelay);
        // Exponential backoff
        currentDelay *= 2;
      }
    }
  }
  
  throw lastError;
};

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

    await get().internal_updateTopic(topicId, {
      historySummary: '',
      metadata: {
        lastSummarizedMessageId: undefined,
        summarizationCount: 0,
      },
    });
    await get().refreshMessages();
  },

  internal_summaryHistory: async (messages, options) => {
    const topicId = get().activeTopicId;
    if (!topicId) return;

    // Get current topic to access previous summaries and metadata
    const topic = topicSelectors.currentActiveTopic(get());

    // If forceReset is true (Manual Summary), start fresh. Otherwise, use accumulated summary.
    let accumulatedSummary = options?.forceReset ? '' : (topic?.historySummary || '');

    // Calculate the currentLastIndex from the stored message ID
    // This is the index of the first unsummarized message
    let currentLastIndex = 0;
    if (!options?.forceReset) {
      const lastSummarizedMessageId = topic?.metadata?.lastSummarizedMessageId as string | undefined;
      if (lastSummarizedMessageId) {
        const messageIndex = messages.findIndex((m) => m.id === lastSummarizedMessageId);
        if (messageIndex !== -1) {
          currentLastIndex = messageIndex;
        }
      }
    }
    let summaryCount = options?.forceReset ? 0 : (topic?.metadata?.summarizationCount ?? 0);

    const { model, provider } = systemAgentSelectors.historyCompress(useUserStore.getState());

    // ========================================================================
    // STEP 1: Extract ALL file attachment CONTENT from ALL messages (permanent context)
    // The FILE CONTENT is passed integrally to EVERY summarization batch
    // The MESSAGE TEXT (even from messages with attachments) is still summarized
    // ========================================================================
    const allFileMessages = messages.filter(hasFileAttachments);
    const globalFilesContext = formatFilesContext(allFileMessages);

    // ========================================================================
    // STEP 2: Get messages to process (all messages after currentLastIndex)
    // Using GLOBAL index - counts ALL messages
    // ALL messages are summarized (including those with attachments)
    // ========================================================================
    const messagesToProcess = messages.slice(currentLastIndex);

    // Skip if not enough messages to create a full batch
    if (messagesToProcess.length < BATCH_SIZE) return;

    // Calculate how many complete batches we can create
    const totalNewBatches = Math.floor(messagesToProcess.length / BATCH_SIZE);

    if (totalNewBatches === 0) return;

    // Show toast notification when starting summarization
    message.loading({
      content: `Comprimindo histórico: 0/${totalNewBatches} batches...`,
      duration: 0,
      key: 'history-summary',
    });

    // ========================================================================
    // STEP 3: Process each batch sequentially with retry logic
    // Each batch = 10 GLOBAL messages
    // ALL messages in batch are summarized (text content)
    // Attachment CONTENT is extracted to permanent context
    // - S1 = compress(M1-M10, context: AllFilesContent)
    // - S2 = compress(M11-M20, context: AllFilesContent + S1)
    // - S3 = compress(M21-M30, context: AllFilesContent + S1 + S2)
    // ========================================================================
    try {
      for (let batchIndex = 0; batchIndex < totalNewBatches; batchIndex++) {
        const startIdx = batchIndex * BATCH_SIZE;
        const endIdx = startIdx + BATCH_SIZE;

        // Get the batch - ALL messages will be summarized
        const batchMessages = messagesToProcess.slice(startIdx, endIdx);

        // Build context for this batch:
        // 1. All file attachment CONTENT from entire history (permanent context)
        // 2. All previous summaries (S1, S2, ... accumulated so far)
        let contextForBatch = globalFilesContext;

        if (accumulatedSummary) {
          contextForBatch = contextForBatch
            ? `${contextForBatch}\n\n[PREVIOUS SUMMARIES]\n${accumulatedSummary}`
            : `[PREVIOUS SUMMARIES]\n${accumulatedSummary}`;
        }

        // Update progress toast
        message.loading({
          content: `Comprimindo histórico: ${batchIndex + 1}/${totalNewBatches} batches...`,
          duration: 0,
          key: 'history-summary',
        });

        // Use retry logic for each batch
        // batchSummary is reset inside withRetry to avoid stale values from failed attempts
        const batchSummary = await withRetry(async () => {
          let result = '';
          await chatService.fetchPresetTaskResult({
            onFinish: async (text) => {
              result = text;
            },
            // The AI receives:
            // - <context>: AllFilesContent + PreviousSummaries (READ-ONLY, do not repeat)
            // - <chat_history>: ALL messages from this batch (text is summarized)
            params: {
              ...chainIncrementalSummary(contextForBatch || undefined, batchMessages),
              max_tokens: 8192,
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
          
          // Validate that we got a response
          if (!result || result.trim().length === 0) {
            throw new Error('Empty summary response received');
          }
          
          return result;
        });

        // Append this batch's summary to accumulated summaries
        // S1 -> S1 + S2 -> S1 + S2 + S3 ...
        if (batchSummary) {
          accumulatedSummary = accumulatedSummary
            ? `${accumulatedSummary}${SUMMARY_DELIMITER}${batchSummary}`
            : batchSummary;
        }

        summaryCount++;
      }
    } catch (error) {
      // Show error toast and rethrow
      message.error({
        content: 'Erro ao comprimir histórico. Tente novamente.',
        duration: 5,
        key: 'history-summary',
      });
      console.error('[memory.ts] Failed to summarize history after retries:', error);
      throw error;
    }

    // ========================================================================
    // STEP 4: Update topic with new summary and metadata
    // Store the ID of the FIRST UNSUMMARIZED message (where divider should appear)
    // ========================================================================
    const messagesProcessed = totalNewBatches * BATCH_SIZE;
    const newLastIndex = currentLastIndex + messagesProcessed;

    // Get the ID of the first message AFTER the last summarized batch
    // This is where the divider will appear in the UI
    const firstUnsummarizedMessage = messages[newLastIndex];
    const firstUnsummarizedMessageId = firstUnsummarizedMessage?.id;

    await get().internal_updateTopic(topicId, {
      historySummary: accumulatedSummary,
      metadata: {
        ...topic?.metadata,
        model,
        provider,
        lastSummarizedMessageId: firstUnsummarizedMessageId,
        summarizationCount: summaryCount,
      },
    });

    // Show success toast
    message.success({
      content: `Histórico comprimido com sucesso! ${totalNewBatches} batch(es) processado(s).`,
      duration: 3,
      key: 'history-summary',
    });

    await get().refreshMessages();
  },

  triggerManualSummary: async () => {
    const topicId = get().activeTopicId;
    if (!topicId) return;

    // First, clear existing summary (just to be safe/keep state clean)
    await get().clearHistorySummary();

    // Get all messages in the current topic
    const messages = chatSelectors.activeBaseChats(get());

    // Get historyCount from agent config (number of messages to keep in context)
    const agentStoreModule = await import('@/store/agent/store');
    const agentStoreState = agentStoreModule.getAgentStoreState();
    const agentSelectorsModule = await import('@/store/agent/selectors');
    const historyCount = agentSelectorsModule.agentChatConfigSelectors.historyCount(agentStoreState);

    // Calculate endIndex: leave the last historyCount messages unsummarized
    // E.g., with 45 messages and historyCount=10: endIndex = 45 - 10 + 1 = 36
    // This means we summarize M1-M35 (leaving M36-M45 in context)
    const endIndex = Math.max(0, messages.length - historyCount + 1);

    // Only summarize if there are enough messages
    if (endIndex <= 0) return;

    // Trigger the summary with messages up to endIndex + force reset
    await get().internal_summaryHistory(messages.slice(0, endIndex), { forceReset: true });
  },
});



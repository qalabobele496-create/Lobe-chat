import { chainIncrementalSummary } from '@lobechat/prompts';
import { TraceNameMap, UIChatMessage } from '@lobechat/types';
import { StateCreator } from 'zustand/vanilla';

import { chatService } from '@/services/chat';
import { topicService } from '@/services/topic';
import { ChatStore } from '@/store/chat';
import { useUserStore } from '@/store/user';
import { systemAgentSelectors } from '@/store/user/selectors';

import { topicSelectors } from '../../../selectors';

// Delimiter used to separate individual summaries in the accumulated history
const SUMMARY_DELIMITER = '\n\n---\n\n';

export interface ChatMemoryAction {
  /**
   * Incrementally summarize history messages.
   * Appends new summaries to existing ones, creating S1 + S2 + S3 format.
   * @param messages - The new messages to summarize (not yet summarized)
   * @param totalMessageCount - Total number of messages in the conversation (for tracking)
   */
  internal_summaryHistory: (messages: UIChatMessage[], totalMessageCount?: number) => Promise<void>;
}

export const chatMemory: StateCreator<
  ChatStore,
  [['zustand/devtools', never]],
  [],
  ChatMemoryAction
> = (set, get) => ({
  internal_summaryHistory: async (messages, _totalMessageCount) => {
    const topicId = get().activeTopicId;
    if (messages.length <= 1 || !topicId) return;

    // Get current topic to access previous summaries and metadata
    const topic = topicSelectors.currentActiveTopic(get());
    const previousSummaries = topic?.historySummary;
    const currentLastIndex = topic?.metadata?.lastSummarizedMessageIndex ?? 0;
    const summaryCount = topic?.metadata?.summarizationCount ?? 0;

    const { model, provider } = systemAgentSelectors.historyCompress(useUserStore.getState());

    let newSummary = '';
    await chatService.fetchPresetTaskResult({
      onFinish: async (text) => {
        newSummary = text;
      },
      // Generate summary for ONLY the new messages (not incorporating previous summary)
      // This creates independent summaries that stack: S1, S2, S3...
      params: { ...chainIncrementalSummary(undefined, messages), model, provider, stream: false },
      trace: {
        sessionId: get().activeId,
        topicId: get().activeTopicId,
        traceName: TraceNameMap.SummaryHistoryMessages,
      },
    });

    // APPEND new summary to existing summaries with delimiter
    // Format: S1 + delimiter + S2 + delimiter + S3...
    const accumulatedSummary = previousSummaries
      ? `${previousSummaries}${SUMMARY_DELIMITER}${newSummary}`
      : newSummary;

    // Calculate new last summarized index
    const newLastIndex = currentLastIndex + messages.length;
    const summarizationCount = summaryCount + 1;

    await topicService.updateTopic(topicId, {
      historySummary: accumulatedSummary,
      metadata: {
        ...topic?.metadata,
        model,
        provider,
        lastSummarizedMessageIndex: newLastIndex,
        summarizationCount,
      },
    });
    await get().refreshTopic();
    await get().refreshMessages();
  },
});

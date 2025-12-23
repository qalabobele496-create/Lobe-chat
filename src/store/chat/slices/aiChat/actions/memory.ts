import { chainIncrementalSummary } from '@lobechat/prompts';
import { TraceNameMap, UIChatMessage } from '@lobechat/types';
import { encodeAsync } from '@lobechat/utils';
import { StateCreator } from 'zustand/vanilla';

import { message } from '@/components/AntdStaticMethods';
import { chatService } from '@/services/chat';
import { ChatStore } from '@/store/chat';
import { useUserStore } from '@/store/user';
import { agentSelectors } from '@/store/agent/selectors';
import { getAgentStoreState } from '@/store/agent/store';
import { systemAgentSelectors } from '@/store/user/selectors';

import { topicSelectors } from '../../../selectors';
import { chatSelectors } from '../../../selectors';

const SUMMARY_DELIMITER = '\u001f';
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 10000;
const MIN_TOKEN_DENSITY = 4500;
const SUMMARIZATION_TIMEOUT = 300000;

const delay = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const withRetry = async <T>(
  fn: (attempt: number) => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelayMs: number = RETRY_DELAY_MS,
): Promise<T> => {
  let lastError: Error | undefined;
  let currentDelay = initialDelayMs;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error as Error;
      console.warn(`[memory.ts] Attempt ${attempt}/${maxRetries} failed:`, error);

      if (attempt < maxRetries) {
        console.log(`[memory.ts] Retrying in ${currentDelay}ms...`);
        await delay(currentDelay);
        currentDelay *= 2;
      }
    }
  }

  throw lastError;
};

const hasFileAttachments = (message: UIChatMessage): boolean => {
  return !!(message.fileList && message.fileList.length > 0);
};

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
  clearHistorySummary: () => Promise<void>;
  internal_summaryHistory: (messages: UIChatMessage[], options?: { forceReset?: boolean }) => Promise<void>;
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

    const topic = topicSelectors.currentActiveTopic(get());
    let accumulatedSummary = options?.forceReset ? '' : (topic?.historySummary || '');

    const filteredMessages = messages.filter((m) => m.role !== 'system' && m.role !== 'tool');

    if (filteredMessages.length < 21) {
      if (accumulatedSummary && !options?.forceReset) {
        await get().internal_updateTopic(topicId, {
          historySummary: '',
          metadata: { ...topic?.metadata, lastSummarizedMessageId: undefined, summarizationCount: 0 },
        });
      }
      return;
    }

    const totalSummarizableMessages = filteredMessages.length - 1;
    const expectedBlocks = totalSummarizableMessages >= 20
      ? 1 + Math.floor((totalSummarizableMessages - 20) / 10)
      : 0;

    const existingBlocks = accumulatedSummary.split(SUMMARY_DELIMITER).filter(Boolean);
    let currentBlockCount = 0;
    for (let i = 0; i < existingBlocks.length; i += 2) {
      if (existingBlocks[i].startsWith('{')) currentBlockCount++;
    }

    if (currentBlockCount > expectedBlocks) {
      const newBlocks = existingBlocks.slice(0, expectedBlocks * 2);
      accumulatedSummary = newBlocks.join(SUMMARY_DELIMITER);
      currentBlockCount = expectedBlocks;
    }

    if (currentBlockCount >= expectedBlocks) return;

    const { model, provider } = systemAgentSelectors.historyCompress(useUserStore.getState());
    const agentConfig = agentSelectors.currentAgentConfig(getAgentStoreState());
    const systemRole = agentConfig.systemRole;

    const allFileMessages = messages.filter(hasFileAttachments);
    const globalFilesContext = formatFilesContext(allFileMessages);

    message.loading({
      content: `Arquivando crônicas: ${currentBlockCount}/${expectedBlocks} blocos...`,
      duration: 0,
      key: 'history-summary',
    });

    try {
      for (let b = currentBlockCount; b < expectedBlocks; b++) {
        let startIdx, endIdx;
        if (b === 0) {
          startIdx = 0;
          endIdx = 20;
        } else {
          startIdx = 20 + (b - 1) * 10;
          endIdx = startIdx + 10;
        }

        const batchMessages = filteredMessages.slice(startIdx, endIdx);
        const nextMessageId = filteredMessages[endIdx]?.id;

        let previousSummariesText = '';
        for (let i = 1; i < existingBlocks.length; i += 2) {
          previousSummariesText += (previousSummariesText ? '\n\n' : '') + existingBlocks[i];
        }

        message.loading({
          content: `Arquivando crônicas: ${b + 1}/${expectedBlocks} blocos...`,
          duration: 0,
          key: 'history-summary',
        });

        const batchSummary = await withRetry(async (attempt) => {
          let result = '';
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), SUMMARIZATION_TIMEOUT);

          try {
            const payload = chainIncrementalSummary(
              previousSummariesText || undefined,
              batchMessages,
              systemRole,
              globalFilesContext
            );

            if (attempt > 1 && payload.messages && payload.messages.length > 0) {
              const lastMsg = payload.messages[payload.messages.length - 1];
              if (lastMsg && typeof lastMsg.content === 'string') {
                lastMsg.content +=
                  '\n\n⚠️ REINFORCEMENT: Your previous attempt was too short. You MUST expand your output to at least 5000 tokens. Include more dialogue, more combat details, and more sensory descriptions. DO NOT SUMMARIZE, CHRONICLE EVERYTHING.';
              }
            }

            await chatService.fetchPresetTaskResult({
              abortController,
              onFinish: async (text) => {
                result = text;
              },
              params: {
                ...payload,
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

            if (!result || result.trim().length === 0) {
              throw new Error('Resposta do arquivista vazia.');
            }

            const tokenCount = await encodeAsync(result);
            if (tokenCount < MIN_TOKEN_DENSITY && attempt < MAX_RETRIES) {
              console.warn(`[memory.ts] Densidade baixa (${tokenCount} tokens). Tentando reforço...`);
              throw new Error('Densidade insuficiente');
            }

            return { content: result, tokens: tokenCount };
          } finally {
            clearTimeout(timeoutId);
          }
        });

        const metadata = {
          id: b + 1,
          model,
          timestamp: Date.now(),
          tokens: batchSummary.tokens,
        };

        const blockStr = `${JSON.stringify(metadata)}${SUMMARY_DELIMITER}${batchSummary.content}`;
        accumulatedSummary = accumulatedSummary
          ? `${accumulatedSummary}${SUMMARY_DELIMITER}${blockStr}`
          : blockStr;

        existingBlocks.push(JSON.stringify(metadata), batchSummary.content);

        await get().internal_updateTopic(topicId, {
          historySummary: accumulatedSummary,
          metadata: {
            ...topic?.metadata,
            lastSummarizedMessageId: nextMessageId,
            summarizationCount: b + 1,
          },
        });
      }
    } catch (error) {
      message.error({
        content: 'Erro ao arquivar crônicas. A linearidade foi preservada.',
        duration: 5,
        key: 'history-summary',
      });
      console.error('[memory.ts] Failed to summarize history:', error);
      throw error;
    }

    message.success({
      content: `Crônicas arquivadas com sucesso! ${expectedBlocks} bloco(s) total(is).`,
      duration: 3,
      key: 'history-summary',
    });

    await get().refreshMessages();
  },

  triggerManualSummary: async () => {
    const topicId = get().activeTopicId;
    if (!topicId) return;
    const messages = chatSelectors.activeBaseChats(get());
    await get().internal_summaryHistory(messages, { forceReset: true });
  },
});

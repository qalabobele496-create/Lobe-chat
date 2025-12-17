import { ChatStreamPayload, UIChatMessage } from '@lobechat/types';

import { chatHistoryPrompts } from '../prompts';

export const chainSummaryHistory = (messages: UIChatMessage[]): Partial<ChatStreamPayload> => ({
  messages: [
    {
      content: `You're an assistant who's good at extracting key takeaways from conversations and summarizing them. Please summarize according to the user's needs. The content you need to summarize is located in the <chat_history> </chat_history> group of xml tags. The summary needs to maintain the original language.`,
      role: 'system',
    },
    {
      content: `${chatHistoryPrompts(messages)}

Please summarize the above conversation and retain key information including character details, plot points, and important context. The summarized content will be used as context for subsequent prompts. Aim for a comprehensive, detailed summary of around 5000 tokens minimum.`,

      role: 'user',
    },
  ],
});

/**
 * Incremental summary function that incorporates previous summary context.
 * This allows for accumulating conversation context over multiple compression rounds.
 */
export const chainIncrementalSummary = (
  previousSummary: string | undefined,
  newMessages: UIChatMessage[],
): Partial<ChatStreamPayload> => {
  const systemContent = previousSummary
    ? `You're an assistant skilled at summarizing conversations incrementally.

Here is the existing summary of earlier messages:
<previous_summary>
${previousSummary}
</previous_summary>

Your task is to create an UPDATED summary that:
1. Preserves the key information from the previous summary
2. Adds important new information from the recent messages
3. Maintains coherence and context continuity
4. Is detailed and comprehensive (aim for 5000 tokens minimum)
5. Maintains the original language of the conversation`
    : `You're an assistant who's good at extracting key takeaways from conversations and summarizing them. Please summarize according to the user's needs. The content you need to summarize is located in the <chat_history> </chat_history> group of xml tags. The summary needs to maintain the original language.`;

  const userContent = previousSummary
    ? `${chatHistoryPrompts(newMessages)}

Please create an UPDATED summary that incorporates the previous summary with the new messages above. The summary should preserve key context from earlier while adding new information.`
    : `${chatHistoryPrompts(newMessages)}

Please summarize the above conversation and retain key information including character details, plot points, and important context. The summarized content will be used as context for subsequent prompts. Aim for a comprehensive, detailed summary of around 5000 tokens minimum.`;

  return {
    messages: [
      {
        content: systemContent,
        role: 'system',
      },
      {
        content: userContent,
        role: 'user',
      },
    ],
  };
};

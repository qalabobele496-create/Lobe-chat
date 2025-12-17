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
    ? `You're an assistant skilled at summarizing conversations.

Here is the CONTEXT (File Attachments and Previous Summaries) to help you understand the narrative:
<context>
${previousSummary}
</context>

Your task is to assume the role of the storyteller and write a summary ONLY for the NEW messages found in the <chat_history>.
Rules:
1. Use the <context> ONLY for understanding the plot/characters. DO NOT re-summarize the context.
2. Summarize ONLY the new messages.
3. Maintain coherence and continuity with the provided context.
4. Be detailed and comprehensive (aim for 5000 tokens minimum) for the new segment.
5. Maintain the original language.`
    : `You're an assistant who's good at extracting key takeaways from conversations and summarizing them. Please summarize according to the user's needs. The content you need to summarize is located in the <chat_history> </chat_history> group of xml tags. The summary needs to maintain the original language.`;

  const userContent = previousSummary
    ? `${chatHistoryPrompts(newMessages)}

Please create a detailed summary of ONLY these new messages. Do NOT include information that is already in the context, but ensure the new summary flows logically from it.`
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

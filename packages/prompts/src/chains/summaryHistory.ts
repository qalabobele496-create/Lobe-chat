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

## CRITICAL RULES - NO REPETITION OR OVERLAP:
1. The <context> is YOUR BACKGROUND KNOWLEDGE ONLY. NEVER repeat, paraphrase, or re-summarize ANY information from the context.
2. Summarize EXCLUSIVELY the messages inside <chat_history> tags - these are the ONLY messages you should process.
3. If something was already mentioned in <context>, DO NOT include it again, even if it appears in the new messages as a reference.
4. Your summary must contain ONLY NEW information, events, and developments from the current batch.
5. Maintain coherence and continuity with the provided context without duplicating it.
6. Be detailed and comprehensive (aim for 5000 tokens minimum) for the new segment ONLY.
7. Maintain the original language.
8. If a character, location, or event was already described in context, reference it briefly but DO NOT re-describe it.`
    : `You're an assistant who's good at extracting key takeaways from conversations and summarizing them. Please summarize according to the user's needs. The content you need to summarize is located in the <chat_history> </chat_history> group of xml tags. The summary needs to maintain the original language.`;

  const userContent = previousSummary
    ? `${chatHistoryPrompts(newMessages)}

## TASK: Summarize ONLY the messages above (inside <chat_history> tags).

### ANTI-OVERLAP CHECKLIST:
- [ ] I will NOT repeat any character descriptions already in <context>
- [ ] I will NOT re-explain any events already summarized in <context>
- [ ] I will ONLY describe what happens in THIS batch of messages
- [ ] My summary will be 100% NEW content, zero overlap with previous summaries

Create the summary now, focusing EXCLUSIVELY on NEW developments.`
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

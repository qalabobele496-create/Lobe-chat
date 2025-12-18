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

## OUTPUT REQUIREMENTS - MANDATORY LENGTH:
Your summary MUST be approximately 5000 tokens (around 3500-4000 words). This is a HARD REQUIREMENT, not a suggestion.
The input contains ~20,000 tokens that need to be compressed to ~5000 tokens (4:1 ratio).

## CRITICAL RULES - NO REPETITION OR OVERLAP:
1. The <context> is YOUR BACKGROUND KNOWLEDGE ONLY. NEVER repeat, paraphrase, or re-summarize ANY information from the context.
2. Summarize EXCLUSIVELY the messages inside <chat_history> tags - these are the ONLY messages you should process.
3. If something was already mentioned in <context>, DO NOT include it again, even if it appears in the new messages as a reference.
4. Your summary must contain ONLY NEW information, events, and developments from the current batch.
5. Maintain coherence and continuity with the provided context without duplicating it.
6. Maintain the original language.
7. If a character, location, or event was already described in context, reference it briefly but DO NOT re-describe it.

## CONTENT REQUIREMENTS FOR RPG SESSIONS:
Include in your summary:
- **Combat details**: Tactics used, abilities/spells cast, damage dealt, critical moments
- **Character actions**: What each PC and NPC did, their decisions, dialogue highlights
- **Plot revelations**: New information discovered, secrets revealed, lore uncovered
- **Location descriptions**: Environmental details, atmosphere, sensory information
- **Emotional beats**: Character reactions, relationship developments, dramatic tension
- **Mechanical outcomes**: HP changes, items gained/lost, status effects, level progression`
    : `You're an assistant who's good at extracting key takeaways from conversations and summarizing them. Please summarize according to the user's needs. The content you need to summarize is located in the <chat_history> </chat_history> group of xml tags. The summary needs to maintain the original language.`;

  const userContent = previousSummary
    ? `${chatHistoryPrompts(newMessages)}

## TASK: Summarize ONLY the messages above (inside <chat_history> tags).

### MANDATORY OUTPUT LENGTH: ~5000 tokens (3500-4000 words)
Your summary MUST be comprehensive and detailed. Short summaries are UNACCEPTABLE.

### ANTI-OVERLAP CHECKLIST:
- [ ] I will NOT repeat any character descriptions already in <context>
- [ ] I will NOT re-explain any events already summarized in <context>
- [ ] I will ONLY describe what happens in THIS batch of messages
- [ ] My summary will be 100% NEW content, zero overlap with previous summaries

Create the summary now, focusing EXCLUSIVELY on NEW developments. Remember: ~5000 tokens is REQUIRED.`
    : `${chatHistoryPrompts(newMessages)}

## TASK: Create a comprehensive summary of this RPG session.

### MANDATORY OUTPUT LENGTH: ~5000 tokens (3500-4000 words)
Your summary MUST be comprehensive and detailed. Short summaries are UNACCEPTABLE.

### INCLUDE IN YOUR SUMMARY:
- **Combat details**: Tactics, abilities/spells, damage, critical moments
- **Character actions**: PC/NPC decisions, dialogue highlights
- **Plot revelations**: Discoveries, secrets, lore
- **Location descriptions**: Environment, atmosphere, sensory details
- **Emotional beats**: Reactions, relationships, dramatic tension
- **Mechanical outcomes**: HP, items, status effects, progression

Create the summary now. Remember: ~5000 tokens is REQUIRED.`;

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

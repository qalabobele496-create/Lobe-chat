export const historySummaryPrompt = (historySummary: string) => `<chat_history_summary>
<docstring>
This is a comprehensive chronicle of previous RPG session events. Use this information to:
- Maintain narrative continuity (reference past events, NPCs, locations)
- Track character resources (HP, spell slots, items, gold)
- Remember NPC relationships and dispositions
- Recall plot threads, quests, and mysteries
- Reference exact dialogue and dramatic moments

IMPORTANT: This summary represents COMPRESSED HISTORY. The actual messages are no longer in context.
Treat this as your MEMORY of what happened. Do NOT ask the user to repeat information contained here.
</docstring>
<summary>${historySummary}</summary>
</chat_history_summary>
`;

/**
 * Lobe Chat will inject some system instructions here
 */
export const BuiltinSystemRolePrompts = ({
  welcome,
  plugins,
  historySummary,
}: {
  historySummary?: string;
  plugins?: string;
  welcome?: string;
}) => {
  return [welcome, plugins, historySummary ? historySummaryPrompt(historySummary) : '']
    .filter(Boolean)
    .join('\n\n');
};

export const historySummaryPrompt = (historySummary: string) => {
  // Strip JSON metadata and delimiters for the AI prompt
  // New format: [JSON_METADATA]\u001f[CONTENT]\u001f...
  const SUMMARY_DELIMITER = '\u001f';
  const parts = historySummary.split(SUMMARY_DELIMITER).filter(Boolean);
  let cleanSummary = '';

  for (let i = 0; i < parts.length; i += 2) {
    if (parts[i].startsWith('{')) {
      // New format: skip JSON metadata (even index), take content (odd index)
      cleanSummary += (cleanSummary ? '\n\n' : '') + (parts[i + 1] || '');
    } else {
      // Fallback for old format or plain text
      cleanSummary += (cleanSummary ? '\n\n' : '') + parts[i];
      i--; // Adjust index to treat next part as potential metadata
    }
  }

  return `<chat_history_summary>
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
<summary>${cleanSummary}</summary>
</chat_history_summary>
`;
};

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

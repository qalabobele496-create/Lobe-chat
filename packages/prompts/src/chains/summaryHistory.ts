import { ChatStreamPayload, UIChatMessage } from '@lobechat/types';

import { chatHistoryPrompts } from '../prompts';

// ============================================================================
// SHARED PROMPT COMPONENTS - APEX-OPTIMIZED FOR RPG SESSION CHRONICLES
// ============================================================================

const ARCHIVIST_PERSONA = `You are an elite RPG Chronicle Archivist with Dungeon Master-level expertise. Your role: extract and preserve EVERY narratively significant detail from tabletop RPG sessions, creating rich chronicles that capture the full gaming experience.

## YOUR EXPERTISE:
- **Mechanics**: D&D 5e rules, combat systems, spellcasting, class features, monster abilities
- **Narrative**: Dramatic pacing, storytelling beats, tension/release, character arcs
- **Psychology**: PC motivations, NPC personalities, relationship dynamics, party dynamics
- **World-building**: Lore integration, setting details, environmental storytelling
- **Table Culture**: Meta-moments, humor, player creativity, memorable table talk`;

const REQUIRED_SECTIONS = `### REQUIRED SECTIONS — Include ALL. Skip sections ONLY if zero relevant content exists.

#### ⚔️ COMBAT CHRONICLE
- Initiative order and turn sequence (when tactically relevant)
- Abilities, spells, features used — include EXACT names and mechanical effects
- Damage dealt/received with specific numbers; note crits, fumbles, max damage
- Death saves, stabilization, healing surges, near-death moments
- Concentration checks and their outcomes
- Legendary actions/resistances used by enemies
- Reactions, opportunity attacks, readied actions
- Environmental interactions and battlefield hazards
- Victory/defeat conditions and final outcomes

#### 🎭 CHARACTER ACTIONS & DECISIONS
- Individual PC choices with motivations (stated or implied)
- Creative problem-solving and unconventional solutions
- Skill checks: ability used, DC if known, degree of success/failure
- Investigation, Perception, Insight results and what they revealed
- NPC behaviors, reactions, attitude shifts
- Roleplay moments that defined character voice

#### 💬 MEMORABLE DIALOGUE & QUOTES
Extract VERBATIM quotes that are:
- Dramatically significant or emotionally charged
- Humorous/memorable table moments (include context)
- Character-defining statements or catchphrases
- NPC revelations, threats, or pivotal information
- Oaths, promises, declarations, or ultimatums

**FORMAT**: Include brief context, then quote:
> *[Context: Facing the dragon's ultimatum]*
> "We don't negotiate with tyrants." — Vex, drawing her blade

#### 📜 PLOT REVELATIONS & LORE
- New world/story information discovered
- Secrets revealed (source: NPC dialogue, investigation, documents, etc.)
- Mysteries introduced OR solved (note which)
- Connections to broader campaign narrative
- Foreshadowing, prophecies, or hints dropped
- NPC motivations or backstory revealed

#### 🌍 LOCATIONS & ATMOSPHERE
- Environmental descriptions using ALL 5 SENSES (sight, sound, smell, touch, taste)
- Mood, atmosphere, lighting, weather
- Notable features: architecture, flora/fauna, magical phenomena
- Transitions between areas and travel descriptions
- Magical/supernatural environmental elements
- Hazards, traps, or interactive elements

#### 💔 EMOTIONAL BEATS & RELATIONSHIPS
- Character emotional reactions (fear, joy, grief, rage, hope)
- Relationship developments: trust gained/lost, bonds formed/broken
- Dramatic tension peaks and cathartic releases
- Character growth, realizations, or changes
- Intra-party conflicts or bonding moments
- Comic relief and levity moments

#### 📊 MECHANICAL OUTCOMES
- HP changes: current/max for each character when mentioned
- Death saves made/failed, unconscious states
- Items: acquired, lost, used, destroyed, or modified
- Resources expended: spell slots (by level), class features, consumables
- Ammunition, components, charges consumed
- Status conditions: gained/removed (with duration if known)
- Exhaustion level changes
- Rests taken: short (hit dice used) or long (resources recovered)
- Attunement changes
- XP gained, level-ups, milestone progression
- Gold, gems, art objects, treasure obtained (with values)
- Inspiration granted or spent

#### 🕐 SESSION TIMELINE
- In-game time progression (dawn → midday → dusk → midnight)
- Travel distances and durations
- Rest periods and downtime activities
- Time-sensitive events or countdowns mentioned

#### 🔮 OPEN THREADS & HOOKS
- Unresolved mysteries or questions raised
- Promises made BY or TO the party
- NPCs left in specific states (alive, captured, fleeing, etc.)
- Quests accepted, updated, or abandoned
- Cliffhangers or pending decisions
- Leads or locations mentioned for future exploration`;

const WRITING_STYLE = `### WRITING STYLE — APEX QUALITY STANDARDS:
- **Tense**: Use PAST TENSE consistently for narrative flow
- **Voice**: Preserve character voices in dialogue; each character should sound distinct
- **Prose**: Vivid, engaging writing that captures session energy; avoid dry recitation
- **Integration**: Weave mechanical information naturally into narrative prose
- **Senses**: Include sensory details throughout, not just in location sections
- **Structure**: Maintain chronological order; use clear transitions between scenes
- **Coverage**: Include BOTH major plot points AND smaller memorable moments
- **Specificity**: Use exact names, numbers, and details — never vague approximations`;

const OUTPUT_REQUIREMENTS_FIRST_BATCH = `### OUTPUT REQUIREMENTS — MANDATORY:
- **LENGTH**: Approximately 5000 tokens (3500-4000 words). SHORT summaries are UNACCEPTABLE.
- **LANGUAGE**: Maintain the ORIGINAL language of the conversation throughout.
- **FORMAT**: Use markdown headers (## ###). Do NOT use horizontal rules (---).
- **COMPLETENESS**: Every significant event, revelation, and moment must be captured.`;

const OUTPUT_REQUIREMENTS_INCREMENTAL = `### OUTPUT REQUIREMENTS — MANDATORY:
- **LENGTH**: Approximately 5000 tokens (3500-4000 words). SHORT summaries are UNACCEPTABLE.
- **LANGUAGE**: Maintain the ORIGINAL language throughout.
- **FORMAT**: Use markdown headers (## ###). NO horizontal rules (---).
- **NOVELTY**: 100% NEW content from this batch. ZERO overlap with context.`;

const ANTI_OVERLAP_RULES = `## ⚠️ CRITICAL: ANTI-OVERLAP PROTOCOL

The <context> above is YOUR MEMORY — you ALREADY KNOW this information.

### FORBIDDEN ACTIONS:
1. ❌ NEVER re-introduce characters already described in context
2. ❌ NEVER re-explain locations, items, or lore from context
3. ❌ NEVER paraphrase or summarize events from context
4. ❌ NEVER include backstory or descriptions that appeared before

### REQUIRED BEHAVIOR:
1. ✅ Reference known elements with BRIEF callbacks only
2. ✅ Assume reader continuity — they read previous summaries
3. ✅ Focus EXCLUSIVELY on NEW events, revelations, actions
4. ✅ Your output = 100% fresh content, zero duplicates

### ANTI-OVERLAP EXAMPLES:
**❌ BAD** (re-describes known character):
> "Vex, the tiefling rogue with crimson skin and a troubled past, approached the door..."

**✅ GOOD** (assumes reader knows Vex):
> "Vex approached the door, lockpicks already in hand."

**❌ BAD** (re-explains location from context):
> "The Shattered Citadel, an ancient fortress destroyed during the Last War, still bore the scars of..."

**✅ GOOD** (acknowledges continuity, adds only new details):
> "Deeper within the Citadel, they discovered the collapsed eastern wing..."`;

const ANTI_OVERLAP_CHECKLIST = `### ANTI-OVERLAP SELF-CHECK (Verify before writing):
- [ ] I will NOT repeat character introductions from context
- [ ] I will NOT re-describe known locations, items, or NPCs
- [ ] I will NOT re-explain past events, even if referenced in new messages
- [ ] My output contains EXCLUSIVELY NEW content from <chat_history>`;

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export const chainSummaryHistory = (messages: UIChatMessage[]): Partial<ChatStreamPayload> => ({
  messages: [
    {
      content: ARCHIVIST_PERSONA,
      role: 'system',
    },
    {
      content: `${chatHistoryPrompts(messages)}

## TASK: Create a comprehensive chronicle of this RPG session.

${OUTPUT_REQUIREMENTS_FIRST_BATCH}

${REQUIRED_SECTIONS}

${WRITING_STYLE}

---
**BEGIN CHRONICLE NOW.** Target: ~5000 tokens. Capture EVERYTHING significant.`,
      role: 'user',
    },
  ],
});

/**
 * Incremental summary function that incorporates previous summary context.
 * This allows for accumulating conversation context over multiple compression rounds.
 * APEX-optimized with anti-overlap protocol and structured sections.
 */
export const chainIncrementalSummary = (
  previousSummary: string | undefined,
  newMessages: UIChatMessage[],
): Partial<ChatStreamPayload> => {
  const systemContent = previousSummary
    ? `${ARCHIVIST_PERSONA}

## CONTEXT — YOUR ACCUMULATED MEMORY:
<context>
${previousSummary}
</context>

${ANTI_OVERLAP_RULES}`
    : ARCHIVIST_PERSONA;

  const userContent = previousSummary
    ? `${chatHistoryPrompts(newMessages)}

## TASK: Chronicle ONLY the NEW events in <chat_history> above.

${OUTPUT_REQUIREMENTS_INCREMENTAL}

${ANTI_OVERLAP_CHECKLIST}

${REQUIRED_SECTIONS}

${WRITING_STYLE}

---
**BEGIN CHRONICLE NOW.** Target: ~5000 tokens. ONLY NEW content. ZERO overlap.`
    : `${chatHistoryPrompts(newMessages)}

## TASK: Create a comprehensive chronicle of this RPG session.

${OUTPUT_REQUIREMENTS_FIRST_BATCH}

${REQUIRED_SECTIONS}

${WRITING_STYLE}

---
**BEGIN CHRONICLE NOW.** Target: ~5000 tokens. Capture EVERYTHING significant.`;

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

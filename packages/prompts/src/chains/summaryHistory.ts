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
- **D&D 5e Specifics**: Saving throws (ability + DC), advantage/disadvantage sources, bonus actions used

#### 🎭 CHARACTER ACTIONS & DECISIONS
- Individual PC choices with motivations (stated or implied)
- Creative problem-solving and unconventional solutions
- Skill checks: ability used, DC if known, degree of success/failure
- Investigation, Perception, Insight results and what they revealed
- NPC behaviors, reactions, attitude shifts
- Roleplay moments that defined character voice
- **Class Features Used**: Action Surge, Sneak Attack, Divine Smite, Wild Shape, Channel Divinity, etc.
- **Racial Abilities**: Darkvision usage, breath weapons, innate spellcasting, etc.

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

#### 🎒 INVENTÁRIO DO GRUPO
**CRITICAL**: Track ALL inventory changes with EXACT quantities and values.
- **Gold & Currency**: Total party gold, platinum, silver, copper (running total if possible)
- **Magic Items**: Name, rarity, attunement status, who carries it
- **Weapons & Armor**: Acquired, lost, or upgraded equipment
- **Consumables**: Potions (type + quantity), scrolls (spell + level), ammunition count
- **Quest Items**: Keys, letters, artifacts, MacGuffins — note significance
- **Mundane Gear**: Rope, torches, rations — only if specifically mentioned as important
- **Gems & Valuables**: Type, estimated value, who holds them
- **Loot Distribution**: Who received what after combat/exploration

**FORMAT EXAMPLE**:
> 🎒 **Inventory Changes This Session**:
> - +150 gp (split from bandit treasure)
> - +1 Potion of Healing (Cleric)
> - +Mysterious Black Key (found in crypt)
> - -2 arrows (Ranger, combat)
> - Longsword +1 (Paladin attuned)

#### 👥 NPCs CONHECIDOS
**CRITICAL**: Maintain a living record of ALL NPCs encountered.
- **Name**: Full name or alias used
- **Race/Appearance**: Brief physical description
- **Role/Occupation**: What they do, their position
- **Location**: Where the party met/left them
- **Disposition**: Friendly/Neutral/Hostile toward the party
- **Relationship to Party**: Ally, enemy, patron, merchant, quest-giver, etc.
- **Key Information**: What they know, what they want, secrets revealed
- **Status**: Alive, dead, missing, captured, etc.

**FORMAT EXAMPLE**:
> 👥 **NPCs This Session**:
> - **Mira Thornwood** (Human, F) — Innkeeper at The Rusty Nail, Friendly. Gave quest to clear cellar of rats. Alive, Millbrook.
> - **Lord Vance** (Half-elf, M) — Noble, patron. Neutral→Friendly after party saved his daughter. Owes party a favor.
> - **Skrag** (Orc, M) — Bandit leader. Hostile. KILLED in combat. Had map to hidden cache.

#### 📊 MECHANICAL OUTCOMES
- HP changes: current/max for each character when mentioned
- Death saves made/failed, unconscious states
- Resources expended: spell slots (by level), class features, consumables
- Ammunition, components, charges consumed
- Status conditions: gained/removed (with duration if known)
- Exhaustion level changes
- Rests taken: short (hit dice used) or long (resources recovered)
- Attunement changes (max 3 per character)
- XP gained, level-ups, milestone progression
- Inspiration granted or spent
- **Spell Preparation Changes**: New spells prepared after long rest
- **Hit Dice**: Current/max for each character after rests

#### 🕐 SESSION TIMELINE
- In-game time progression (dawn → midday → dusk → midnight)
- Travel distances and durations
- Rest periods and downtime activities
- Time-sensitive events or countdowns mentioned
- **Calendar Date**: If mentioned, track in-game date

#### 🔮 OPEN THREADS & HOOKS
- Unresolved mysteries or questions raised
- Promises made BY or TO the party
- NPCs left in specific states (alive, captured, fleeing, etc.)
- Quests accepted, updated, or abandoned
- Cliffhangers or pending decisions
- Leads or locations mentioned for future exploration
- **Faction Relations**: Standing with guilds, kingdoms, organizations`;

const WRITING_STYLE = `### WRITING STYLE — APEX QUALITY STANDARDS:
- **Tense**: Use PAST TENSE consistently for narrative flow
- **Voice**: Preserve character voices in dialogue; each character should sound distinct
- **Prose**: Vivid, engaging writing that captures session energy; avoid dry recitation
- **Integration**: Weave mechanical information naturally into narrative prose
- **Senses**: Include sensory details throughout, not just in location sections
- **Structure**: Maintain chronological order; use clear transitions between scenes
- **Coverage**: Include BOTH major plot points AND smaller memorable moments
- **Specificity**: Use exact names, numbers, and details — never vague approximations`;

const OUTPUT_REQUIREMENTS_FIRST_BATCH = `## ⛔ MANDATORY LENGTH REQUIREMENT — READ CAREFULLY ⛔

**YOUR OUTPUT MUST BE AT LEAST 3500 WORDS (approximately 5000 tokens).**

This is NON-NEGOTIABLE. Summaries shorter than 3500 words are REJECTED and considered FAILURES.

### WHY THIS LENGTH IS REQUIRED:
- The input contains ~20,000 tokens of rich RPG content
- A 4:1 compression ratio means ~5000 tokens output
- Short summaries lose critical narrative details, dialogue, and mechanical data
- This chronicle will be the ONLY record of these events — completeness is essential

### HOW TO ACHIEVE REQUIRED LENGTH:
1. Include EVERY combat round with specific damage numbers and ability names
2. Quote ALL significant dialogue verbatim (aim for 10-20 quotes minimum)
3. Describe EVERY location with full sensory details (5 senses)
4. Document ALL mechanical changes (HP, resources, items, conditions)
5. Capture emotional nuances and character reactions in detail
6. Include party discussions, planning, and banter
7. Describe NPC appearances, mannerisms, and speech patterns
8. Note environmental details and atmospheric elements

### OUTPUT FORMAT:
- **LANGUAGE**: Maintain the ORIGINAL language of the conversation throughout
- **FORMAT**: Use markdown headers (## ###). Do NOT use horizontal rules (---)
- **STRUCTURE**: Use all 9 required sections with substantial content in each

### SELF-CHECK BEFORE SUBMITTING:
- [ ] My output is AT LEAST 3500 words
- [ ] I included 10+ verbatim dialogue quotes
- [ ] Every combat action is documented with numbers
- [ ] All locations have sensory descriptions
- [ ] Character emotions and reactions are detailed`;

const OUTPUT_REQUIREMENTS_INCREMENTAL = `## ⛔ MANDATORY LENGTH REQUIREMENT — READ CAREFULLY ⛔

**YOUR OUTPUT MUST BE AT LEAST 3500 WORDS (approximately 5000 tokens).**

This is NON-NEGOTIABLE. Summaries shorter than 3500 words are REJECTED and considered FAILURES.

### WHY THIS LENGTH IS REQUIRED:
- The input contains ~20,000 tokens of rich RPG content
- A 4:1 compression ratio means ~5000 tokens output
- Short summaries lose critical narrative details, dialogue, and mechanical data
- This chronicle will be the ONLY record of these NEW events — completeness is essential

### HOW TO ACHIEVE REQUIRED LENGTH:
1. Include EVERY combat round with specific damage numbers and ability names
2. Quote ALL significant dialogue verbatim (aim for 10-20 quotes minimum)
3. Describe EVERY new location with full sensory details (5 senses)
4. Document ALL mechanical changes (HP, resources, items, conditions)
5. Capture emotional nuances and character reactions in detail
6. Include party discussions, planning, and banter
7. Describe NPC appearances, mannerisms, and speech patterns
8. Note environmental details and atmospheric elements

### OUTPUT FORMAT:
- **LANGUAGE**: Maintain the ORIGINAL language throughout
- **FORMAT**: Use markdown headers (## ###). NO horizontal rules (---)
- **NOVELTY**: 100% NEW content from this batch. ZERO overlap with context

### SELF-CHECK BEFORE SUBMITTING:
- [ ] My output is AT LEAST 3500 words (count them!)
- [ ] I included 10+ verbatim dialogue quotes from THIS batch
- [ ] Every NEW combat action is documented with numbers
- [ ] All NEW locations have sensory descriptions
- [ ] Character emotions and reactions are detailed
- [ ] ZERO content is repeated from <context>`;

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

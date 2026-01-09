# Word Curation Criteria

> Guidelines for determining which words are eligible for Sabotage mode.

## The Goal

Expand from 655 words to ~2,500 words that are:
- **Challenging but fair** - Stretch vocabulary without frustrating
- **Recognizable** - Most educated adults have encountered the word
- **Guessable** - Knowing it exists means you can eventually guess it

## Tier Definitions

### Tier 1: Common (Current WORD_LIST)
Words everyone knows. Daily/Random mode defaults.

**Examples**: APPLE, HOUSE, SMILE, WATER, BRAVE

**Criteria**:
- Top 5,000 most common English words
- Grade school vocabulary
- Everyday usage

### Tier 2: Challenging (Sabotage Expansion Target)
Words educated adults recognize. The sweet spot for Sabotage.

**Examples**: FUGUE, MAUVE, EPOCH, GLYPH, FJORD, KNOLL, NICHE

**Criteria**:
- SAT/GRE vocabulary level
- Appears in mainstream media (news, books, movies)
- Has a clear, non-technical meaning
- Most adults say "oh yeah, I know that word"

**Include if**:
- Common in a well-known domain (music: FUGUE, colors: MAUVE, geography: FJORD)
- Used metaphorically in everyday speech ("an epoch in history")
- Appears in crossword puzzles frequently
- You'd expect a college graduate to know it

### Tier 3: Expert (Optional Hard Mode)
Niche but legitimate vocabulary. For players who want extra challenge.

**Examples**: KNURL, BRINE, CREEL, SPALL, SCREE

**Criteria**:
- Specialist vocabulary (cooking, sailing, geology)
- Crossword enthusiast words
- "I've seen this word but had to look it up"

### Tier 4: Obscure (Never Eligible)
Too obscure for fair gameplay. Blocked from all modes.

**Examples**: FLUYT, COHOE, GUSLI, BEISA, WIZZO

**Criteria**:
- Archaic/obsolete (no modern usage)
- Regional dialect only
- Highly technical jargon
- "I've never heard of this word"

---

## Decision Framework

For each word, ask these questions in order:

```
1. Is it a real English word?
   NO → Reject
   YES → Continue

2. Would a typical college graduate recognize it?
   YES → Tier 1 or 2 (include)
   MAYBE → Continue to #3
   NO → Continue to #4

3. Would they recognize it in context?
   "The fugue state lasted three days"
   "The mauve curtains matched the room"
   YES → Tier 2 (include)
   NO → Continue to #4

4. Is it common in a specific domain most people know?
   (cooking, music, geography, sports, nature)
   YES → Tier 2 or 3 (include)
   NO → Tier 4 (reject)
```

---

## Red Flags (Auto-Reject)

- **Obsolete spellings**: SHEWN, STOPT
- **British-only slang**: CUPPA, WIZZO
- **Scientific Latin**: TAXA, GENUS (unless very common)
- **Foreign words not anglicized**: MAHAL, BARCA
- **Plural forms of obscure nouns**: GURKS, FLEGS
- **Archaic verb forms**: DOEST, HADST
- **Regional fish/plant names**: COHOE, BEISA

---

## Green Flags (Auto-Include)

- **Common crossword words**: EPOCH, IRATE, ADIEU
- **Music terms everyone knows**: FUGUE, FORTE, TEMPO
- **Art/color terms**: MAUVE, OCHRE, SEPIA
- **Geography everyone learned**: FJORD, DELTA, ATOLL
- **Food terms**: BRINE, GLAZE, SAUTÉ (if in dictionary as SAUTE)
- **Common metaphors**: CRUX, NEXUS, MOTIF

---

## Methodology for Curation

### Step 1: Start with Known Good Lists
- NYT Wordle solution list (~2,300 words) - battle-tested
- Popular crossword word lists
- SAT/GRE vocabulary lists

### Step 2: Filter Current VALID_GUESSES
- Cross-reference against word frequency data
- Remove anything below frequency threshold
- Manual review of borderline cases

### Step 3: Manual Review Pass
For each candidate word:
1. Can I use it in a sentence without sounding pretentious?
2. Would I be annoyed if this was my Wordle answer?
3. Is there a common context where this word appears?

### Step 4: Playtest
- Have 5-10 people play with candidate words
- Track frustration reports
- Adjust criteria based on feedback

---

## Examples: Include vs Exclude

| Word | Decision | Reasoning |
|------|----------|-----------|
| FUGUE | ✅ Include | Music term, "fugue state" in psychology |
| MAUVE | ✅ Include | Common color name |
| EPOCH | ✅ Include | "End of an epoch", common metaphor |
| GLYPH | ✅ Include | Fonts, Egyptian hieroglyphics |
| KNOLL | ✅ Include | "Grassy knoll", geography term |
| FJORD | ✅ Include | Geography, Norway, everyone knows |
| NICHE | ✅ Include | Very common, "niche market" |
| BRINE | ✅ Include | Cooking term, pickle brine |
| GOURD | ✅ Include | Pumpkin, squash, Thanksgiving |
| WALTZ | ✅ Include | Dance everyone knows |
| FLUYT | ❌ Exclude | 17th century Dutch cargo ship |
| COHOE | ❌ Exclude | Pacific salmon variety, regional |
| GUSLI | ❌ Exclude | Ancient Russian string instrument |
| BEISA | ❌ Exclude | East African oryx subspecies |
| WIZZO | ❌ Exclude | British slang for "wizard" |
| CUPPA | ❌ Exclude | British slang for cup of tea |
| SCROG | ❌ Exclude | Cannabis growing technique |
| FLEGS | ❌ Exclude | Scottish dialect, to frighten |

---

## Tracking Decisions

For audit trail, record:
```
WORD: FUGUE
TIER: 2 (Challenging)
DECISION: Include
REASON: Common music term, psychology usage (fugue state)
REVIEWER: Claude
DATE: 2026-01-08
```

This can live in the database as metadata or a separate review log.

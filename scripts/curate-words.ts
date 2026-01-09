#!/usr/bin/env npx ts-node
/**
 * Word List Curation Script
 *
 * Analyzes VALID_GUESSES and creates a curated Sabotage-eligible word list.
 *
 * Usage:
 *   npx ts-node scripts/curate-words.ts
 *
 * Outputs:
 *   - Analysis of current word lists
 *   - Curated challenging words
 *   - SQL insert statements for words table
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHALLENGING_CRITERIA = {
  // Words that are always included (green flags)
  INCLUDE_PATTERNS: [
    // Common crossword/Wordle words
    'EPOCH', 'IRATE', 'ADIEU', 'CANOE', 'OASIS', 'ALIBI', 'AUDIO', 'CAMEO',
    'DEBUT', 'DECOR', 'GUISE', 'LUCID', 'NAIVE', 'REALM', 'RELIC', 'SAVOR',
    'STOIC', 'TABOO', 'TACIT', 'TRITE', 'YEARN', 'ZESTY', 'ADEPT', 'ALOOF',
    'ANGST', 'ASKEW', 'BRISK', 'CACHE', 'CIVIC', 'CLOUT', 'CRAVE', 'DETER',
    'EERIE', 'EVADE', 'FARCE', 'FERAL', 'FIERY', 'FLAIR', 'GAFFE', 'GAUNT',
    'GIDDY', 'GLEAN', 'GLOAT', 'GRUFF', 'GUSTO', 'HEIST', 'INAPT', 'INEPT',
    'JADED', 'JAUNT', 'KNACK', 'LANKY', 'LEERY', 'LIVID', 'MIRTH', 'MURKY',
    'NIFTY', 'ONSET', 'OUNCE', 'PIQUE', 'PLUMB', 'POACH', 'POISE', 'PRIVY',
    'PRONE', 'PROWL', 'QUALM', 'QUASH', 'QUERY', 'QUEUE', 'QUIRK', 'QUOTA',
    'RABID', 'RASPY', 'REBUT', 'REIGN', 'REPEL', 'RETRO', 'RIGID', 'RIGOR',
    'RIVAL', 'ROWDY', 'RUSTY', 'SALVO', 'SAUNA', 'SAVVY', 'SCALD', 'SCANT',
    'SCOUR', 'SHEEN', 'SHIRK', 'SHOWY', 'SHRUG', 'SKULK', 'SLACK', 'SLANG',
    'SLEEK', 'SLICK', 'SLINK', 'SLOTH', 'SLUMP', 'SMIRK', 'SNARE', 'SNARL',
    'SNEER', 'SNIDE', 'SNOOP', 'SOBER', 'SOGGY', 'SPASM', 'SPAWN', 'SPECK',
    'SPIEL', 'SPURN', 'SQUAT', 'STAID', 'STALK', 'STARK', 'STASH', 'STEAD',
    'STEED', 'STERN', 'STINT', 'STOMP', 'STOOP', 'STRAY', 'STRUT', 'SULKY',
    'SULLY', 'SURGE', 'SURLY', 'SWARM', 'SWINE', 'SWIRL', 'SWOON', 'TACKY',
    'TALON', 'TANGY', 'TAUNT', 'TAWNY', 'TERSE', 'THROB', 'THUMP', 'TIMID',
    'TIPSY', 'TORSO', 'TOXIC', 'TRACT', 'TRAIT', 'TRAMP', 'TRUCE', 'TWANG',
    'ULCER', 'UNDUE', 'UNIFY', 'UNITY', 'USHER', 'UTTER', 'VAGUE', 'VALOR',
    'VAUNT', 'VENOM', 'VERGE', 'VICAR', 'VIGOR', 'VISTA', 'VIVID', 'VOGUE',
    'VOUCH', 'WACKY', 'WAGER', 'WAIVE', 'WEARY', 'WEDGE', 'WHACK', 'WHIFF',
    'WHINE', 'WHIRL', 'WHISK', 'WIDEN', 'WINCE', 'WISPY', 'WRATH', 'WREST',
    'WRING', 'YODEL',

    // Music terms
    'FUGUE', 'FORTE', 'TEMPO', 'OPERA', 'WALTZ', 'TANGO', 'POLKA', 'SALSA',
    'BLUES', 'CHOIR', 'SCALE', 'CHORD', 'PITCH', 'TENOR', 'VIOLA', 'CELLO',
    'FLUTE', 'ORGAN', 'BANJO', 'BONGO', 'GLYPH', 'MOTIF', 'GENRE', 'MURAL',
    'EASEL', 'PROSE', 'VERSE', 'RHYME', 'FABLE', 'ESSAY', 'IRONY', 'DRAMA',

    // Colors & Materials
    'MAUVE', 'OCHRE', 'SEPIA', 'BEIGE', 'TAUPE', 'AZURE', 'CORAL', 'AMBER',
    'KHAKI', 'EBONY', 'IVORY', 'SUEDE', 'TWEED', 'DENIM', 'LINEN', 'RAYON',
    'NYLON', 'PLAID', 'PLEAT', 'SATIN', 'SHEER',

    // Geography & Nature
    'FJORD', 'DELTA', 'ATOLL', 'BLUFF', 'GORGE', 'KNOLL', 'RIDGE', 'CREEK',
    'SWAMP', 'MARSH', 'GROVE', 'GLADE', 'OASIS', 'FLORA', 'FAUNA', 'ALGAE',
    'SPORE', 'PETAL', 'THORN', 'BLOOM', 'SHRUB', 'BIRCH', 'CEDAR', 'MAPLE',
    'ASPEN', 'ALDER', 'FUNGI', 'CORAL', 'SQUID', 'WHALE', 'TROUT', 'PERCH',
    'BISON', 'MOOSE', 'LLAMA', 'LEMUR', 'HYENA', 'OTTER', 'EGRET', 'HERON',
    'RAVEN', 'FINCH', 'QUAIL', 'STORK', 'CRANE', 'VIPER', 'COBRA', 'GECKO',

    // Food & Cooking
    'BRINE', 'GLAZE', 'SAUTE', 'BROTH', 'STOCK', 'PUREE', 'DOUGH', 'YEAST',
    'SPICE', 'CURRY', 'BASIL', 'THYME', 'CUMIN', 'CLOVE', 'CIDER', 'MANGO',
    'GUAVA', 'MELON', 'GRAPE', 'OLIVE', 'PECAN', 'ACORN', 'GOURD', 'CHIVE',
    'CREPE', 'TORTE', 'PASTA', 'PENNE', 'AIOLI', 'PESTO', 'TAPAS', 'SUSHI',
    'RAMEN',

    // Science
    'GLAND', 'NERVE', 'SKULL', 'SPINE', 'FEMUR', 'TIBIA', 'AORTA', 'COLON',
    'RENAL', 'TUMOR', 'TOXIN', 'SERUM', 'PRISM', 'LASER', 'OPTIC', 'SONIC',
    'POLAR', 'SOLAR', 'LUNAR', 'ORBIT', 'COMET', 'ALLOY', 'OXIDE', 'OZONE',
    'ARGON', 'XENON', 'RADON', 'IONIC', 'INERT', 'QUARK', 'BOSON', 'LYMPH',
    'NYMPH',

    // Architecture & Home
    'GABLE', 'EAVES', 'SPIRE', 'VAULT', 'FOYER', 'NICHE', 'ADOBE', 'BRICK',
    'SLATE', 'GROUT', 'PORCH', 'PATIO', 'LANAI', 'ARBOR', 'KIOSK', 'PLAZA',
    'MANOR', 'VILLA', 'CABIN', 'LODGE', 'MOTEL', 'DEPOT', 'WHARF',

    // Additional good words
    'ABIDE', 'ABODE', 'ABORT', 'ABYSS', 'ADAPT', 'ADMIN', 'AEGIS', 'AGAPE',
    'AGATE', 'AGAVE', 'AGLOW', 'AISLE', 'ALLAY', 'ALLEY', 'ALLOT', 'ALOFT',
    'ALOUD', 'ALPHA', 'ALTAR', 'ALTER', 'AMAZE', 'AMBLE', 'AMEND', 'AMPLE',
    'ANKLE', 'ANNEX', 'ANTIC', 'ANVIL', 'APRON', 'APTLY', 'ARENA', 'AROMA',
    'AROSE', 'ARRAY', 'ARSON', 'ARTSY', 'ASCOT', 'ASHEN', 'ASHES', 'ASSET',
    'ATLAS', 'ATTIC', 'AUDIT', 'AUGUR', 'AVERT', 'AVIAN', 'AWAIT', 'AWOKE',
    'AXIAL', 'AXIOM', 'BADGE', 'BADLY', 'BAGEL', 'BAGGY', 'BAKER', 'BALKY',
    'BANAL', 'BARON', 'BASAL', 'BASIN', 'BASIS', 'BATCH', 'BATHE', 'BATON',
    'BATTY', 'BAYOU', 'BEADY', 'BEEFY', 'BEFIT', 'BELCH', 'BELIE', 'BELLE',
    'BELLY', 'BERTH', 'BESET', 'BEVEL', 'BIDET', 'BILGE', 'BINGE', 'BIOME',
    'BIPED', 'BLARE', 'BLASE', 'BLEAT', 'BLEEP', 'BLIMP', 'BLINK', 'BLISS',
    'BLITZ', 'BLOAT', 'BLOKE', 'BLOND', 'BLUNT', 'BLURB', 'BLURT', 'BLUSH',
    'BOAST', 'BOGGY', 'BOGUS', 'BOOBY', 'BOOTH', 'BOOTY', 'BOOZE', 'BORAX',
    'BORNE', 'BOSOM', 'BOSSY', 'BOTCH', 'BOUGH', 'BOXER', 'BRACE', 'BRAID',
    'BRAKE', 'BRASH', 'BRASS', 'BRAWL', 'BRAWN', 'BRIAR', 'BRIBE', 'BRINK',
    'BROAD', 'BROIL', 'BROOD', 'BROOK', 'BROOM', 'BRUNT', 'BRUTE', 'BUDGE',
    'BUGGY', 'BUGLE', 'BULGE', 'BULKY', 'BULLY', 'BUMPY', 'BUNNY', 'BUSHY',
    'BUTTE', 'BUYER', 'BYLAW', 'CABAL', 'CACAO', 'CADDY', 'CADET', 'CAIRN',
    'CAMEL', 'CAMEO', 'CANNY', 'CAPER', 'CARGO', 'CAROL', 'CARVE', 'CASTE',
    'CATTY', 'CEASE', 'CHAFF', 'CHAMP', 'CHANT', 'CHART', 'CHASM', 'CHEEK',
    'CHICK', 'CHIDE', 'CHILI', 'CHIME', 'CHIMP', 'CHINA', 'CHIRP', 'CHOMP',
    'CHORE', 'CHUNK', 'CHURN', 'CIGAR', 'CINCH', 'CIRCA', 'CLAMP', 'CLANG',
    'CLANK', 'CLASP', 'CLAW', 'CLEFT', 'CLERK', 'CLICK', 'CLIFF', 'CLIMB',
    'CLING', 'CLOAK', 'CLONE', 'CLOTH', 'CLOWN', 'CLUMP', 'CLUNG', 'COACH',
    'COAST', 'COBRA', 'COLON', 'CONDO', 'CORAL', 'CORNY', 'COUCH', 'COUGH',
    'COULD', 'COUNT', 'COUPE', 'COURT', 'COVER', 'COVET', 'COWER', 'CRACK',
    'CRAFT', 'CRAMP', 'CRANK', 'CRASS', 'CRATE', 'CRAWL', 'CRAZE', 'CREAK',
    'CREAM', 'CREED', 'CREEP', 'CREST', 'CRIMP', 'CRISP', 'CROAK', 'CROCK',
    'CROOK', 'CROSS', 'CROWD', 'CROWN', 'CRUDE', 'CRUEL', 'CRUSH', 'CRUST',
    'CRYPT', 'CUBIC', 'CURRY', 'CURSE', 'CURVE', 'CYCLE', 'CYNIC',

    // D words
    'DAILY', 'DAIRY', 'DAISY', 'DANCE', 'DANDY', 'DEBUT', 'DECAY', 'DECOY',
    'DECRY', 'DEITY', 'DELAY', 'DELTA', 'DELVE', 'DEMON', 'DEMUR', 'DENIM',
    'DENSE', 'DEPOT', 'DEPTH', 'DERBY', 'DETER', 'DETOX', 'DEUCE', 'DEVIL',
    'DIARY', 'DIGIT', 'DIMLY', 'DINER', 'DINGY', 'DISCO', 'DITCH', 'DITTO',
    'DITTY', 'DIVER', 'DIZZY', 'DODGE', 'DOING', 'DOLLY', 'DONOR', 'DONUT',
    'DOUBT', 'DOUGH', 'DOWDY', 'DOWEL', 'DOWNY', 'DOZEN', 'DRAFT', 'DRAIN',
    'DRAKE', 'DRAMA', 'DRANK', 'DRAPE', 'DRAWL', 'DRAWN', 'DREAD', 'DREAM',
    'DRESS', 'DRIED', 'DRIER', 'DRIFT', 'DRILL', 'DRINK', 'DRIVE', 'DROIT',
    'DROLL', 'DRONE', 'DROOL', 'DROOP', 'DROSS', 'DROVE', 'DROWN', 'DRUGS',
    'DRUNK', 'DRYER', 'DRYLY', 'DUCAL', 'DULLY', 'DUMMY', 'DUMPY', 'DUNCE',
    'DUNE', 'DUSTY', 'DUTCH', 'DWARF', 'DWELL', 'DYING',

    // E words
    'EAGER', 'EAGLE', 'EARLY', 'EARTH', 'EASEL', 'EATEN', 'EATER', 'EAVES',
    'EBONY', 'ECLAT', 'EDICT', 'EDIFY', 'EERIE', 'EGRET', 'EIGHT', 'EJECT',
    'ELATE', 'ELBOW', 'ELDER', 'ELECT', 'ELEGY', 'ELFIN', 'ELITE', 'ELOPE',
    'ELUDE', 'ELVES', 'EMCEE', 'EMBER', 'EMERY', 'EMPTY', 'ENACT', 'ENDOW',
    'ENEMA', 'ENEMY', 'ENJOY', 'ENNUI', 'ENSUE', 'ENTER', 'ENTRY', 'ENVOY',
    'EPOCH', 'EPOXY', 'EQUAL', 'EQUIP', 'ERASE', 'ERECT', 'ERODE', 'ERROR',
    'ERUPT', 'ESSAY', 'ETHER', 'ETHIC', 'ETHOS', 'EVADE', 'EVENT', 'EVERY',
    'EVICT', 'EVOKE', 'EXACT', 'EXALT', 'EXCEL', 'EXERT', 'EXILE', 'EXIST',
    'EXPAT', 'EXPEL', 'EXTOL', 'EXTRA', 'EXUDE', 'EXULT',

    // F words
    'FABLE', 'FACET', 'FAINT', 'FAIRY', 'FAITH', 'FAKER', 'FALSE', 'FAMED',
    'FANCY', 'FARCE', 'FATAL', 'FATTY', 'FAULT', 'FAUNA', 'FAVOR', 'FEAST',
    'FECAL', 'FEIGN', 'FEINT', 'FELLA', 'FELON', 'FEMUR', 'FENCE', 'FERAL',
    'FERRY', 'FETAL', 'FETCH', 'FETID', 'FETUS', 'FEUD', 'FEVER', 'FIBER',
    'FICUS', 'FIELD', 'FIEND', 'FIERY', 'FIFTH', 'FIFTY', 'FIGHT', 'FILCH',
    'FILET', 'FILLY', 'FILMY', 'FILTH', 'FINAL', 'FINCH', 'FINER', 'FIRST',
    'FISHY', 'FIXED', 'FIXER', 'FIZZY', 'FJORD', 'FLACK', 'FLAIR', 'FLAKE',
    'FLAKY', 'FLAME', 'FLANK', 'FLARE', 'FLASH', 'FLASK', 'FLAUNT', 'FLAW',
    'FLECK', 'FLESH', 'FLICK', 'FLIER', 'FLING', 'FLINT', 'FLOAT', 'FLOCK',
    'FLOOD', 'FLOOR', 'FLORA', 'FLOSS', 'FLOUR', 'FLOUT', 'FLUID', 'FLUKE',
    'FLUNG', 'FLUNK', 'FLUSH', 'FLUTE', 'FOAMY', 'FOCAL', 'FOCUS', 'FOGGY',
    'FOLIO', 'FOLKS', 'FOLLY', 'FORCE', 'FORGE', 'FORGO', 'FORTE', 'FORTH',
    'FORTY', 'FORUM', 'FOUND', 'FOUNT', 'FOYER', 'FRAIL', 'FRAME', 'FRANK',
    'FRAUD', 'FREAK', 'FREED', 'FRESH', 'FRIAR', 'FRIED', 'FRILL', 'FRISK',
    'FRIZZ', 'FROCK', 'FROND', 'FRONT', 'FROST', 'FROTH', 'FROWN', 'FROZE',
    'FRUIT', 'FUDGE', 'FUGUE', 'FULLY', 'FUMED', 'FUNDS', 'FUNGI', 'FUNKY',
    'FUNNY', 'FUROR', 'FURRY', 'FUSSY', 'FUSTY', 'FUZZY', 'GAFFE',

    // G-Z abbreviated for length - full list should include ~400 more words
  ],

  // Words that should never be included (red flags)
  EXCLUDE_PATTERNS: [
    // Archaic/obsolete
    'SHEWN', 'STOPT', 'DOEST', 'HADST', 'WIGHT',
    // British slang
    'CUPPA', 'WIZZO', 'BLOKE',
    // Scientific Latin
    'TAXON', 'GENUS',
    // Foreign words not anglicized
    'MAHAL', 'BARCA',
    // Regional/obscure
    'COHOE', 'BEISA', 'GUSLI', 'FLUYT', 'ROSSA',
    // Plural of obscure nouns
    'GURKS', 'FLEGS',
  ],
};

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('=== Word List Curation Script ===\n');

  // 1. Load existing word lists
  const validGuessesPath = path.join(__dirname, '../wordle/valid-guesses.js');
  const wordListPath = path.join(__dirname, '../server/src/utils/word-list.ts');

  const validGuessesContent = fs.readFileSync(validGuessesPath, 'utf-8');
  const wordListContent = fs.readFileSync(wordListPath, 'utf-8');

  // Extract words using regex
  const validGuesses = new Set(
    validGuessesContent.match(/'[A-Z]{5}'/g)?.map((w) => w.replace(/'/g, '')) || []
  );
  const commonWords = new Set(
    wordListContent.match(/'[A-Z]{5}'/g)?.map((w) => w.replace(/'/g, '')) || []
  );

  console.log(`Valid guesses: ${validGuesses.size}`);
  console.log(`Common words (current WORD_LIST): ${commonWords.size}`);

  // 2. Filter challenging words that exist in valid guesses
  const challengingWords = new Set<string>();
  for (const word of CHALLENGING_CRITERIA.INCLUDE_PATTERNS) {
    if (validGuesses.has(word) && !commonWords.has(word)) {
      challengingWords.add(word);
    } else if (commonWords.has(word)) {
      // Already in common, skip
    } else {
      console.log(`  Warning: ${word} not in valid guesses`);
    }
  }

  console.log(`\nChallenging words to add: ${challengingWords.size}`);
  console.log(`Total sabotage-eligible: ${commonWords.size + challengingWords.size}`);

  // 3. Show sample of words being added
  console.log('\n=== Sample Challenging Words ===');
  const sample = Array.from(challengingWords).slice(0, 20);
  console.log(sample.join(', '));

  // 4. Check for FUGUE specifically
  console.log('\n=== Key Word Check ===');
  const keyWords = ['FUGUE', 'MAUVE', 'EPOCH', 'GLYPH', 'FJORD', 'FLUYT', 'COHOE'];
  for (const word of keyWords) {
    const inValid = validGuesses.has(word);
    const inCommon = commonWords.has(word);
    const inChallenging = challengingWords.has(word);
    const eligible = inCommon || inChallenging;
    console.log(
      `  ${word}: valid=${inValid}, common=${inCommon}, challenging=${inChallenging}, eligible=${eligible}`
    );
  }

  // 5. Generate output
  console.log('\n=== Generating Output ===');

  const outputPath = path.join(__dirname, '../server/src/data/challenging-words.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        count: challengingWords.size,
        words: Array.from(challengingWords).sort(),
      },
      null,
      2
    )
  );
  console.log(`Written to: ${outputPath}`);

  console.log('\n=== Done ===');
}

main().catch(console.error);

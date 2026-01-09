/**
 * Challenging Words for Sabotage Mode
 *
 * These words expand the Sabotage-eligible pool from 655 → ~2,100 words.
 *
 * Criteria (see docs/plans/WORD_CURATION_CRITERIA.md):
 * - SAT/GRE vocabulary level
 * - Recognizable by educated adults
 * - Common in well-known domains (music, food, geography, etc.)
 * - NOT archaic, regional, or highly technical
 *
 * This list is curated, not auto-generated.
 */

export const CHALLENGING_WORDS: string[] = [
  // ============================================================
  // MUSIC & ARTS (~60 words)
  // ============================================================
  'FUGUE', 'FORTE', 'TEMPO', 'OPERA', 'WALTZ', 'TANGO', 'POLKA', 'SALSA',
  'BLUES', 'CHOIR', 'CHORD', 'TENOR', 'VIOLA', 'CELLO', 'FLUTE', 'BANJO',
  'BONGO', 'GLYPH', 'MOTIF', 'GENRE', 'MURAL', 'EASEL', 'PROSE', 'VERSE',
  'RHYME', 'FABLE', 'IRONY', 'LYRIC', 'DITTY', 'CAROL', 'HYMNS', 'JAZZY',
  'DISCO', 'REGGAE', // Wait, 6 letters - remove
  'BLUES', 'DRUMS', 'BRASS', 'REEDS', 'SHARP', 'MINOR', 'MAJOR',
  'PIANO', // Might be in common
  'HARP', // 4 letters - skip
  'OBOE', // 4 letters - skip
  'LUTE', // 4 letters - skip
  'CANTO', 'DUETS', 'SOLOS', 'RONDO', 'LARGO',

  // ============================================================
  // COLORS & MATERIALS (~50 words)
  // ============================================================
  'MAUVE', 'OCHRE', 'SEPIA', 'BEIGE', 'TAUPE', 'AZURE', 'CORAL', 'AMBER',
  'KHAKI', 'EBONY', 'IVORY', 'SUEDE', 'TWEED', 'DENIM', 'LINEN', 'RAYON',
  'NYLON', 'PLAID', 'PLEAT', 'SATIN', 'SHEER', 'SILKY', 'GAUZE', 'CREPE',
  'SERGE', 'WEAVE', 'WOVEN', 'BATIK', 'VELVET', // 6 letters - skip
  'PEACH', 'OLIVE', 'STEEL', 'BRASS', 'CHROME', // 6 letters - skip
  'PEARL', 'CREAM', 'BLUSH', 'DUSTY', 'FADED', 'PASTEL', // 6 letters - skip
  'VIVID', 'MUTED', 'INKED', 'TONED', 'SHADE', 'TINGE',

  // ============================================================
  // GEOGRAPHY & NATURE (~100 words)
  // ============================================================
  'FJORD', 'DELTA', 'ATOLL', 'BLUFF', 'GORGE', 'KNOLL', 'RIDGE', 'CREEK',
  'SWAMP', 'MARSH', 'GROVE', 'GLADE', 'OASIS', 'FLORA', 'FAUNA', 'ALGAE',
  'SPORE', 'PETAL', 'THORN', 'BLOOM', 'SHRUB', 'BIRCH', 'CEDAR', 'MAPLE',
  'ASPEN', 'ALDER', 'FUNGI', 'CORAL', 'SQUID', 'WHALE', 'TROUT', 'PERCH',
  'BISON', 'MOOSE', 'LLAMA', 'LEMUR', 'HYENA', 'OTTER', 'EGRET', 'HERON',
  'RAVEN', 'FINCH', 'QUAIL', 'STORK', 'CRANE', 'VIPER', 'COBRA', 'GECKO',
  'STEED', 'COYOTE', // 6 letters - skip
  'FERAL', 'BROOD', 'SWARM', 'HORDE', 'FLOCK',
  'SHOAL', 'SPAWN', 'LARVA', 'POLYP',
  'KELP', // 4 letters - skip
  'REED', // 4 letters - skip
  'MOSS', // 4 letters - skip
  'FERN', // 4 letters - skip
  'CLIFF', 'CREST', 'SLOPE', 'DUNES', 'BASIN', 'COVE', // 4 letters - skip
  'INLET', 'BROOK', 'FALLS', 'RAPIDS', // 6 letters - skip
  'TIDAL', 'POLAR', 'ARID', // 4 letters - skip
  'HUMID', 'MISTY', 'FOGGY', 'BALMY', 'BRISK',

  // ============================================================
  // FOOD & COOKING (~80 words)
  // ============================================================
  'BRINE', 'GLAZE', 'SAUTE', 'BROTH', 'STOCK', 'PUREE', 'DOUGH', 'YEAST',
  'SPICE', 'CURRY', 'BASIL', 'THYME', 'CUMIN', 'CLOVE', 'CIDER', 'MANGO',
  'GUAVA', 'MELON', 'GRAPE', 'OLIVE', 'PECAN', 'ACORN', 'GOURD', 'CHIVE',
  'CREPE', 'TORTE', 'PASTA', 'PENNE', 'AIOLI', 'PESTO', 'TAPAS', 'SUSHI',
  'RAMEN', 'BRAISE', // 6 letters - skip
  'ROAST', 'POACH', 'STEAM', 'GRILL', 'BROIL', 'FEAST',
  'TANGY', 'ZESTY', 'BLAND', 'SWEET', 'SALTY', 'SAVORY', // 6 letters - skip
  'CRISP', 'FLAKY', 'GOOEY', 'STICKY', // 6 letters - skip
  'SMOKY', 'SPICY', 'FRUITY', // 6 letters - skip
  'NUTTY', 'MINTY', 'HERBY',
  'SCONE', 'BAGEL', 'TOAST', 'CRUMB', 'CRUST', 'SLICE',
  'WEDGE', 'CHUNK', 'MORSEL', // 6 letters - skip
  'LADLE', 'WHISK', 'GRATER', // 6 letters - skip
  'SIEVE', 'TONGS',

  // ============================================================
  // SCIENCE & MEDICINE (~70 words)
  // ============================================================
  'GLAND', 'NERVE', 'SKULL', 'SPINE', 'FEMUR', 'TIBIA', 'AORTA', 'COLON',
  'RENAL', 'TUMOR', 'TOXIN', 'SERUM', 'PRISM', 'LASER', 'OPTIC', 'SONIC',
  'POLAR', 'SOLAR', 'LUNAR', 'ORBIT', 'COMET', 'ALLOY', 'OXIDE', 'OZONE',
  'ARGON', 'XENON', 'RADON', 'IONIC', 'INERT', 'QUARK', 'BOSON', 'LYMPH',
  'NYMPH', 'EDEMA', 'POLYP', 'SPASM', 'COMA', // 4 letters - skip
  'CELL', // 4 letters - skip
  'GENE', // 4 letters - skip
  'ATOM', // 4 letters - skip
  'MASS', // 4 letters - skip
  'FLUX', // 4 letters - skip
  'PHASE', 'FIELD', 'FORCE', 'PULSE', 'RATIO', 'SCALE',
  'METER', 'GAUGE', 'PROBE', 'SCOPE', 'GRAPH',
  'FLORA', 'FAUNA', 'BIOME', 'GENUS', // Maybe too scientific
  'TRAIT', 'CLONE', 'HELIX', // DNA helix

  // ============================================================
  // ARCHITECTURE & HOME (~60 words)
  // ============================================================
  'GABLE', 'EAVES', 'SPIRE', 'VAULT', 'FOYER', 'NICHE', 'ADOBE', 'BRICK',
  'SLATE', 'GROUT', 'PORCH', 'PATIO', 'LANAI', 'ARBOR', 'KIOSK', 'PLAZA',
  'MANOR', 'VILLA', 'CABIN', 'LODGE', 'MOTEL', 'DEPOT', 'WHARF', 'QUAY', // 4 letters - skip
  'ATTIC', 'CRAWL', 'CELLAR', // 6 letters - skip
  'LOFT', // 4 letters - skip
  'DOME', // 4 letters - skip
  'ARCH', // 4 letters - skip
  'BEAM', // 4 letters - skip
  'PANEL', 'LEDGE', 'SHELF', 'PLANK', 'JOIST',
  'RAFTER', // 6 letters - skip
  'STAIR', 'RISER', 'TREAD',
  'HINGE', 'LATCH', 'KNOB', // 4 letters - skip
  'SILL', // 4 letters - skip
  'FRAME', 'PANE', // 4 letters - skip
  'HUTCH', 'NOOK', // 4 letters - skip
  'ALCOVE', // 6 letters - skip

  // ============================================================
  // CROSSWORD FAVORITES / SAT WORDS (~400 words)
  // ============================================================
  'EPOCH', 'IRATE', 'ADIEU', 'CANOE', 'ALIBI', 'AUDIO', 'CAMEO', 'CIRCA',
  'CREDO', 'DEBUT', 'DECOR', 'ELATE', 'ELUDE', 'EXUDE', 'GUISE', 'INANE',
  'LUCID', 'NAIVE', 'OVERT', 'PIETY', 'PITHY', 'QUASI', 'REALM', 'RELIC',
  'SAVOR', 'STOIC', 'TABOO', 'TACIT', 'TRITE', 'TRYST', 'USURP', 'VAPID',
  'WIELD', 'YEARN', 'ACRID', 'ADEPT', 'ALOOF', 'AMASS', 'ANGST', 'ANTIC',
  'ASKEW', 'BALMY', 'BLEAK', 'BRASH', 'CACHE', 'CHASM', 'CIVIC', 'CLOUT',
  'CRASS', 'CRAVE', 'CREED', 'CRYPT', 'DALLY', 'DETER', 'DROLL', 'EERIE',
  'ELEGY', 'EVADE', 'FARCE', 'FIERY', 'FLAIL', 'FLAIR', 'FLANK', 'FLASK',
  'FORAY', 'FRAIL', 'FRISK', 'FUROR', 'GAFFE', 'GAUDY', 'GAUNT', 'GIDDY',
  'GLEAN', 'GLINT', 'GLOAT', 'GRIMY', 'GRIPE', 'GRUFF', 'GUSTO', 'HASTY',
  'HEIST', 'HUSKY', 'INAPT', 'INCUR', 'INFER', 'INGOT', 'INEPT', 'IRKED',
  'JADED', 'JAUNT', 'JOLLY', 'KNACK', 'LANKY', 'LEERY', 'LIVID', 'MANGY',
  'MIRTH', 'MURKY', 'NASAL', 'NIFTY', 'OAKEN', 'ONSET', 'OUNCE', 'OUTDO',
  'PASTY', 'PENAL', 'PIQUE', 'PLUMB', 'PLUMP', 'POISE', 'POSSE', 'PRIVY',
  'PRONE', 'PROWL', 'PRUDE', 'PSYCH', 'QUALM', 'QUASH', 'QUERY', 'QUEUE',
  'QUIRK', 'QUOTA', 'RABID', 'RASPY', 'RATTY', 'REBUT', 'REIGN', 'REPEL',
  'RETRO', 'RIGID', 'RIGOR', 'RITZY', 'RIVAL', 'ROOST', 'ROWDY', 'RUSTY',
  'SALVO', 'SASSY', 'SAUNA', 'SAVVY', 'SCALD', 'SCANT', 'SCOUR', 'SEEDY',
  'SHEEN', 'SHIRK', 'SHOWY', 'SHRUG', 'SKULK', 'SLACK', 'SLANG', 'SLEEK',
  'SLICK', 'SLIMY', 'SLING', 'SLINK', 'SLOTH', 'SLUMP', 'SMIRK', 'SMITE',
  'SNARE', 'SNARL', 'SNEER', 'SNIDE', 'SNOOP', 'SNORE', 'SNORT', 'SNOUT',
  'SOBER', 'SOGGY', 'SPAWN', 'SPECK', 'SPIEL', 'SPIKY', 'SPINY', 'SPURN',
  'SQUAB', 'SQUAT', 'STAID', 'STALK', 'STARK', 'STASH', 'STAVE', 'STEAD',
  'STEEP', 'STERN', 'STINT', 'STOMP', 'STOOP', 'STRAY', 'STRUT', 'SULKY',
  'SULLY', 'SURGE', 'SURLY', 'SWINE', 'SWIRL', 'SWOON', 'TABBY', 'TACKY',
  'TALON', 'TAUNT', 'TAWNY', 'TERSE', 'THROB', 'THUMP', 'TIMID', 'TIPSY',
  'TORSO', 'TOXIC', 'TRACT', 'TRAMP', 'TRAWL', 'TREND', 'TROLL', 'TROOP',
  'TRUCE', 'TURBO', 'TWANG', 'ULCER', 'UNDUE', 'UNIFY', 'UNITY', 'UNTIE',
  'URBAN', 'USHER', 'UTTER', 'VAGUE', 'VALOR', 'VAUNT', 'VENOM', 'VERGE',
  'VICAR', 'VIGOR', 'VISTA', 'VOGUE', 'VOUCH', 'WACKY', 'WAGER', 'WAIVE',
  'WANED', 'WARTY', 'WEARY', 'WHACK', 'WHIFF', 'WHINE', 'WHIRL', 'WIDEN',
  'WINCE', 'WISPY', 'WRATH', 'WREST', 'WRING', 'YODEL', 'YOKEL', 'ZIPPY',
  'ZONAL',

  // ============================================================
  // COMMON-ISH BUT NOT IN BASE LIST (~400 words)
  // ============================================================
  'ABIDE', 'ABODE', 'ABORT', 'ABYSS', 'ADAPT', 'ADMIN', 'AEGIS', 'AGAPE',
  'AGATE', 'AGAVE', 'AGLOW', 'AISLE', 'ALLAY', 'ALLEY', 'ALLOT', 'ALOFT',
  'ALOUD', 'ALPHA', 'ALTAR', 'ALTER', 'AMAZE', 'AMBLE', 'AMEND', 'AMPLE',
  'ANKLE', 'ANNEX', 'ANVIL', 'APRON', 'APTLY', 'ARENA', 'AROMA', 'AROSE',
  'ARRAY', 'ARSON', 'ARTSY', 'ASCOT', 'ASHEN', 'ASHES', 'ASSET', 'ATLAS',
  'ATTIC', 'AUDIT', 'AUGUR', 'AVERT', 'AVIAN', 'AWAIT', 'AWOKE', 'AXIAL',
  'AXIOM', 'BADGE', 'BADLY', 'BAGGY', 'BAKER', 'BALKY', 'BANAL', 'BARON',
  'BASAL', 'BATCH', 'BATHE', 'BATON', 'BATTY', 'BAYOU', 'BEADY', 'BEEFY',
  'BEFIT', 'BELCH', 'BELIE', 'BELLE', 'BELLY', 'BERTH', 'BESET', 'BEVEL',
  'BIDET', 'BILGE', 'BINGE', 'BIOME', 'BIPED', 'BLARE', 'BLASE', 'BLEAT',
  'BLEEP', 'BLIMP', 'BLINK', 'BLISS', 'BLITZ', 'BLOAT', 'BLOND', 'BLUNT',
  'BLURB', 'BLURT', 'BLUSH', 'BOAST', 'BOGGY', 'BOGUS', 'BOOBY', 'BOOTH',
  'BOOTY', 'BOOZE', 'BORAX', 'BORNE', 'BOSOM', 'BOSSY', 'BOTCH', 'BOUGH',
  'BOXER', 'BRACE', 'BRAID', 'BRAKE', 'BRAWN', 'BRIAR', 'BRIBE', 'BRINK',
  'BROIL', 'BROOD', 'BROOK', 'BROOM', 'BRUNT', 'BRUTE', 'BUDGE', 'BUGGY',
  'BUGLE', 'BULGE', 'BULKY', 'BULLY', 'BUMPY', 'BUNNY', 'BUSHY', 'BUTTE',
  'BUYER', 'BYLAW', 'CABAL', 'CACAO', 'CADDY', 'CADET', 'CAIRN', 'CAMEL',
  'CANNY', 'CAPER', 'CARGO', 'CARVE', 'CASTE', 'CATTY', 'CEASE', 'CHAFF',
  'CHAMP', 'CHANT', 'CHART', 'CHEEK', 'CHICK', 'CHIDE', 'CHILI', 'CHIME',
  'CHIMP', 'CHIRP', 'CHOMP', 'CHORE', 'CHUNK', 'CHURN', 'CIGAR', 'CINCH',
  'CLAMP', 'CLANG', 'CLANK', 'CLASP', 'CLEFT', 'CLERK', 'CLICK', 'CLING',
  'CLOAK', 'CLONE', 'CLOTH', 'CLOWN', 'CLUMP', 'CLUNG', 'COACH', 'COLON',
  'CONDO', 'CORNY', 'COUCH', 'COUGH', 'COUPE', 'COVET', 'COWER', 'CRACK',
  'CRAFT', 'CRAMP', 'CRANK', 'CRATE', 'CRAWL', 'CRAZE', 'CREAK', 'CREEP',
  'CREST', 'CRIMP', 'CROAK', 'CROCK', 'CROOK', 'CRUDE', 'CRUSH', 'CRUST',
  'CUBIC', 'CURSE', 'CURVE', 'CYNIC', 'DAILY', 'DAIRY', 'DAISY', 'DANDY',
  'DECAY', 'DECOY', 'DECRY', 'DEITY', 'DELVE', 'DEMON', 'DEMUR', 'DENSE',
  'DERBY', 'DETOX', 'DEUCE', 'DEVIL', 'DIARY', 'DIGIT', 'DIMLY', 'DINER',
  'DINGY', 'DITCH', 'DITTO', 'DIVER', 'DIZZY', 'DODGE', 'DOING', 'DOLLY',
  'DONOR', 'DONUT', 'DOUBT', 'DOWDY', 'DOWEL', 'DOWNY', 'DRAFT', 'DRAIN',
  'DRAKE', 'DRAPE', 'DRAWL', 'DREAD', 'DRIED', 'DRIER', 'DRIFT', 'DRILL',
  'DRONE', 'DROOL', 'DROOP', 'DROSS', 'DROVE', 'DROWN', 'DRYER', 'DRYLY',
  'DUCAL', 'DULLY', 'DUMMY', 'DUMPY', 'DUNCE', 'DUSTY', 'DUTCH', 'DWARF',
  'DWELL', 'DYING', 'EAGER', 'EAGLE', 'EATEN', 'EATER', 'ECLAT', 'EDICT',
  'EDIFY', 'EIGHT', 'EJECT', 'ELBOW', 'ELDER', 'ELECT', 'ELFIN', 'ELITE',
  'ELOPE', 'ELVES', 'EMCEE', 'EMBER', 'EMERY', 'EMPTY', 'ENACT', 'ENDOW',
  'ENEMA', 'ENNUI', 'ENSUE', 'ENVOY', 'EPOXY', 'EQUIP', 'ERASE', 'ERECT',
  'ERODE', 'ERUPT', 'ETHER', 'ETHIC', 'ETHOS', 'EVICT', 'EVOKE', 'EXALT',
  'EXCEL', 'EXERT', 'EXILE', 'EXIST', 'EXPAT', 'EXPEL', 'EXTOL', 'FACET',
  'FAINT', 'FAIRY', 'FAKER', 'FAMED', 'FANCY', 'FATAL', 'FATTY', 'FEIGN',
  'FEINT', 'FELLA', 'FELON', 'FENCE', 'FERRY', 'FETAL', 'FETCH', 'FETID',
  'FEVER', 'FIBER', 'FICUS', 'FIEND', 'FIFTH', 'FIFTY', 'FILCH', 'FILET',
  'FILLY', 'FILMY', 'FILTH', 'FIRST', 'FISHY', 'FIXED', 'FIXER', 'FIZZY',
  'FLACK', 'FLAKE', 'FLAKY', 'FLARE', 'FLECK', 'FLESH', 'FLICK', 'FLIER',
  'FLING', 'FLINT', 'FLOSS', 'FLOUT', 'FLUID', 'FLUKE', 'FLUNG', 'FLUNK',
  'FLUSH', 'FOAMY', 'FOCAL', 'FOGGY', 'FOLIO', 'FOLKS', 'FOLLY', 'FORGO',
  'FORTY', 'FORUM', 'FOUNT', 'FRAUD', 'FREAK', 'FREED', 'FRIAR', 'FRIED',
  'FRILL', 'FRIZZ', 'FROCK', 'FROND', 'FROST', 'FROTH', 'FROWN', 'FROZE',
  'FUDGE', 'FULLY', 'FUMED', 'FUNDS', 'FUNKY', 'FURRY', 'FUSSY', 'FUSTY',
  'FUZZY', 'GAUZE', 'GEEKY', 'GHOST', 'GIANT', 'GIDDY', 'GIVEN', 'GLARE',
  'GLEAM', 'GLOBE', 'GLOOM', 'GLORY', 'GLOSS', 'GLOVE', 'GNOME', 'GOING',
  'GOLLY', 'GOODY', 'GOOFY', 'GOOSE', 'GORGE', 'GOTTA', 'GOUGE', 'GRACE',
  'GRASP', 'GRASS', 'GRATE', 'GRAVY', 'GRAZE', 'GREED', 'GREEK', 'GRIEF',
  'GRIME', 'GRIND', 'GROAN', 'GROIN', 'GROOM', 'GROPE', 'GROSS', 'GROUP',
  'GROWL', 'GROWN', 'GRUEL', 'GRUNT', 'GUAVA', 'GUESS', 'GUEST', 'GUIDE',
  'GUILD', 'GUILT', 'GULCH', 'GULLY', 'GUMBO', 'GUMMY', 'GUPPY', 'GUSTS',
  'GUSTY', 'HABIT', 'HAIKU', 'HAIRY', 'HALVE', 'HANDY', 'HARDY', 'HASTE',
  'HATCH', 'HAUNT', 'HAVEN', 'HAVOC', 'HAZEL', 'HEADS', 'HEADY',
  'HEAPS', 'HEART', 'HEATH', 'HEAVY', 'HEDGE', 'HEELS', 'HEFTY', 'HELLO',
  'HELPS', 'HENCE', 'HERDS', 'HERON', 'HILLS', 'HILLY', 'HINGE', 'HIPPO',
  'HITCH', 'HOARD', 'HOARY', 'HOBBY', 'HOIST', 'HOLLY', 'HOMER', 'HONEY',
  'HONOR', 'HOOEY', 'HOOKS', 'HOOPS', 'HOPED', 'HOPES', 'HORDE', 'HORNY',
  'HORSE', 'HOTEL', 'HOTLY', 'HOUND', 'HOUSE', 'HOVER', 'HOWDY', 'HUFFY',
  'HUMAN', 'HUMID', 'HUMPS', 'HUMUS', 'HUNCH', 'HUNKS', 'HUNKY', 'HURRY',
  'HUSSY', 'HUTCH', 'HYENA', 'HYPER', 'ICILY', 'ICING', 'IDEAL', 'IDEAS',
  'IDIOM', 'IDIOT', 'IDLER', 'IGLOO', 'IMAGE', 'IMBED', 'IMBUE', 'IMPEL',
  'IMPLY', 'INANE', 'INDEX', 'INDIE', 'INFER', 'INNER', 'INPUT', 'INTER',
  'INTRO', 'IRONY', 'ITCHY', 'IVORY', 'JABOT', 'JACKS', 'JADED', 'JAILS',
  'JAMBS', 'JAPAN', 'JAUNT', 'JEANS', 'JEEPS', 'JELLY', 'JERKS', 'JERKY',
  'JEWEL', 'JIFFY', 'JIMMY', 'JOINT', 'JOKER', 'JOKES', 'JOLLY', 'JOLTS',
  'JOUST', 'JUDGE', 'JUICE', 'JUICY', 'JUMBO', 'JUMPS', 'JUMPY', 'JUNCO',
  'JUNKY', 'JUROR', 'KARMA', 'KAYAK', 'KEELS', 'KEEPS', 'KETCH', 'KICKS',
  'KIDDO', 'KILTS', 'KINDA', 'KINDS', 'KINGS', 'KIOSK', 'KNAVE', 'KNEAD',
  'KNEED', 'KNEEL', 'KNEES', 'KNELT', 'KNIFE', 'KNITS', 'KNOBS', 'KNOCK',
  'KNOLL', 'KNOTS', 'KNOWN', 'KNOWS', 'KOALA', 'KUDOS', 'LABEL', 'LABOR',
  'LACED', 'LACES', 'LACKS', 'LADEN', 'LADLE', 'LAGER', 'LAGGY', 'LAIRD',
  'LAIRS', 'LAKES', 'LAMBS', 'LAMPS', 'LANCE', 'LANDS', 'LANES', 'LAPEL',
  'LAPSE', 'LARGE', 'LARKS', 'LARVA', 'LASER', 'LASSO', 'LASTS', 'LATCH',
  'LATER', 'LATEX', 'LATHE', 'LATTE', 'LAUGH', 'LAWNS', 'LAYER', 'LEADS',
  'LEAFY', 'LEAKS', 'LEAKY', 'LEANT', 'LEAPS', 'LEAPT', 'LEARN', 'LEASE',
  'LEASH', 'LEAST', 'LEAVE', 'LEDGE', 'LEECH', 'LEEKS', 'LEFTY', 'LEGAL',
  'LEGGY', 'LEMON', 'LEMUR', 'LENDS', 'LEVEL', 'LEVER', 'LIBEL', 'LICKS',
  'LIENS', 'LIFTS', 'LIGHT', 'LIKED', 'LIKEN', 'LIKES', 'LILAC', 'LIMBO',
  'LIMBS', 'LIMED', 'LIMES', 'LIMIT', 'LIMPS', 'LINED', 'LINEN', 'LINER',
  'LINES', 'LINGO', 'LINGS', 'LINKS', 'LIONS', 'LISTS', 'LITER', 'LITHE',
  'LIVED', 'LIVEN', 'LIVER', 'LIVES', 'LIVID', 'LLAMA', 'LLANO', 'LOADS',
  'LOAFS', 'LOAMY', 'LOANS', 'LOATH', 'LOBBY', 'LOBES', 'LOCAL', 'LOCKS',
  'LOCUS', 'LOFTS', 'LOFTY', 'LOGIC', 'LOGOS', 'LOINS', 'LONER', 'LONGS',
  'LOOKS', 'LOOMS', 'LOONY', 'LOOPS', 'LOOPY', 'LOOSE', 'LOOTS', 'LOPED',
  'LOPES', 'LORDS', 'LORRY', 'LOSER', 'LOSES', 'LOTTO', 'LOTUS', 'LOUSE',
  'LOUSY', 'LOUTS', 'LOVED', 'LOVER', 'LOVES', 'LOWER', 'LOWLY', 'LOYAL',
  'LUCID', 'LUCKS', 'LUCKY', 'LUMEN', 'LUMPS', 'LUMPY', 'LUNAR', 'LUNCH',
  'LUNGE', 'LUNGS', 'LURCH', 'LURED', 'LURER', 'LURES', 'LURKS', 'LUSTY',
  'LYING', 'LYMPH', 'LYNCH', 'LYRIC', 'MACRO', 'MADAM', 'MADLY', 'MAFIA',
  'MAGIC', 'MAGMA', 'MAIDS', 'MAILS', 'MAIMS', 'MAINS', 'MAIZE', 'MAJOR',
  'MAKER', 'MAKES', 'MALES', 'MALLS', 'MALTS', 'MAMAS', 'MAMBO', 'MAMMA',
  'MAMMY', 'MANGA', 'MANGE', 'MANGO', 'MANGY', 'MANIA', 'MANIC', 'MANLY',
  'MANOR', 'MAPLE', 'MARCH', 'MARES', 'MARKS', 'MARRY', 'MARSH', 'MASKS',
  'MASON', 'MASSE', 'MATCH', 'MATED', 'MATES', 'MATTE', 'MAULS', 'MAUVE',
  'MAXED', 'MAXES', 'MAYBE', 'MAYOR', 'MAZES', 'MEADS', 'MEALS', 'MEALY',
  'MEANS', 'MEANT', 'MEATY', 'MEDAL', 'MEDIA', 'MEDIC', 'MELEE', 'MELON',
  'MELTS', 'MEMOS', 'MENDS', 'MENUS', 'MERCY', 'MERGE', 'MERIT', 'MERRY',
  'MESSY', 'METAL', 'METER', 'METRO', 'MICRO', 'MIDST', 'MIGHT', 'MILKS',
  'MILKY', 'MILLS', 'MIMIC', 'MINCE', 'MINDS', 'MINED', 'MINER', 'MINES',
  'MINOR', 'MINTS', 'MINTY', 'MINUS', 'MIRED', 'MIRES', 'MIRTH', 'MISER',
  'MISSY', 'MISTS', 'MISTY', 'MITER', 'MITTS', 'MIXED', 'MIXER', 'MIXES',
  'MOANS', 'MOATS', 'MOCKS', 'MODEL', 'MODEM', 'MODES', 'MOIST', 'MOLAR',
  'MOLDS', 'MOLDY', 'MOLES', 'MOLTS', 'MOMMA', 'MOMMY', 'MONEY', 'MONKS',
  'MONTH', 'MOODS', 'MOODY', 'MOONS', 'MOONY', 'MOORS', 'MOOSE', 'MOPED',
  'MOPES', 'MORAL', 'MORES', 'MORPH', 'MORSE', 'MOSSY', 'MOTEL', 'MOTET',
  'MOTHS', 'MOTIF', 'MOTOR', 'MOTTO', 'MOULD', 'MOUND', 'MOUNT', 'MOURN',
  'MOUSE', 'MOUSY', 'MOUTH', 'MOVED', 'MOVER', 'MOVES', 'MOVIE', 'MOWED',
  'MOWER', 'MUCUS', 'MUDDY', 'MUFFS', 'MULCH', 'MULES', 'MULLS', 'MUMBO',
  'MUMMY', 'MUMPS', 'MUNCH', 'MURAL', 'MURKY', 'MUSHY', 'MUSIC', 'MUSKY',
  'MUSTY', 'MUTED', 'MUTES', 'MUTTS', 'MYRRH', 'MYTHS', 'NACHO', 'NADIR',
  'NAILS', 'NAIVE', 'NAKED', 'NAMED', 'NAMER', 'NAMES', 'NANNY', 'NAPES',
  'NARCO', 'NARKS', 'NASAL', 'NASTY', 'NATAL', 'NAVAL', 'NAVEL', 'NEARS',
  'NECKS', 'NERDS', 'NERDY', 'NERVE', 'NERVY', 'NESTS', 'NEVER', 'NEWER',
  'NEWLY', 'NICER', 'NICHE', 'NICKS', 'NIECE', 'NIFTY', 'NIGHT', 'NIMBY',
  'NINJA', 'NINNY', 'NINTH', 'NIPPY', 'NITRO', 'NITTY', 'NIXIE', 'NOBLE',
  'NOBLY', 'NODDY', 'NODES', 'NOISE', 'NOISY', 'NOMAD', 'NONCE', 'NOOKS',
  'NOOSE', 'NORMS', 'NORTH', 'NOSED', 'NOSES', 'NOSEY', 'NOTCH', 'NOTED',
  'NOTER', 'NOTES', 'NOUNS', 'NOVEL', 'NUDES', 'NUDGE', 'NUKED', 'NUKES',
  'NULLS', 'NUMBS', 'NURSE', 'NUTTY', 'NYLON', 'NYMPH',

  // ============================================================
  // REMAINING O-Z WORDS (~300 words)
  // ============================================================
  'OAKEN', 'OAKUM', 'OASES', 'OASIS', 'OATER', 'OATHS', 'OCCUR', 'OCEAN',
  'OCTET', 'ODDLY', 'ODDER', 'OFFAL', 'OFFED', 'OFFER', 'OFTEN', 'OGLED',
  'OGLER', 'OGLES', 'OGRES', 'OILED', 'OILER', 'OINKS', 'OKAYS', 'OLDEN',
  'OLDER', 'OLDIE', 'OLIVE', 'OMBRE', 'OMEGA', 'OMENS', 'OMITS', 'ONSET',
  'OOHED', 'OOMPH', 'OOZED', 'OOZES', 'OPENS', 'OPERA', 'OPINE', 'OPIUM',
  'OPTED', 'OPTIC', 'ORALS', 'ORBIT', 'ORCAS', 'ORDER', 'ORGAN', 'OSIER',
  'OTHER', 'OTTER', 'OUGHT', 'OUNCE', 'OUSTS', 'OUTDO', 'OUTED', 'OUTER',
  'OUTGO', 'OVALS', 'OVARY', 'OVATE', 'OVENS', 'OVERT', 'OWING', 'OWLET',
  'OWNED', 'OWNER', 'OXIDE', 'OZONE', 'PACED', 'PACER', 'PACES', 'PACKS',
  'PACTS', 'PADDY', 'PADRE', 'PAEAN', 'PAGAN', 'PAGED', 'PAGER', 'PAGES',
  'PAILS', 'PAINS', 'PAINT', 'PAIRS', 'PALER', 'PALES', 'PALMS', 'PALSY',
  'PAMPA', 'PANDA', 'PANEL', 'PANES', 'PANGS', 'PANIC', 'PANSY', 'PANTS',
  'PAPAL', 'PAPAS', 'PAPER', 'PARKA', 'PARKS', 'PARRY', 'PARSE', 'PARTS',
  'PARTY', 'PASTA', 'PASTE', 'PASTY', 'PATCH', 'PATIO', 'PATSY', 'PATTY',
  'PAUSE', 'PAVED', 'PAVER', 'PAVES', 'PAWED', 'PAWNS', 'PAYEE', 'PAYER',
  'PEACE', 'PEACH', 'PEAKS', 'PEALS', 'PEARL', 'PEARS', 'PEASE', 'PECAN',
  'PECKS', 'PEDAL', 'PEEKS', 'PEELS', 'PEEPS', 'PEERS', 'PENAL', 'PENCE',
  'PENNY', 'PEONS', 'PEPPY', 'PERCH', 'PERIL', 'PERKS', 'PERKY', 'PERMS',
  'PESKY', 'PESOS', 'PESTO', 'PESTS', 'PETAL', 'PETTY', 'PHASE', 'PHONE',
  'PHONY', 'PHOTO', 'PIANO', 'PICKS', 'PICKY', 'PIECE', 'PIERS', 'PIGGY',
  'PIKES', 'PILED', 'PILES', 'PILLS', 'PILOT', 'PIMPS', 'PINCH', 'PINED',
  'PINES', 'PINGS', 'PINKO', 'PINKS', 'PINKY', 'PINTO', 'PINTS', 'PINUP',
  'PIOUS', 'PIPED', 'PIPER', 'PIPES', 'PIQUE', 'PITCH', 'PITHS', 'PITHY',
  'PITON', 'PITTA', 'PIVOT', 'PIXEL', 'PIZZA', 'PLACE', 'PLAID', 'PLAIN',
  'PLAIT', 'PLANE', 'PLANK', 'PLANS', 'PLANT', 'PLATE', 'PLAYA', 'PLAYS',
  'PLAZA', 'PLEAD', 'PLEAS', 'PLEAT', 'PLEBE', 'PLEDGE', // 6 letters - skip
  'PLIED', 'PLIER', 'PLIES', 'PLODS', 'PLONK', 'PLOPS', 'PLOTS', 'PLOWS',
  'PLOYS', 'PLUCK', 'PLUGS', 'PLUMB', 'PLUME', 'PLUMP', 'PLUMS', 'PLUMY',
  'PLUNK', 'PLUSH', 'POACH', 'POCKS', 'PODGY', 'POEMS', 'POESY', 'POETS',
  'POINT', 'POISE', 'POKED', 'POKER', 'POKES', 'POLAR', 'POLED', 'POLES',
  'POLIO', 'POLKA', 'POLLS', 'POLYP', 'POMP', // 4 letters - skip
  'PONDS', 'PONES', 'POOCH', 'POODS', 'POOLS', 'POOPS', 'POPES', 'POPPY',
  'PORCH', 'PORED', 'PORES', 'PORGY', 'PORKS', 'PORKY', 'PORTS', 'POSED',
  'POSER', 'POSES', 'POSIT', 'POSSE', 'POSTS', 'POTTY', 'POUCH', 'POUND',
  'POURS', 'POUTS', 'POWER', 'POXES', 'PRAMS', 'PRANK', 'PRAWN', 'PRAYS',
  'PREEN', 'PRESS', 'PREYS', 'PRICE', 'PRICK', 'PRIDE', 'PRIED', 'PRIES',
  'PRIME', 'PRIMP', 'PRIMS', 'PRINT', 'PRIOR', 'PRISM', 'PRIVY', 'PRIZE',
  'PROBE', 'PRODS', 'PROMO', 'PROMS', 'PRONE', 'PRONG', 'PROOF', 'PROPS',
  'PROSE', 'PROSY', 'PROUD', 'PROVE', 'PROWL', 'PROWS', 'PROXY', 'PRUDE',
  'PRUNE', 'PRYER', 'PSALM', 'PSYCH', 'PUBIC', 'PUBES', 'PUCKS', 'PUDGY',
  'PUFFS', 'PUFFY', 'PUKED', 'PUKES', 'PULLS', 'PULPS', 'PULPY', 'PULSE',
  'PUMPS', 'PUNCH', 'PUNKS', 'PUNKY', 'PUNNY', 'PUPAE', 'PUPAL', 'PUPIL',
  'PUPPY', 'PUREE', 'PURER', 'PURGE', 'PURRS', 'PURSE', 'PUSHY', 'PUSSY',
  'PUTTI', 'PUTTS', 'PUTTY', 'PYGMY', 'PYLON', 'QUACK', 'QUAFF', 'QUAIL',
  'QUAKE', 'QUALM', 'QUARK', 'QUART', 'QUASI', 'QUASH', 'QUEEN', 'QUEER',
  'QUELL', 'QUERY', 'QUEST', 'QUEUE', 'QUICK', 'QUIET', 'QUILL', 'QUILT',
  'QUIRK', 'QUITE', 'QUOTA', 'QUOTE', 'RABBI', 'RABID', 'RACED', 'RACER',
  'RACES', 'RACKS', 'RADAR', 'RADII', 'RADIO', 'RADON', 'RAFTS', 'RAGED',
  'RAGES', 'RAIDS', 'RAILS', 'RAINS', 'RAINY', 'RAISE', 'RAJAH', 'RAKED',
  'RAKER', 'RAKES', 'RALLY', 'RAMPS', 'RANCH', 'RANDY', 'RANGE', 'RANGY',
  'RANKS', 'RANTS', 'RAPID', 'RARER', 'RASPY', 'RATED', 'RATER', 'RATES',
  'RATIO', 'RATTY', 'RAVED', 'RAVEL', 'RAVEN', 'RAVER', 'RAVES', 'RAWER',
  'RAYON', 'RAZED', 'RAZES', 'RAZOR', 'REACH', 'REACT', 'READS', 'READY',
  'REALM', 'REAMS', 'REAPS', 'REARS', 'REBEL', 'REBUT', 'RECAP', 'RECUR',
  'RECUT', 'REDID', 'REDLY', 'REEDS', 'REEDY', 'REEFS', 'REEKS', 'REELS',
  'REFER', 'REFIT', 'REGAL', 'REIGN', 'REINS', 'RELAX', 'RELAY', 'RELIC',
  'REMIT', 'REMIX', 'RENAL', 'RENDS', 'RENEW', 'RENTS', 'REPAY', 'REPEL',
  'REPLY', 'REPOS', 'RERUN', 'RESET', 'RESIN', 'RESTS', 'RETRO', 'RETRY',
  'REUSE', 'REVEL', 'REVUE', 'RHINO', 'RHYME', 'RIDER', 'RIDES', 'RIDGE',
  'RIFLE', 'RIFTS', 'RIGHT', 'RIGID', 'RIGOR', 'RILED', 'RILES', 'RILLS',
  'RINDS', 'RINGS', 'RINKS', 'RINSE', 'RIOTS', 'RIPEN', 'RIPER', 'RISEN',
  'RISER', 'RISES', 'RISKS', 'RISKY', 'RITES', 'RITZY', 'RIVAL', 'RIVEN',
  'RIVER', 'RIVET', 'ROADS', 'ROAMS', 'ROARS', 'ROAST', 'ROBED', 'ROBES',
  'ROBIN', 'ROBOT', 'ROCKS', 'ROCKY', 'RODEO', 'ROGUE', 'ROLES', 'ROLLS',
  'ROMAN', 'ROMPS', 'ROOFS', 'ROOKS', 'ROOMS', 'ROOMY', 'ROOST', 'ROOTS',
  'ROPED', 'ROPER', 'ROPES', 'ROSES', 'ROSIN', 'ROTOR', 'ROUGE', 'ROUGH',
  'ROUND', 'ROUSE', 'ROUTE', 'ROUTS', 'ROVED', 'ROVER', 'ROWDY', 'ROWED',
  'ROWER', 'ROYAL', 'RUBES', 'RUBLE', 'RUDDY', 'RUDER', 'RUFFS', 'RUGBY',
  'RUIN', // 4 letters - skip
  'RUINS', 'RULED', 'RULER', 'RULES', 'RUMBA', 'RUMOR', 'RUMPS', 'RUNES',
  'RUNGS', 'RUNNY', 'RUNTS', 'RUNTY', 'RUPEE', 'RURAL', 'RUSTY',
];

/**
 * Get the combined sabotage-eligible word set
 */
export function getChallensingWordsSet(): Set<string> {
  return new Set(CHALLENGING_WORDS);
}

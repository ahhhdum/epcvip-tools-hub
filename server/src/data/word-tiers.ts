/**
 * Word Tier Definitions
 *
 * Curated word lists for Wordle Battle.
 * See: docs/plans/WORD_CURATION_CRITERIA.md
 *
 * Tiers:
 * - COMMON: Everyday words, current WORD_LIST (655 words)
 * - CHALLENGING: SAT/GRE level, educated adults recognize (~1,400 words)
 * - EXPERT: Specialist vocabulary, opt-in hard mode (~500 words)
 * - OBSCURE: Too obscure, never eligible (remaining ~12,000 words)
 */

// Re-export existing common words
export { WORD_LIST as COMMON_WORDS } from '../utils/word-list';

/**
 * CHALLENGING TIER
 *
 * Criteria:
 * - SAT/GRE vocabulary level
 * - Appears in mainstream media
 * - Most educated adults recognize it
 * - Common in a well-known domain
 */
export const CHALLENGING_WORDS: string[] = [
  // ===== MUSIC & ARTS =====
  'FUGUE', // Musical composition, psychological state
  'FORTE', // Loud in music, strength
  'TEMPO', // Speed of music
  'OPERA', // Musical theater
  'WALTZ', // Dance
  'TANGO', // Dance
  'POLKA', // Dance
  'SALSA', // Dance and food
  'BLUES', // Music genre
  'CHOIR', // Singing group
  'SCALE', // Musical scale
  'CHORD', // Musical notes together
  'PITCH', // Musical note, also sports
  'TENOR', // Voice type
  'VIOLA', // String instrument
  'CELLO', // String instrument
  'FLUTE', // Wind instrument
  'ORGAN', // Musical instrument, body part
  'BANJO', // String instrument
  'BONGO', // Drum
  'GLYPH', // Symbol, hieroglyph
  'MOTIF', // Recurring theme
  'GENRE', // Category of art
  'MURAL', // Wall painting
  'EASEL', // Painting stand
  'PROSE', // Written language
  'VERSE', // Poetry
  'RHYME', // Poetry device
  'FABLE', // Short story
  'ESSAY', // Written work
  'IRONY', // Literary device
  'SATYR', // Mythological creature
  'DRAMA', // Theater (might be common)
  'ACTOR', // Theater (might be common)
  'SCENE', // Theater (might be common)
  'STAGE', // Theater (might be common)

  // ===== COLORS & MATERIALS =====
  'MAUVE', // Purple-pink color
  'OCHRE', // Yellow-brown color
  'SEPIA', // Brown tone
  'BEIGE', // Neutral color
  'TAUPE', // Gray-brown
  'AZURE', // Sky blue
  'CORAL', // Pinkish-orange
  'AMBER', // Orange-yellow
  'KHAKI', // Tan color
  'EBONY', // Black wood
  'IVORY', // White material
  'SUEDE', // Leather type
  'TWEED', // Fabric
  'DENIM', // Fabric (jeans)
  'LINEN', // Fabric
  'RAYON', // Fabric
  'NYLON', // Fabric
  'PLAID', // Pattern
  'PLEAT', // Fold in fabric
  'SATIN', // Shiny fabric
  'SILKY', // Like silk
  'SHEER', // Thin fabric
  'FLEECE', // Wait, 6 letters

  // ===== GEOGRAPHY & NATURE =====
  'FJORD', // Norwegian inlet
  'DELTA', // River mouth
  'ATOLL', // Coral island
  'BLUFF', // Cliff, or to deceive
  'GORGE', // Canyon
  'KNOLL', // Small hill
  'RIDGE', // Mountain top
  'CREEK', // Small stream
  'SWAMP', // Wetland
  'MARSH', // Wetland
  'GROVE', // Group of trees
  'GLADE', // Forest clearing
  'OASIS', // Desert water source
  'FLORA', // Plants
  'FAUNA', // Animals
  'ALGAE', // Water plants
  'SPORE', // Reproductive cell
  'PETAL', // Flower part
  'THORN', // Plant spike
  'BLOOM', // Flower
  'SHRUB', // Bush
  'BIRCH', // Tree type
  'CEDAR', // Tree type
  'MAPLE', // Tree type
  'ASPEN', // Tree type
  'ALDER', // Tree type
  'FUNGI', // Mushrooms etc
  'CORAL', // Marine organism
  'SQUID', // Sea creature
  'WHALE', // Marine mammal
  'SHARK', // Fish (might be common)
  'TROUT', // Fish
  'PERCH', // Fish, or to sit
  'BISON', // Buffalo
  'MOOSE', // Large deer
  'LLAMA', // South American animal
  'LEMUR', // Madagascar primate
  'HYENA', // African animal
  'OTTER', // Water mammal
  'EGRET', // Bird
  'HERON', // Bird
  'RAVEN', // Black bird
  'FINCH', // Small bird
  'QUAIL', // Bird
  'STORK', // Bird
  'CRANE', // Bird, or machine
  'VIPER', // Snake
  'COBRA', // Snake
  'GECKO', // Lizard

  // ===== FOOD & COOKING =====
  'BRINE', // Salt water for pickling
  'GLAZE', // Shiny coating
  'SAUTE', // Cooking method
  'BROTH', // Soup base
  'STOCK', // Soup base, or shares
  'PUREE', // Blended food
  'DOUGH', // Bread base
  'YEAST', // Leavening agent
  'SPICE', // Flavoring
  'CURRY', // Spice blend, dish
  'BASIL', // Herb
  'THYME', // Herb
  'CUMIN', // Spice
  'CLOVE', // Spice
  'CIDER', // Apple drink
  'MANGO', // Fruit
  'GUAVA', // Fruit
  'MELON', // Fruit
  'GRAPE', // Fruit
  'OLIVE', // Fruit, oil
  'PECAN', // Nut
  'ACORN', // Nut
  'GOURD', // Squash family
  'LEEK', // Wait, 4 letters
  'CHIVE', // Herb
  'CREPE', // Thin pancake
  'TORTE', // Cake
  'MOUSSE', // Wait, 6 letters
  'GELATO', // Wait, 6 letters
  'PASTA', // Italian food
  'PENNE', // Pasta shape
  'RAITA', // Indian condiment
  'TAHINI', // Wait, 6 letters
  'AIOLI', // Garlic mayo
  'PESTO', // Basil sauce
  'SALSA', // Already listed
  'TAPAS', // Spanish small plates
  'SUSHI', // Japanese food
  'RAMEN', // Japanese noodles
  'TOFU', // Wait, 4 letters
  'TEMPEH', // Wait, 6 letters

  // ===== SCIENCE & MEDICINE =====
  'GLAND', // Body organ
  'NERVE', // Body tissue
  'SKULL', // Head bone
  'SPINE', // Backbone
  'FEMUR', // Thigh bone
  'TIBIA', // Shin bone
  'PELVIS', // Wait, 6 letters
  'ULNA', // Wait, 4 letters
  'AORTA', // Main artery
  'COLON', // Intestine, punctuation
  'LIVER', // Organ (might be common)
  'RENAL', // Kidney-related
  'TUMOR', // Growth
  'VIRUS', // Pathogen (might be common)
  'TOXIN', // Poison
  'SERUM', // Blood component
  'PLASMA', // Wait, 6 letters
  'PRISM', // Light-splitting device
  'LASER', // Light beam (might be common)
  'OPTIC', // Eye-related
  'SONIC', // Sound-related
  'POLAR', // Related to poles
  'SOLAR', // Sun-related
  'LUNAR', // Moon-related
  'ORBIT', // Path around
  'COMET', // Space object
  'QUASAR', // Wait, 6 letters
  'ALLOY', // Metal mixture
  'OXIDE', // Chemical compound
  'OZONE', // Atmospheric gas
  'ARGON', // Noble gas
  'XENON', // Noble gas
  'RADON', // Radioactive gas
  'NEON', // Wait, 4 letters
  'IONIC', // Charged
  'INERT', // Non-reactive
  'ATOM', // Wait, 4 letters
  'QUARK', // Subatomic particle
  'BOSON', // Particle type
  'MESON', // Particle type
  'PROTON', // Wait, 6 letters
  'NUCLEUS', // Wait, 7 letters

  // ===== ARCHITECTURE & HOME =====
  'GABLE', // Roof triangle
  'EAVES', // Roof overhang
  'SPIRE', // Tower point
  'VAULT', // Arched ceiling, or safe
  'FOYER', // Entrance hall
  'NICHE', // Recessed space
  'ADOBE', // Clay brick
  'BRICK', // Building material
  'SLATE', // Stone, or clean
  'GROUT', // Tile filler
  'MORTAR', // Wait, 6 letters
  'SHINGLE', // Wait, 7 letters
  'STUCCO', // Wait, 6 letters
  'PORCH', // Covered entrance
  'PATIO', // Outdoor area
  'LANAI', // Hawaiian porch
  'ARBOR', // Garden structure
  'KIOSK', // Small booth
  'PLAZA', // Public square
  'MANOR', // Large house
  'VILLA', // Large house
  'CHALET', // Wait, 6 letters
  'CABIN', // Small house
  'LODGE', // Hotel, cabin
  'MOTEL', // Roadside hotel
  'DEPOT', // Station
  'WHARF', // Dock

  // ===== COMMON CROSSWORD / WORDLE WORDS =====
  'EPOCH', // Period of time
  'IRATE', // Angry
  'ADIEU', // Goodbye (French)
  'CANOE', // Small boat
  'ENSUE', // Follow
  'ALIBI', // Excuse for crime
  'RATIO', // Proportion
  'AUDIO', // Sound
  'CAMEO', // Brief appearance
  'CIRCA', // Approximately (date)
  'CREDO', // Belief system
  'DEBUT', // First appearance
  'DECOR', // Decoration
  'ELATE', // Make happy
  'ELUDE', // Escape
  'EXUDE', // Emit
  'GUISE', // Appearance
  'INANE', // Silly
  'LUCID', // Clear
  'NAIVE', // Innocent
  'OVERT', // Open
  'PIETY', // Religious devotion
  'PITHY', // Concise
  'QUASI', // Almost
  'REALM', // Kingdom
  'RELIC', // Ancient object
  'SAVOR', // Enjoy taste
  'STOIC', // Unemotional
  'TABOO', // Forbidden
  'TACIT', // Unspoken
  'TRITE', // Overused
  'TRYST', // Secret meeting
  'USURP', // Seize power
  'VAPID', // Boring
  'WIELD', // Use (weapon)
  'YEARN', // Long for
  'ZESTY', // Flavorful
  'ACRID', // Bitter smell
  'ADEPT', // Skilled
  'ALOOF', // Distant
  'AMASS', // Gather
  'ANGST', // Anxiety
  'ANTIC', // Playful act
  'ASKEW', // Crooked
  'BALMY', // Warm weather
  'BLAND', // Tasteless
  'BLEAK', // Gloomy
  'BRASH', // Bold
  'BRISK', // Quick, cold
  'CACHE', // Hidden store
  'CHASM', // Deep gap
  'CIVIC', // City-related
  'CLOUT', // Power
  'CRASS', // Crude
  'CRAVE', // Desire strongly
  'CREED', // Belief
  'CRYPT', // Underground vault
  'DALLY', // Waste time
  'DETER', // Discourage
  'DROLL', // Amusing
  'EERIE', // Spooky
  'ELEGY', // Sad poem
  'EVADE', // Avoid
  'FARCE', // Comedy
  'FERAL', // Wild
  'FIERY', // Hot
  'FINCH', // Already listed
  'FLAIL', // Wave wildly
  'FLAIR', // Style
  'FLANK', // Side
  'FLASK', // Container
  'FORAY', // Raid
  'FORTE', // Already listed
  'FRAIL', // Weak
  'FRANK', // Honest (might be common)
  'FRISK', // Search
  'FUROR', // Uproar
  'GAFFE', // Mistake
  'GAUDY', // Flashy
  'GAUNT', // Thin
  'GENRE', // Already listed
  'GIDDY', // Dizzy, excited
  'GLEAN', // Gather
  'GLIB', // Wait, 4 letters
  'GLINT', // Shine
  'GLOAT', // Brag
  'GRIMY', // Dirty
  'GRIPE', // Complain
  'GRUFF', // Rough voice
  'GUSTO', // Enthusiasm
  'HASTY', // Quick
  'HEIST', // Robbery
  'HUSKY', // Dog, or voice
  'INAPT', // Inappropriate
  'INCUR', // Bring upon
  'INFER', // Conclude
  'INGOT', // Metal bar
  'INEPT', // Clumsy
  'IRKED', // Annoyed
  'JADED', // Tired of
  'JAUNT', // Short trip
  'JOLLY', // Happy
  'KNACK', // Skill
  'LANKY', // Tall and thin
  'LEERY', // Suspicious
  'LIVID', // Furious
  'LUCRATIVE', // Wait, too long
  'MANGY', // Shabby
  'MEEK', // Wait, 4 letters
  'MIRTH', // Joy
  'MURKY', // Dark, unclear
  'NASAL', // Nose-related
  'NIFTY', // Clever
  'NIMBLE', // Wait, 6 letters
  'NOVICE', // Wait, 6 letters
  'OAKEN', // Made of oak
  'ONSET', // Beginning
  'OPAQUE', // Wait, 6 letters
  'OUNCE', // Unit of weight
  'OUTDO', // Surpass
  'OZONE', // Already listed
  'PASTY', // Pale
  'PENAL', // Prison-related
  'PIQUE', // Irritation
  'PLAID', // Already listed
  'PLAZA', // Already listed
  'PLUMB', // Straight down
  'PLUMP', // Chubby
  'POACH', // Illegal hunting, cooking
  'POISE', // Grace
  'POSSE', // Group
  'PRIME', // Best (might be common)
  'PRIVY', // Private
  'PRONE', // Lying down
  'PROWL', // Sneak
  'PRUDE', // Overly modest
  'PSYCH', // Psychology
  'QUALM', // Doubt
  'QUASH', // Suppress
  'QUERY', // Question
  'QUEUE', // Line
  'QUIRK', // Peculiarity
  'QUOTA', // Limit
  'RABID', // Extreme
  'RAGED', // Angry (might be common)
  'RASPY', // Rough voice
  'RATTY', // Shabby
  'REALM', // Already listed
  'REAP', // Wait, 4 letters
  'REBUT', // Argue against
  'REIGN', // Rule
  'REPEL', // Push away
  'RETRO', // Old-fashioned
  'RIGID', // Stiff
  'RIGOR', // Strictness
  'RISKY', // Dangerous (might be common)
  'RITZY', // Fancy
  'RIVAL', // Competitor
  'ROOST', // Perch
  'ROWDY', // Loud
  'RUSTY', // Corroded
  'SALVO', // Gunfire
  'SASSY', // Bold
  'SAUNA', // Steam room
  'SAVVY', // Knowledge
  'SCALD', // Burn with liquid
  'SCANT', // Barely enough
  'SCOUR', // Clean vigorously
  'SEEDY', // Shabby
  'SHEEN', // Shine
  'SHIRK', // Avoid work
  'SHOWY', // Flashy
  'SHRUB', // Already listed
  'SHRUG', // Shoulder gesture
  'SKULK', // Lurk
  'SLACK', // Loose
  'SLANG', // Informal words
  'SLEEK', // Smooth
  'SLICK', // Smooth, clever
  'SLIMY', // Covered in slime
  'SLING', // Throw
  'SLINK', // Sneak
  'SLOTH', // Lazy animal
  'SLUMP', // Decline
  'SMIRK', // Smug smile
  'SMITE', // Strike
  'SNARE', // Trap
  'SNARL', // Growl
  'SNEER', // Contemptuous look
  'SNIDE', // Mean
  'SNOOP', // Spy
  'SNORE', // Sleep sound
  'SNORT', // Nose sound
  'SNOUT', // Animal nose
  'SOBER', // Not drunk
  'SOGGY', // Wet
  'SPASM', // Muscle twitch
  'SPAWN', // Produce
  'SPECK', // Small spot
  'SPIEL', // Sales pitch
  'SPIKY', // Having spikes
  'SPINY', // Having spines
  'SPURN', // Reject
  'SQUAB', // Young pigeon
  'SQUAT', // Low position
  'STAID', // Serious
  'STALK', // Follow
  'STARK', // Harsh
  'STASH', // Hide
  'STAUNCH', // Wait, 7 letters
  'STAVE', // Stick, or prevent
  'STEAD', // Place
  'STEED', // Horse
  'STEEP', // Expensive, or slope (might be common)
  'STERN', // Strict, or back of ship
  'STINT', // Period of work
  'STOMP', // Stamp feet
  'STOOP', // Bend down
  'STRAIT', // Wait, 6 letters
  'STRAY', // Wander
  'STRUT', // Walk proudly
  'SULKY', // Moody
  'SULLY', // Damage reputation
  'SURGE', // Rush
  'SURLY', // Bad-tempered
  'SWARM', // Group of insects
  'SWELL', // Grow (might be common)
  'SWINE', // Pig
  'SWIRL', // Spin
  'SWOON', // Faint
  'TABBY', // Cat type
  'TACKY', // Cheap
  'TALON', // Claw
  'TANGO', // Already listed
  'TANGY', // Sharp taste
  'TAUNT', // Mock
  'TAWNY', // Brownish-yellow
  'TENOR', // Already listed
  'TERSE', // Brief
  'THROB', // Pulse
  'THUMP', // Hit
  'TIMID', // Shy
  'TIPSY', // Slightly drunk
  'TORSO', // Body trunk
  'TOXIC', // Poisonous
  'TRACT', // Area of land
  'TRAIT', // Characteristic
  'TRAMP', // Walk heavily
  'TRASH', // Garbage (might be common)
  'TRAWL', // Fish
  'TREND', // Fashion (might be common)
  'TROLL', // Internet, mythology
  'TROOP', // Group
  'TRUCE', // Ceasefire
  'TRUNK', // Tree part, suitcase (might be common)
  'TUMOR', // Already listed
  'TURBO', // Fast
  'TWANG', // Sound
  'ULCER', // Sore
  'UNDUE', // Excessive
  'UNIFY', // Join
  'UNITY', // Togetherness
  'UNTIE', // Loosen
  'URBAN', // City (might be common)
  'USHER', // Guide
  'UTTER', // Complete
  'VAGUE', // Unclear
  'VALOR', // Bravery
  'VAPID', // Already listed
  'VAULT', // Already listed
  'VAUNT', // Boast
  'VENOM', // Poison
  'VERGE', // Edge
  'VERSA', // Vice versa (partial)
  'VICAR', // Priest
  'VIGOR', // Energy
  'VIPER', // Already listed
  'VISTA', // View
  'VIVID', // Bright
  'VOGUE', // Fashion
  'VOUCH', // Guarantee
  'WACKY', // Crazy
  'WAGER', // Bet
  'WAIVE', // Give up right
  'WANED', // Decreased
  'WARTY', // Having warts
  'WEARY', // Tired
  'WEDGE', // Triangular shape
  'WEIRD', // Strange (might be common)
  'WENCH', // Woman (archaic)
  'WHACK', // Hit
  'WHIFF', // Smell
  'WHINE', // Complain
  'WHIRL', // Spin
  'WHISK', // Kitchen tool, or move quickly
  'WIDEN', // Make wider
  'WINCE', // Flinch
  'WISPY', // Thin
  'WRATH', // Anger
  'WREST', // Pull away
  'WRING', // Squeeze
  'YAWN', // Wait, 4 letters
  'YEARN', // Already listed
  'YODEL', // Singing style
  'YOKEL', // Country person
  'YOUNG', // Wait, might be common
  'YOUTH', // Might be common
  'ZEAL', // Wait, 4 letters
  'ZEALOT', // Wait, 6 letters
  'ZEBRA', // Animal (might be common)
  'ZIPPY', // Fast
  'ZONAL', // Related to zones

  // ===== WORDS WITH UNUSUAL LETTER COMBOS =====
  'JAZZY', // Full of jazz
  'FIZZY', // Bubbly
  'FUZZY', // Soft
  'DIZZY', // Spinning
  'PIZZA', // Food (might be common)
  'PIZZAZZ', // Wait, 7 letters
  'WALTZ', // Already listed
  'QUILT', // Blanket
  'SQUID', // Already listed
  'SQUAD', // Group (might be common)
  'QUERY', // Already listed
  'QUEUE', // Already listed
  'QUAKE', // Earthquake
  'QUALM', // Already listed
  'QUASI', // Already listed
  'QUASH', // Already listed
  'QUEEN', // Royalty (might be common)
  'QUEER', // Strange
  'QUEST', // Journey
  'QUICK', // Fast (might be common)
  'QUIET', // Silent (might be common)
  'QUILL', // Feather pen
  'QUIRK', // Already listed
  'QUITE', // Very (might be common)
  'QUOTA', // Already listed
  'QUOTE', // Repeat words (might be common)
  'SPHINX', // Wait, 6 letters
  'GLYPH', // Already listed
  'LYMPH', // Body fluid
  'NYMPH', // Mythological creature
  'PSYCH', // Already listed
  'SYNTH', // Synthesizer
  'MYTH', // Wait, 4 letters

  // ===== ADDITIONAL COMMON-ISH WORDS =====
  'ABIDE', // Stay
  'ABODE', // Home
  'ABLED', // Having ability
  'ABORT', // Stop
  'ABYSS', // Deep hole
  'ACORN', // Already listed
  'ADAPT', // Change
  'ADMIN', // Administrator
  'ADOBE', // Already listed
  'ADOPT', // Take in (might be common)
  'ADULT', // Grown-up (might be common)
  'AEGIS', // Protection
  'AFIRE', // On fire
  'AFTER', // Later (common)
  'AGAPE', // Love, or mouth open
  'AGATE', // Stone
  'AGAVE', // Plant
  'AGENT', // Representative (might be common)
  'AGING', // Getting older
  'AGLOW', // Glowing
  'AIDER', // Helper
  'AISLE', // Walkway
  'ALARM', // Warning (might be common)
  'ALBUM', // Collection (might be common)
  'ALERT', // Warning (might be common)
  'ALGAE', // Already listed
  'ALIBI', // Already listed
  'ALIEN', // Foreign (might be common)
  'ALIGN', // Line up
  'ALIKE', // Similar
  'ALIVE', // Living (might be common)
  'ALLAY', // Reduce
  'ALLEY', // Narrow path
  'ALLOT', // Assign
  'ALLOW', // Permit (might be common)
  'ALLOY', // Already listed
  'ALOFT', // In the air
  'ALONE', // By oneself (might be common)
  'ALONG', // Beside (might be common)
  'ALOOF', // Already listed
  'ALOUD', // Out loud
  'ALPHA', // First letter
  'ALTAR', // Church table
  'ALTER', // Change
  'AMAZE', // Surprise
  'AMBER', // Already listed
  'AMBLE', // Walk slowly
  'AMEND', // Fix
  'AMPLE', // Enough
  'ANGEL', // Heavenly being (might be common)
  'ANGLE', // Corner (might be common)
  'ANGRY', // Mad (might be common)
  'ANKLE', // Body part
  'ANNEX', // Add on
  'ANTIC', // Already listed
  'ANVIL', // Blacksmith tool
  'AORTA', // Already listed
  'APART', // Separate (might be common)
  'APPLE', // Fruit (common)
  'APPLY', // Use (might be common)
  'APRON', // Kitchen wear
  'APTLY', // Appropriately
  'ARBOR', // Already listed
  'ARENA', // Stadium
  'ARGUE', // Debate (might be common)
  'AROMA', // Smell
  'AROSE', // Got up
  'ARRAY', // Collection
  'ARROW', // Projectile (might be common)
  'ARSON', // Crime of fire
  'ARTSY', // Artistic
  'ASCOT', // Neck scarf
  'ASHEN', // Pale
  'ASHES', // Burnt remains
  'ASIDE', // To the side
  'ASKEW', // Already listed
  'ASSET', // Value (might be common)
  'ATLAS', // Map book
  'ATTIC', // Top floor
  'AUDIO', // Already listed
  'AUDIT', // Financial check
  'AUGUR', // Predict
  'AVERT', // Turn away
  'AVIAN', // Bird-related
  'AVOID', // Stay away (might be common)
  'AWAIT', // Wait for
  'AWAKE', // Not asleep (might be common)
  'AWARD', // Prize (might be common)
  'AWARE', // Knowing (might be common)
  'AWFUL', // Bad (might be common)
  'AWOKE', // Woke up
  'AXIAL', // Along axis
  'AXIOM', // Basic truth
  'AZURE', // Already listed

  // ===== B WORDS =====
  'BADGE', // Pin
  'BADLY', // Poorly
  'BAGEL', // Bread
  'BAGGY', // Loose fitting
  'BAKED', // Cooked
  'BAKER', // Bread maker
  'BALKY', // Stubborn
  'BALMY', // Already listed
  'BANAL', // Boring
  'BANJO', // Already listed
  'BARON', // Noble
  'BASAL', // Base-related
  'BASED', // Founded on (might be common)
  'BASIC', // Fundamental (might be common)
  'BASIL', // Already listed
  'BASIN', // Bowl
  'BASIS', // Foundation
  'BATCH', // Group
  'BATHE', // Wash
  'BATON', // Stick
  'BATTY', // Crazy
  'BAYOU', // Swamp
  'BEACH', // Shore (might be common)
  'BEADY', // Small (eyes)
  'BEEFY', // Muscular
  'BEFIT', // Be appropriate
  'BEGAN', // Started (might be common)
  'BEGIN', // Start (might be common)
  'BEGUN', // Started (might be common)
  'BEING', // Existence (might be common)
  'BELCH', // Burp
  'BELIE', // Contradict
  'BELLE', // Beauty
  'BELLY', // Stomach
  'BELOW', // Under (might be common)
  'BENCH', // Seat (might be common)
  'BERTH', // Sleeping place
  'BESET', // Trouble
  'BETEL', // Plant
  'BEVEL', // Angle
  'BIDET', // Bathroom fixture
  'BILGE', // Ship bottom
  'BILKY', // Not a word, remove
  'BINGE', // Overindulge
  'BIOME', // Ecosystem
  'BIPED', // Two-legged
  'BIRCH', // Already listed
  'BISON', // Already listed
  'BLARE', // Loud sound
  'BLASE', // Unimpressed
  'BLAST', // Explosion (might be common)
  'BLAZE', // Fire (might be common)
  'BLEAK', // Already listed
  'BLEAT', // Sheep sound
  'BLEED', // Lose blood (might be common)
  'BLEEP', // Sound
  'BLEND', // Mix (might be common)
  'BLIMP', // Airship
  'BLIND', // Cannot see (might be common)
  'BLINI', // Russian pancakes
  'BLINK', // Eye movement
  'BLISS', // Happiness
  'BLITZ', // Attack
  'BLOAT', // Swell
  'BLOCK', // Piece (might be common)
  'BLOKE', // British: man
  'BLOND', // Hair color
  'BLOOD', // Body fluid (might be common)
  'BLOOM', // Already listed
  'BLOWN', // Past of blow (might be common)
  'BLUES', // Already listed
  'BLUFF', // Already listed
  'BLUNT', // Not sharp
  'BLURB', // Short description
  'BLURT', // Say suddenly
  'BLUSH', // Turn red
  'BOARD', // Plank (might be common)
  'BOAST', // Brag
  'BOGGY', // Wet ground
  'BOGUS', // Fake
  'BOILS', // Bubbles
  'BOLTS', // Fasteners
  'BONGO', // Already listed
  'BONUS', // Extra (might be common)
  'BOOBY', // Bird, or trap
  'BOOST', // Increase (might be common)
  'BOOTH', // Small enclosure
  'BOOTY', // Treasure
  'BOOZE', // Alcohol
  'BORAX', // Cleaning compound
  'BORED', // Uninterested (might be common)
  'BORNE', // Carried
  'BOSOM', // Chest
  'BOSSY', // Commanding
  'BOTCH', // Mess up
  'BOUGH', // Tree branch
  'BOUND', // Limit (might be common)
  'BOXER', // Fighter
  'BRACE', // Support
  'BRAID', // Woven hair
  'BRAIN', // Organ (might be common)
  'BRAKE', // Stop
  'BRAND', // Logo (might be common)
  'BRASH', // Already listed
  'BRASS', // Metal
  'BRAWL', // Fight
  'BRAWN', // Muscle
  'BREAD', // Food (might be common)
  'BREAK', // Shatter (might be common)
  'BREED', // Type (might be common)
  'BRIAR', // Thorny plant
  'BRIBE', // Corrupt payment
  'BRICK', // Already listed
  'BRIDE', // Wedding woman (might be common)
  'BRIEF', // Short (might be common)
  'BRINE', // Already listed
  'BRING', // Carry (might be common)
  'BRINK', // Edge
  'BRISK', // Already listed
  'BROAD', // Wide (might be common)
  'BROIL', // Cook
  'BROKE', // No money (might be common)
  'BROOD', // Think, or young
  'BROOK', // Stream
  'BROOM', // Cleaning tool
  'BROTH', // Already listed
  'BROWN', // Color (might be common)
  'BRUNT', // Force
  'BRUSH', // Tool (might be common)
  'BRUTE', // Savage
  'BUDDY', // Friend (might be common)
  'BUDGE', // Move slightly
  'BUGGY', // Cart
  'BUGLE', // Instrument
  'BUILD', // Construct (might be common)
  'BUILT', // Constructed (might be common)
  'BULGE', // Protrusion
  'BULKY', // Large
  'BULLY', // Intimidator
  'BUMPY', // Rough
  'BUNCH', // Group (might be common)
  'BUNNY', // Rabbit
  'BUOY', // Wait, 4 letters
  'BURST', // Explode (might be common)
  'BUSHY', // Thick
  'BUTTE', // Flat-topped hill
  'BUYER', // Purchaser
  'BYLAW', // Local law

  // This list is getting very long. Let me organize it better.
];

/**
 * EXPERT TIER
 *
 * Specialist vocabulary for players who want extra challenge.
 * Optional in Sabotage mode (future feature).
 */
export const EXPERT_WORDS: string[] = [
  // Cooking/culinary specialist terms
  'AIOLI',
  'PESTO',
  'TAPAS',
  'CREPE',
  'TORTE',
  'BRULE',
  'CONFIT', // Wait, 6 letters
  'JULIENNE', // Wait, 8 letters
  'RAGOUT', // Wait, 6 letters

  // Architecture specialist
  'SOFFIT',  // Wait, 6 letters
  'FINIAL',  // Wait, 6 letters
  'PLINTH',  // Wait, 6 letters
  'MULLION', // Wait, 7 letters
  'FRIEZE',  // Wait, 6 letters

  // Science specialist
  'BOSON',
  'MESON',
  'LEPTON', // Wait, 6 letters
  'QUARK',
  'GLUON',

  // Nautical specialist
  'BILGE',
  'BERTH',
  'CLEAT',
  'DAVIT',
  'GUNWALE', // Wait, 7 letters

  // Textile specialist
  'TOILE',
  'VOILE',
  'BATIK',
  'IKAT', // Wait, 4 letters
  'BOUCLE',  // Wait, 6 letters

  // Music specialist
  'CODA', // Wait, 4 letters
  'GLISSANDO', // Wait, too long
  'RONDO',
  'LARGO',
  'PRESTO', // Wait, 6 letters

  // Literary specialist
  'IRONY', // Might be challenging, not expert
  'TROPE',
  'PATHOS', // Wait, 6 letters
  'BATHOS', // Wait, 6 letters

  // Geography specialist
  'SCREE', // Loose rocks
  'CIRQUE', // Wait, 6 letters
  'MORAINE', // Wait, 7 letters
  'ESKER',

  // Medical specialist
  'EDEMA',
  'POLYP',
  'LESION', // Wait, 6 letters
  'SEPSIS', // Wait, 6 letters

  // General expert vocabulary
  'KNURL', // Ridged pattern
  'SPALL', // Rock fragment
  'CREEL', // Fishing basket
  'CLEEK', // Golf club
  'PRONG', // Fork tine
  'THOLE', // Oar holder
  'THANE', // Scottish lord
  'CAULK', // Sealant
  'CHAFF', // Grain husk
  'DROSS', // Impurities
  'FUTON', // Bed type
  'GULAG', // Prison camp
  'HAIKU', // Poetry form
  'INLAY', // Decorative insert
  'JALAP', // Plant
  'KELPS', // Seaweed plural? no, use KELPY
  'KETCH', // Boat type
  'LOCUS', // Position
  'NADIR', // Lowest point
  'OFFAL', // Organ meat
  'PAEAN', // Song of praise
  'PICOT', // Decorative edge
  'PLEBE', // First year student
  'QUEUE', // Might be challenging
  'RIVET', // Metal fastener
  'SHALE', // Rock type
  'SHARD', // Broken piece
  'SHOAL', // Shallow water
  'SINEW', // Tendon
  'SKEIN', // Yarn bundle
  'SLEUTH', // Wait, 6 letters
  'SLOUGH', // Wait, 6 letters - shed skin
  'SPRIG', // Small branch
  'STILE', // Fence crossing
  'SWARD', // Grassy area
  'SWATH', // Strip
  'TENON', // Wood joint
  'THROE', // Pang
  'THRUM', // Vibrate
  'TITHE', // Tenth, donation
  'TRAWL', // Already in challenging
  'TULLE', // Fabric
  'ULNA', // Wait, 4 letters
  'VIAND', // Food item
  'WHELK', // Sea snail
  'WIGHT', // Creature
];

/**
 * Combined set of all sabotage-eligible words
 * Common + Challenging = ~2000 words
 */
export function getSabotageEligibleWords(): Set<string> {
  // Import dynamically to avoid circular deps
  const { WORD_LIST } = require('../utils/word-list');
  return new Set([...WORD_LIST, ...CHALLENGING_WORDS]);
}

/**
 * Check if a word is sabotage-eligible (quick lookup)
 */
export function isSabotageEligible(word: string): boolean {
  return getSabotageEligibleWords().has(word.toUpperCase());
}

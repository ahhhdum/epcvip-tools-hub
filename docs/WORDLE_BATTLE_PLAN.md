# Wordle Battle: Game Overview

## Concept

**Wordle Battle** is a competitive real-time multiplayer word puzzle game for 2-6 players. Think **Wordle meets Mario Kart**—players race to solve the same hidden word while earning and deploying powerups to sabotage opponents. The game balances raw word-solving skill with strategic disruption, creating tension between focusing on your puzzle versus investing time to gain abilities that can swing the match.

---

## Core Gameplay

### The Basics
- All players solve the **same hidden word** simultaneously in real-time
- You can see opponent boards but **only the tile colors** (green/yellow/gray)—not their actual letter guesses
- Standard Wordle rules: 6 guesses, green = correct position, yellow = wrong position, gray = not in word
- First to solve wins the round (in Casual mode) or scoring determines winner (in Competitive mode)

### What Makes It Different
- **Visibility without information**: You know how far opponents are (how many guesses used, how many greens they have) but not what they're guessing
- **Powerups and sabotage**: Disrupt opponents with abilities like covering their board with ink, scrambling their letters, or blocking their keyboard
- **Split attention**: Earn powerups by completing optional minigames, forcing a strategic choice between solving and sabotaging
- **Spectator mode**: Eliminated or finished players watch until the round ends

---

## Game Modes

### Casual Mode
Pure race format. First player to solve the word wins the round. No complex scoring—just speed.

### Competitive Mode
Weighted scoring combining multiple factors:
- Base points for solving
- Bonus for fewer guesses used
- Time multiplier (faster = more points)
- Example formula: `Score = (7 - guesses) × 100 + TimeBonus`

Best for players who want skill expression beyond pure typing speed.

### Chaos Mode
Powerups flow freely and frequently. Shorter rounds, maximum disruption. Pure mayhem for when you want to laugh more than tryhard.

### Marathon Mode
Extended format using **6 or 7-letter words** instead of standard 5-letter. More guesses allowed, longer solve times, and more opportunity to accumulate and use powerups throughout a single word.

---

## Match Configuration

Players vote on settings in the lobby before the match starts:

| Setting | Options |
|---------|---------|
| **Mode** | Casual / Competitive / Chaos |
| **Rounds** | Best of 1, 3, 5, or 7 |
| **Word Length** | 5, 6, or 7 letters |
| **Powerups** | On / Off / Limited |

---

## Powerup System

### Acquiring Powerups

The central strategic tension: **Do you focus on solving, or invest time earning powerups?**

#### Tier 1: Placement Rewards (Simplest)
At the end of each round, players receive a randomized powerup based on finish position:
- 1st place: Weakest powerup pool (you're already winning)
- 4th-6th place: Strongest powerup pool (comeback mechanic)

#### Tier 2: Active Minigames
Optional challenges run in a panel beside your main board. Completing them earns powerups but splits your attention:

**Word Unscramble**
- A scrambled 4-letter word appears (e.g., "PLPEA" → "APPLE")
- Solve it correctly to earn a powerup
- New word spawns every 15-20 seconds
- Tests the same skill as the main game (word recognition)

**Timing Challenge**
- A moving indicator travels across a bar
- Click/tap to stop it in the target zone
- Closer to center = better powerup
- Dredge/fishing game style—tests reflexes and timing

**Full Screen Takeover (High Risk)**
- Voluntarily replace your entire Wordle board with a more complex challenge
- Guarantees a powerup but you can't guess while in this mode
- High risk, high reward for players confident they can catch up

### Powerup Categories

#### Defensive (Self-Buffs)
| Powerup | Effect |
|---------|--------|
| **Shield** | Block the next incoming sabotage |
| **Peek** | Reveal one letter position in your word |
| **Extra Guess** | Add one additional guess to your board |

#### Offensive (Single Target)
| Powerup | Effect |
|---------|--------|
| **Ink Blot** | Cover target's board for 5 seconds |
| **Scramble** | Shuffle the letter positions in their current row |
| **Keyboard Chaos** | Randomize their keyboard layout for 10 seconds |
| **Ghost Letters** | Their next guess shows fake colors for 3 seconds before revealing real ones |
| **Vowel Tax** | Lock one random vowel on their keyboard for one guess |

#### Offensive (Multi-Target)
| Powerup | Effect |
|---------|--------|
| **Fog of War** | All opponents lose color hints for their next guess |
| **Lightning** | Brief screen disruption for everyone ahead of you |

#### Chaotic (Random/Fun)
| Powerup | Effect |
|---------|--------|
| **Hot Potato** | Bounces between players; whoever holds it when timer ends gets scrambled |
| **Mime Mode** | Target can't see their own typed letters for one guess |

### Powerup Rules
- **Inventory**: Hold up to 2-3 powerups at a time
- **Usage**: Use immediately (MVP) or save for strategic moments
- **Visibility**: Optional—seeing opponent powerups adds strategy but complexity
- **Targeting**: Click on opponent's board to target, or random assignment

---

## Player Experience Flow

### 1. Lobby
- Create or join a game (up to 6 players)
- See who's joined and their ready status
- Vote on mode and settings
- Host starts when ready

### 2. Round Start
- All players see their empty boards
- Hidden word is revealed to the server only
- Timer begins (if applicable)
- Minigame panel activates (if powerups enabled)

### 3. Active Play
- Type guesses on your board
- Watch opponent progress via colored tiles
- Optionally engage minigames to earn powerups
- Deploy powerups against opponents
- React to incoming sabotage

### 4. Round End
- First solver wins (Casual) or scores calculated (Competitive)
- All boards revealed with actual letters
- Placement-based powerups distributed
- Brief results screen
- Next round begins or match ends

### 5. Match End
- Final standings displayed
- Stats: total solve time, average guesses, powerups used, etc.
- Option to rematch or return to lobby

---

## Technical Approach

### Stack
- HTML, CSS, JavaScript (vanilla or light framework)
- Pre-built templates where possible
- Simple sprites (AI-generated or code-drawn)
- WebSockets for real-time multiplayer

### Design Philosophy
- **Minimal animations**: State changes over motion graphics
- **Desktop-first**: Optimized for widescreen; mobile is future scope
- **Simple visuals**: Clean, functional UI that's fast to implement
- **No complex backgrounds**: Focus on game state clarity

### Key Technical Challenges
- Real-time sync of 6 player boards
- Powerup effect application and timing
- Minigame state running parallel to main game
- Spectator view after elimination

---

## Development Phases

### Phase 1: Core Game (MVP)
- 6-player lobbies with basic matchmaking
- Standard 5-letter Wordle gameplay
- Mode voting (Casual vs Competitive)
- Opponent board visibility (colors only)
- Spectate until round complete
- No powerups

### Phase 2: Simple Powerups
- Placement-based powerup rewards
- 4-5 basic powerups (Ink Blot, Scramble, Shield, Peek, Fog)
- Best of 3/5/7 format
- Basic targeting UI

### Phase 3: Active Acquisition
- Word Unscramble minigame
- Timing Challenge minigame
- Player preference for minigame style

### Phase 4: Expanded Features
- 6-7 letter Marathon mode
- Additional powerups
- Team modes (2v2, 3v3)
- Ranked/casual queue split (maybe)

### Backlog (Future)
- Mobile responsive layout
- Cosmetics (board skins, powerup effects)
- Custom word lists
- Tournament mode
- Spectator/streaming features

---

## Target Audience

**Primary**: Internal team game for EPCVIP—quick matches during breaks, team bonding, low-stakes competition with coworkers.

**Secondary**: Potentially shareable with broader audience if polished enough. The Mario Kart-style powerup system adds casual appeal beyond hardcore word game enthusiasts.

---

## Design Principles

1. **Fun over fairness**: Powerups should create memorable moments, not perfectly balanced competition
2. **Disruption, not destruction**: Sabotage slows opponents down but doesn't erase their progress
3. **Optional depth**: Casual players can ignore minigames and just solve; competitive players can optimize both
4. **Quick rounds**: Individual words should resolve in 1-3 minutes; full matches in 10-15 minutes
5. **Spectator engagement**: Watching others finish should be entertaining, not boring

---

## Open Questions

1. **Async support?** Could there be a turn-based or async mode for non-real-time play?
2. **Word source**: Curated list? NYT Wordle words? Custom lists per team?
3. **Anti-cheat**: Any concern about players using external solvers?
4. **Persistence**: Track stats over time? Leaderboards? Achievements?
5. **Audio**: Sound effects for powerups, correct guesses, sabotage? Or silent?

---

## Summary

Wordle Battle takes the satisfying core loop of Wordle and adds competitive multiplayer tension plus Mario Kart-style powerup chaos. The strategic layer of "solve vs. sabotage" creates emergent playstyles—speedrunners who ignore powerups, chaos agents who prioritize disruption, and tactical players who balance both. It's designed to be quick to play, easy to understand, and full of moments worth talking about afterward.

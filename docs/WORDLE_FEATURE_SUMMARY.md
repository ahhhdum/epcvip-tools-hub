# Wordle Battle - Feature Summary

A comprehensive overview of the current state, implemented features, and planned roadmap for competitive research purposes.

---

## 🎮 Pages/Views (7 total)

1. **Lobby** - Main entry point with auth, stats display, and room actions
2. **Waiting Room** - Room code display, player list, game mode selection, ready-up
3. **Game View** - Main Wordle grid, keyboard, opponent boards panel, timer
4. **Results View** - Game over screen with leaderboard and word reveal
5. **Daily Completed View** - Shows past completion with grid replay and stats
6. **Historical Dailies View** - Browse/play past daily challenges
7. **Modals** - Auth login/signup, daily mode selection (solo vs friends)

---

## ✅ Implemented Features

### Core Gameplay
- **Standard Wordle mechanics** - 5-letter words, 6 guesses, green/yellow/gray feedback
- **Real-time multiplayer** - 2-6 players via WebSocket
- **Opponent visibility** - See opponent board colors (not letters)
- **On-screen keyboard** - With key state tracking (correct/present/absent)
- **Physical keyboard support** - Type directly
- **Dictionary validation** - Invalid word shake + 3-strike force-submit override

### Game Modes
- **Casual Mode** - First to solve wins
- **Competitive Mode** - Scoring with time bonus: `(7 - guesses) × 100 + TimeBonus`
- **Daily Challenge** - Same word for all players each day (requires login)
- **Random Word** - Server picks a random word from solution list

### Multiplayer Features
- **Room codes** - 6-character shareable codes
- **Copy to clipboard** - Room code sharing
- **Ready-up system** - All players must ready before host can start
- **3-2-1 countdown** - Animated countdown before game starts
- **Live timer display** - Per-player timing during game
- **Host controls** - Mode selection, start game, leave room
- **Player join/leave notifications** - Toast messages

### Authentication & Stats
- **Supabase auth** - Email/password login & signup
- **SSO support** - Token-based login from parent app
- **Guest mode** - Play without account (no stats saved)
- **Player stats persistence** - Games played, win rate, current streak, best streak
- **Stats display in lobby** - For logged-in users

### Daily Challenge System
- **Daily number tracking** - Days since epoch (2024-01-01)
- **One completion per day** - Server enforces uniqueness
- **Solo daily** - Start immediately without waiting for players
- **Multiplayer daily** - Play the daily with friends
- **Daily completion view** - Shows previous result if already played

### Historical Dailies
- **Random unplayed daily** - One-click play a random missed daily
- **Recent 7 days** - Quick access to recent dailies with status
- **Browse all** - Enter any daily number to play
- **Completion tracking** - Shows which dailies you've done

### UX Polish
- **Mobile responsive** - Compact opponent view, touch-optimized keyboard
- **Connection status indicator** - Shows connected/disconnected
- **Error toasts** - User feedback for errors
- **Player highlight animations** - When someone joins
- **Row shake animation** - Invalid word feedback
- **Countdown pulse animation** - Game start countdown

---

## 📋 Planned Features (from Backlog)

### High Priority
- **Granular guess tracking** - Per-guess timing, letter analytics
- **Starting word analytics** - Track favorite openers, success rates
- **Matchup history** - Head-to-head records

### Medium Priority
- **Share results** - Copy emoji grid to clipboard (🟩🟨⬛ style)
- **Daily leaderboard** - Fastest solvers for today
- **Personal stats dashboard** - Detailed breakdown
- **Guess distribution chart** - Bar chart of 1/2/3/4/5/6 wins
- **Achievement system** - Badges for milestones (Hot Streak, Speed Demon, etc.)

### Lower Priority (Future Vision)
- **Powerups** - Reveal letter, extra guess, ink blot, keyboard scramble
- **Custom word mode** - Host enters secret word
- **Marathon mode** - 6-7 letter words
- **Expanded word list** - Grow from 666 → 2,500 words
- **URL-based routing** - Browser back button support
- **Leave/cancel mid-game** - Clear exit mechanics

### Dream Features (from Design Doc)
- **Powerup minigames** - Word unscramble, timing challenges
- **Offensive abilities** - Fog of War, Ghost Letters, Vowel Tax
- **Chaos Mode** - Maximum powerup disruption
- **Team modes** - 2v2, 3v3

---

## 📊 Technical Stack

- **Frontend**: Vanilla HTML/CSS/JS, no framework
- **Backend**: Node.js + Express + WebSocket (ws)
- **Auth**: Supabase
- **Deployment**: Railway
- **Word list**: ~666 solution words + ~13,000 valid guesses

---

## 🔍 Research Prompt for ChatGPT

Use this prompt to research competing apps and find feature inspiration:

```
I'm building a multiplayer Wordle game called "Wordle Battle" with the following features:

Current features:
- Real-time multiplayer (2-6 players) with opponent board visibility (colors only, not letters)
- Daily challenges with completion tracking
- Historical daily puzzles (play past dailies)
- Auth with stats persistence (win rate, streaks, games played)
- Casual mode (first to solve) and Competitive mode (time-based scoring)
- Solo and multiplayer daily challenge modes

Planned features:
- Share results (emoji grid)
- Achievements/badges
- Powerups (like Mario Kart - ink blot, keyboard scramble, extra guess)
- Daily leaderboards
- Head-to-head matchup history

Please research competing Wordle games, clones, and similar word puzzle games. I want to compare features and find inspiration. Look for:
1. Popular Wordle clones/variants (web, iOS, Android)
2. Multiplayer word games
3. Games with powerup/sabotage mechanics
4. Unique features I might be missing
5. Monetization strategies (if any)
6. Community/social features

Specifically look at: Squabble, WordMaster, Wordle Party, Word Duel, Spelling Bee, Quordle, Octordle, Semantle, and any others you find. Compare their feature sets to mine and suggest features worth adding.
```

---

## 🎯 Key Differentiators

Features that set Wordle Battle apart from typical Wordle clones:

1. **Opponent visibility** - See their progress (colors) but not their strategy (letters)
2. **Historical dailies** - Play any past daily you missed
3. **Solo OR multiplayer daily** - Flexibility in how you play the daily
4. **Competitive scoring mode** - More than just "first to solve"
5. **Planned powerup system** - Mario Kart-style sabotage (unique in Wordle space)

---

*Last updated: January 3, 2026*

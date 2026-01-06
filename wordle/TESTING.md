# Wordle Battle Testing Guide

## Quick Start: Manual Multiplayer Testing

### Option 1: Two Different Browsers
1. Open Chrome: `http://localhost:2567/wordle/?playerName=Host&fresh=true`
2. Open Firefox: `http://localhost:2567/wordle/?playerName=Guest&fresh=true`
3. Host creates room, Guest joins with code

### Option 2: Regular + Incognito Window (Same Browser)
1. Regular window: `http://localhost:2567/wordle/?playerName=Host&fresh=true`
2. Incognito window: `http://localhost:2567/wordle/?playerName=Guest&fresh=true`

**Why different sessions?** Multiple tabs in the same browser share sessionStorage, causing session conflicts where players kick each other off.

---

## URL Parameters

| Parameter | Example | Effect |
|-----------|---------|--------|
| `fresh=true` | `?fresh=true` | Clears session, starts clean |
| `playerName=X` | `?playerName=Host` | Sets player display name |
| `testMode=true` | `?testMode=true` | Enables debug logging, exposes state |
| `slowTimers=true` | `?slowTimers=true` | Client-side slow timer flag |
| `autoJoin=CODE` | `?autoJoin=ABC123` | Auto-joins room on load |

### Combine Parameters
```
http://localhost:2567/wordle/?playerName=TestHost&fresh=true&testMode=true
```

---

## Testing Sabotage Mode

1. **Host**: Create room → Select "Sabotage" word mode → Create Room
2. **Guest**: Enter room code → Join
3. **Both**: Click "I'm Ready"
4. **Host**: Click "Start Game"
5. **Both**: Pick words for opponent in 30-second selection phase
6. **Both**: Race to solve your assigned word

---

## Debugging

With `testMode=true`, open browser console (F12):

```javascript
// Access game state
window.__WORDLE_STATE__

// Check WebSocket connection (1 = OPEN)
window.__WORDLE_STATE__.socket.readyState

// Check current room
window.__WORDLE_STATE__.roomCode

// Check players in room
window.__WORDLE_STATE__.playersInRoom

// Check game phase
window.__WORDLE_STATE__.gamePhase
// Values: 'lobby', 'waiting', 'selecting', 'playing', 'results'

// Check if all players ready
window.__WORDLE_STATE__.allPlayersReady

// Check opponents
window.__WORDLE_STATE__.opponents
```

---

## Testing with Playwright MCP (Claude Code)

For automated testing with Claude Code's Playwright MCP:

```javascript
// Use browser_run_code with separate contexts
async (page) => {
  const browser = page.context().browser();

  // Create isolated sessions for each player
  const hostCtx = await browser.newContext();
  const guestCtx = await browser.newContext();

  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  // Navigate with test params
  await host.goto('http://localhost:2567/wordle/?playerName=Host&fresh=true');
  await guest.goto('http://localhost:2567/wordle/?playerName=Guest&fresh=true');

  // ... test logic
}
```

See `test/mcp/multiplayer-test.js` for full helper functions.

---

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with browser visible
npm run test:e2e:headed

# Interactive UI mode
npm run test:e2e:ui
```

---

## Common Issues

### Session Conflicts
**Symptom**: One player gets kicked when another joins
**Cause**: Multiple tabs sharing sessionStorage
**Fix**: Use `?fresh=true` or different browser/incognito windows

### Bottom Sheet Blocks Clicks
**Symptom**: Can't click "I'm Ready" after joining room
**Cause**: Play With Friends sheet stays open (should auto-close now)
**Fix**: Click outside sheet to close, or click X button

### Selection Phase Too Fast
**Symptom**: 30 seconds isn't enough time to pick a word
**Note**: Timer is server-controlled. Use `slowTimers=true` for future server support.

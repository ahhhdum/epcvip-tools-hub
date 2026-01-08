# Wordle Battle Testing Guide

Comprehensive testing strategy covering backend, frontend, visual, and AI-powered QA.

---

## Testing Layers

| Layer | Type | Cost | Trigger | Coverage |
|-------|------|------|---------|----------|
| **1** | Unit tests (Jest) | Free | Every commit | Logic, validation |
| **2** | E2E tests (Playwright) | Free | Every PR | User flows, multiplayer |
| **3** | Visual regression | Free | Every PR | UI consistency |
| **4** | AI QA (Claude + MCP) | ~$0.60 | UI changes | Exploratory, UX issues |

---

## Quick Commands

```bash
# Unit tests (server)
cd server && npm test

# E2E tests (all)
npx playwright test

# E2E tests (headed - watch browsers)
npx playwright test --headed

# E2E tests (UI mode - debugging)
npx playwright test --ui

# Visual tests only
npx playwright test visual.spec.ts

# Update visual baselines
npx playwright test visual.spec.ts --update-snapshots

# Specific test file
npx playwright test hard-mode.spec.ts

# Mobile viewport only
npx playwright test --project=mobile
```

---

## Test Structure

```
epcvip-tools-hub/
├── server/
│   └── src/services/
│       └── wordle-validator.test.ts    # Unit tests
├── test/
│   └── e2e/
│       ├── fixtures.ts                 # Test fixtures (twoPlayers, etc.)
│       ├── helpers/
│       │   └── PlayerPage.ts           # Page Object Model
│       ├── demo.spec.ts                # Basic flow tests
│       ├── sabotage.spec.ts            # Sabotage mode tests
│       ├── hard-mode.spec.ts           # Hard mode tests
│       └── visual.spec.ts              # Visual regression tests
│           └── visual.spec.ts-snapshots/ # Baseline screenshots
└── playwright.config.ts                # Playwright configuration
```

---

## Layer 1: Unit Tests

### What They Test
- Hard Mode validation rules
- Guess evaluation (green/yellow/absent)
- Word list utilities

### Running
```bash
cd server && npm test
```

### Adding Tests
```typescript
// server/src/services/wordle-validator.test.ts
describe('validateHardModeGuess', () => {
  it('enforces green letters in same position', () => {
    // Previous guess "CRANE" with target "CRATE"
    // C, R, A are green at positions 0, 1, 2
    // Next guess must have C at 0, R at 1, A at 2
  });
});
```

---

## Layer 2: E2E Tests

### Fixtures Available

| Fixture | Setup | Use Case |
|---------|-------|----------|
| `createPlayerContext` | Single player in lobby | Solo flows |
| `twoPlayers` | Host + Guest in lobby | Room creation/joining |
| `sabotageGame` | Active sabotage game | Selection phase tests |
| `randomGame` | Active random word game | Guessing flow tests |

### Example Test
```typescript
import { test, expect } from './fixtures';

test('players can join room', async ({ twoPlayers }) => {
  const { host, guest } = twoPlayers;

  const roomCode = await host.createRoom({ wordMode: 'random' });
  await guest.joinRoom(roomCode);

  expect(await guest.getRoomCode()).toBe(roomCode);
});
```

### PlayerPage Methods

```typescript
// Navigation
await player.goto();                    // Go to /wordle
await player.openFriendsSheet();        // Click "Play With Friends"

// Room Management
await player.createRoom({ wordMode: 'random' });
await player.createRoom({ wordMode: 'sabotage', hardMode: true });
await player.joinRoom('ABC123');
await player.markReady();
await player.startGame();

// Gameplay
await player.typeGuess('CRANE');
await player.submitGuess();
await player.guess('CRANE');           // type + submit

// Waiting
await player.waitForGamePhase();
await player.waitForSelectionPhase();
await player.waitForMessage('You won!');
```

---

## Layer 3: Visual Regression

### Current Baselines (6 snapshots)

| Screenshot | Description |
|------------|-------------|
| `lobby-initial.png` | Main lobby view |
| `lobby-friends-modal.png` | Play With Friends modal |
| `lobby-past-dailies.png` | Past Dailies modal |
| `waiting-room-host.png` | Host in waiting room |
| `waiting-room-guest.png` | Guest in waiting room |
| `game-board-initial.png` | Empty game board |
| `keyboard-initial.png` | Keyboard before guesses |
| `mobile-lobby.png` | Mobile viewport |

### Adding New Visual Tests

```typescript
test('new component - initial state', async ({ createPlayerContext }) => {
  const player = await createPlayerContext('Visual');

  // Navigate to component
  await player.page.click('[data-testid="new-feature"]');

  // Capture screenshot
  await expect(player.page).toHaveScreenshot('new-feature.png', {
    fullPage: true,
    maxDiffPixels: 100,  // Tolerance for anti-aliasing
    mask: [player.page.locator('.dynamic-content')],  // Hide changing content
  });
});
```

### Updating Baselines

When UI changes intentionally:
```bash
npx playwright test visual.spec.ts --update-snapshots
```

### CI Considerations

Visual tests may differ between local and CI due to:
- Font rendering differences
- Anti-aliasing
- Browser versions

Use `maxDiffPixels` tolerance and consider running visual tests only in CI.

---

## Layer 4: AI QA (GitHub Actions)

### When It Runs
- Automatically on PRs changing `wordle/**` or `server/src/rooms/wordle-*`
- Manually via `qa-verify` label
- Manually via workflow_dispatch

### What It Tests
- Page loads correctly (3 main buttons visible)
- Daily Challenge flow
- Create Room flow (room code generation)
- Mobile viewport (375x667)
- Console errors

### Cost
~$0.60 per run (Sonnet 4.5, ~40 turns)

### Triggering Manually
1. Go to Actions → "Wordle QA" → Run workflow
2. Or add `qa-verify` label to a PR

---

## Use Case Matrix

### "I changed game logic"
```bash
cd server && npm test           # Unit tests
npx playwright test hard-mode   # E2E for feature
```

### "I changed UI styles"
```bash
npx playwright test visual.spec.ts --update-snapshots  # Update baselines
npx playwright test                                     # Full suite
```

### "I added a new feature"
```bash
# Write E2E test in test/e2e/
npx playwright test my-feature.spec.ts

# Add visual baseline
npx playwright test visual.spec.ts --update-snapshots

# AI QA runs automatically on PR
```

### "I want to debug a failing test"
```bash
npx playwright test --ui                    # Interactive UI mode
npx playwright test --debug                 # Step through
npx playwright show-report                  # View HTML report
```

### "I want to test mobile responsiveness"
```bash
npx playwright test --project=mobile
```

### "I want Claude to explore for bugs"
1. Push PR with UI changes
2. AI QA workflow runs automatically
3. Review findings in workflow summary

---

## CI Workflows

| Workflow | Trigger | Duration | Cost |
|----------|---------|----------|------|
| **CI** | All pushes/PRs | ~2 min | Free |
| **Security Review** | All PRs | ~36s | ~$0.05 |
| **Wordle QA** | UI changes | ~4.5 min | ~$0.60 |

---

## Best Practices

### Test Isolation
Each test gets fresh browser contexts. Don't rely on state from other tests.

### Deterministic Tests
Use `testWord` parameter for seeded words when testing specific scenarios:
```typescript
await host.createRoom({
  wordMode: 'random',
  testWord: 'CRANE'  // Known word for deterministic testing
});
```

### Waiting Strategies
Use explicit waits instead of timeouts:
```typescript
// Good
await player.page.waitForSelector('[data-testid="game-board"]');

// Bad
await player.page.waitForTimeout(2000);
```

### Visual Test Tolerance
Use `maxDiffPixels` for tests with variable content (colors, random words):
```typescript
await expect(page).toHaveScreenshot('game.png', {
  maxDiffPixels: 500  // Allow for color variations
});
```

---

## Troubleshooting

### "Visual tests fail in CI"
- Run `--update-snapshots` locally with same OS as CI
- Use Docker for consistent environment
- Increase `maxDiffPixels` tolerance

### "WebSocket tests are flaky"
- Add explicit waits for connection
- Use `waitForMessage` helper
- Check for race conditions

### "Tests pass locally but fail in CI"
- CI uses `workers: 1` (sequential)
- Check for port conflicts
- Review trace files from failed runs

---

*Last updated: 2026-01-08*

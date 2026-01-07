# E2E Testing Guide

End-to-end testing for Wordle Battle using Playwright.

## Quick Start

```bash
# Run all tests (headless, fast)
npx playwright test

# Run with visible browsers
npx playwright test --headed

# Interactive UI mode (debugging)
npx playwright test --ui

# Run specific test file
npx playwright test test/e2e/demo.spec.ts
```

## The 4 Modes of Playwright

| Mode | Command | Best For |
|------|---------|----------|
| **Headless** | `npx playwright test` | CI/CD, fast regression |
| **Headed** | `npx playwright test --headed` | Demos, watching tests run |
| **UI Mode** | `npx playwright test --ui` | Debugging, writing new tests |
| **MCP** | Claude Code + Playwright MCP | Exploration, visual bugs |

### Mode 1: Headless (CI/Automated)
```bash
npx playwright test
```
- No visible browser
- Fast parallel execution
- Screenshots/traces only on failure

### Mode 2: Headed (Visible)
```bash
npx playwright test --headed --workers=1
```
- See browser windows
- Good for demos and stakeholder presentations
- Use `--workers=1` to run sequentially

### Mode 3: UI Mode (Interactive Debugger)
```bash
npx playwright test --ui
```
Opens interactive IDE with:
- Test list sidebar
- Timeline scrubbing
- Live browser preview
- Tabs: Locator, Source, Call, Log, Errors, Console, Network

### Mode 4: MCP Mode (Claude-Driven)
When Claude Code has Playwright MCP configured:
```typescript
mcp__playwright__browser_navigate({ url: 'http://localhost:2567/wordle' })
mcp__playwright__browser_snapshot()  // Claude SEES the page
mcp__playwright__browser_click({ element: 'Play With Friends', ref: 'e20' })
```
- Claude controls browser and sees screenshots
- Can catch visual bugs, layout issues
- Best for exploration and debugging

## Test Structure

```
test/e2e/
├── fixtures.ts           # Custom test fixtures (multi-player contexts)
├── helpers/
│   └── PlayerPage.ts     # Page Object Model for player actions
├── demo.spec.ts          # Stakeholder demo tests
└── sabotage.spec.ts      # Sabotage mode tests
```

## Key Patterns

### Multi-Player Testing
Each player gets their own isolated browser context:
```typescript
test('two players join room', async ({ twoPlayers }) => {
  const { host, guest } = twoPlayers;
  const roomCode = await host.createRoom({ wordMode: 'random' });
  await guest.joinRoom(roomCode);
});
```

### Page Object Model
Player actions are encapsulated in `PlayerPage`:
```typescript
await player.goto();                    // Navigate to /wordle
await player.createRoom({ wordMode: 'sabotage' });
await player.joinRoom(roomCode);
await player.markReady();
await player.startGame();
await player.guess('CRANE');
await player.waitForResults();
```

### Available Fixtures
| Fixture | Description |
|---------|-------------|
| `twoPlayers` | Two players in lobby (not in room) |
| `sabotageGame` | Two players in sabotage selection phase |
| `randomGame` | Two players in active random word game |
| `createPlayerContext` | Factory to create isolated player contexts |

## Debugging

### View Traces
```bash
npx playwright test --trace on
npx playwright show-report
```

### View Specific Trace
```bash
npx playwright show-trace test-results/*/trace.zip
```

### Debug Single Test
```bash
npx playwright test --debug -g "test name"
```

## CI Integration

Tests run automatically in CI. On failure:
1. Screenshots saved to `test-results/`
2. Traces saved for debugging
3. HTML report generated

View report locally:
```bash
npx playwright show-report
```

## MCP Setup

To enable Claude-driven browser control:

```bash
# Add Playwright MCP to Claude Code
claude mcp add playwright npx '@playwright/mcp@latest'
```

Then in Claude Code:
```
Navigate to http://localhost:2567/wordle and explore the Wordle Battle game
```

## Writing New Tests

1. Use UI mode to explore: `npx playwright test --ui`
2. Use Page Object Model methods from `PlayerPage`
3. Add `data-testid` attributes to new elements
4. Use fixtures for multi-player scenarios

Example:
```typescript
import { test, expect } from './fixtures';

test('new feature works', async ({ twoPlayers }) => {
  const { host, guest } = twoPlayers;

  // Use PlayerPage methods
  const roomCode = await host.createRoom({ wordMode: 'random' });
  await guest.joinRoom(roomCode);

  // Assertions
  expect(await host.getRoomCode()).toBe(roomCode);
});
```

## Common Issues

### Tests Failing with Timeout
- Ensure server is running: `cd server && npm start`
- Or let Playwright auto-start it (configured in `playwright.config.ts`)

### Session Conflicts
- Each player needs their own browser context (handled by fixtures)
- Don't reuse contexts between tests

### Flaky Tests
- Use `waitForSelector` instead of `waitForTimeout`
- Wait for specific state changes, not arbitrary delays

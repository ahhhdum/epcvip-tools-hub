# Testing Methodology

A comprehensive guide to our testing approach combining Playwright scripted tests with Claude Code MCP-driven exploration.

## Philosophy

**Two complementary approaches:**

1. **Scripted Tests (CI/Regression)** - Fast, deterministic, catches workflow breaks
2. **Claude MCP (Exploration)** - Visual, intelligent, catches what scripts miss

Neither replaces the other. Use both.

## The Testing Pyramid for AI-Assisted Development

```
              ┌─────────────────────┐
              │   Claude MCP        │  ← Visual bugs, exploration
              │   (AI-Driven)       │     Competitor analysis
              ├─────────────────────┤
              │   E2E Tests         │  ← Critical user flows
              │   (Playwright)      │     Multiplayer scenarios
              ├─────────────────────┤
              │   Integration       │  ← API contracts
              │   (Jest/Server)     │     WebSocket messages
              ├─────────────────────┤
              │   Unit Tests        │  ← Business logic
              │   (Jest)            │     Pure functions
              └─────────────────────┘
```

## What Each Layer Catches

| Layer | Catches | Misses |
|-------|---------|--------|
| **Unit** | Logic errors, edge cases | Integration issues |
| **Integration** | API contracts, data flow | UI issues |
| **E2E Scripted** | Workflow breaks, regressions | Visual bugs, typos |
| **Claude MCP** | Visual issues, UX problems | Nothing (but slower) |

## Pure Function Testing (Unit Tests)

### Definition

A pure function:
- Takes inputs, returns outputs
- No side effects (no DB, WebSocket, DOM)
- Deterministic (same inputs = same outputs)

### The Rule

> **If it's pure, unit test it. No exceptions.**

Pure functions are the easiest to test and the most reliable. Don't skip unit tests just because you have E2E tests.

### Examples in This Codebase

| Function | Location | What It Does |
|----------|----------|--------------|
| `validateGuess()` | wordle-validator.ts | Compare guess to target word |
| `validateHardMode()` | wordle-validator.ts | Check hard mode constraints |
| `calculateScore()` | wordle-validator.ts | Compute competitive score |
| `generateRoomCode()` | room-codes.ts | Generate 6-char room code |
| `formatTime()` | wordle-utils.js | Format seconds as M:SS |

### Unit Test Pattern

```typescript
// server/src/services/wordle-validator.test.ts

describe('validateHardMode', () => {
  it('requires green letter to stay in same position', () => {
    const previousGuesses = ['CRANE'];
    const previousResults: LetterResult[][] = [
      ['absent', 'correct', 'present', 'absent', 'absent'], // R is green
    ];

    // SLATE doesn't have R at position 1
    const result = validateHardMode('SLATE', previousGuesses, previousResults);
    expect(result.valid).toBe(false);
    expect(result.violation).toBe('2nd letter must be R');
  });
});
```

### When to Write Unit Tests

- Adding new validation logic
- Adding new calculation/transformation
- Adding new pure utility function
- Fixing a bug in pure logic (regression test)

### Don't Skip Unit Tests Because You Have E2E

E2E tests and unit tests serve different purposes:

| Aspect | Unit Tests | E2E Tests |
|--------|------------|-----------|
| Speed | Fast (ms) | Slow (seconds) |
| Reliability | Deterministic | May flake |
| Debugging | Precise location | Harder to isolate |
| Coverage | Logic edge cases | User flows |

**Best practice:** Unit tests for logic, E2E for user experience. Both complement each other.

## Test Word Seeding (Deterministic E2E)

### The Problem

Many features require testing actual gameplay outcomes, but the target word is random:
- Win confetti (need to WIN)
- Share results (need known outcome)
- Hard mode violations (need known letter positions)
- Achievements (need specific scenarios)

### The Solution

Use `testWord` parameter to seed a deterministic target word:

```typescript
// In E2E test
const roomCode = await host.createRoom({
  wordMode: 'random',
  testWord: 'CRANE', // Target word is now CRANE
});

// Now gameplay is deterministic
await host.guess('CRANE'); // Wins on first guess
await host.page.waitForSelector('text=You won!');
```

### Security

- Test word seeding is **ignored in production** (`NODE_ENV=production`)
- Only works in development/test environments
- No attack surface in production builds

### Use Cases

| Feature | Test Scenario |
|---------|---------------|
| Win detection | Seed word, guess it, verify "You won!" |
| Hard mode | Seed CRANE, guess TRACE, verify constraints |
| Share results | Seed word, play specific sequence, verify share text |
| Achievements | Seed words to trigger specific achievement conditions |

## Scripted Tests: What They Actually Check

```typescript
// This test ONLY checks what's explicitly asserted:
await page.click('[data-testid="submit"]');
await expect(page).toHaveURL('/success');     // ✅ URL changed
await expect(heading).toHaveText('Welcome');  // ✅ Heading text

// It does NOT check:
// ❌ CSS styling (colors, layout, fonts)
// ❌ Other text on page (typos, wrong content)
// ❌ Image loading
// ❌ Console errors
// ❌ Performance
// ❌ Accessibility
```

**Key insight:** Scripted tests verify workflows, not appearance.

## Claude MCP: What It Can Catch

When Claude uses Playwright MCP, it **sees** the page:

```typescript
mcp__playwright__browser_snapshot()
// Returns accessibility tree + screenshot
// Claude can notice:
// ✅ Visual layout issues
// ✅ Typos and wrong text
// ✅ Missing elements
// ✅ Broken images
// ✅ Confusing UX
```

## Workflow Integration

### 1. Development Cycle
```
Write feature → Claude MCP explores → Find issues → Fix → Write scripted test
```

### 2. CI/CD Pipeline
```
Commit → Scripted tests run → Pass/Fail → On failure: Claude investigates
```

### 3. Bug Investigation
```
CI fails → Open trace in UI mode → Step through → Claude MCP explores live
```

### 4. Visual QA
```
Before release → Claude MCP walks through all screens → Reports issues
```

## Use Cases

### Automated Regression (Scripted)
**When:** Every commit
**Tool:** `npx playwright test`
**Catches:** Broken workflows, missing elements, wrong URLs

### Visual Bug Hunting (MCP)
**When:** Before releases, after major UI changes
**Tool:** Claude Code + Playwright MCP
**Catches:** Layout issues, visual regressions, UX problems

### Competitor Analysis (MCP)
**When:** Market research, feature planning
**Tool:** Claude Code + Playwright MCP
**Process:**
1. Navigate to competitor site
2. Take snapshots of key features
3. Extract pricing, features, UX patterns
4. Compare to our implementation

### Test Generation (MCP → Scripted)
**When:** New features, missing coverage
**Tool:** Claude Code explores, generates test code
**Process:**
1. Claude explores feature with MCP
2. Claude writes test based on observations
3. Human reviews and commits
4. Test runs in CI forever

### Failure Investigation (UI Mode + MCP)
**When:** CI test fails
**Tool:** UI mode for traces, MCP for live exploration
**Process:**
1. Open trace: `npx playwright show-trace`
2. Step through failure in timeline
3. Claude MCP explores live to understand issue
4. Fix and verify

## Best Practices

### For Scripted Tests

1. **Use `data-testid` attributes**
   ```html
   <button data-testid="submit-order">Place Order</button>
   ```

2. **Wait for state, not time**
   ```typescript
   // Bad
   await page.waitForTimeout(2000);

   // Good
   await page.waitForSelector('[data-testid="results"]');
   ```

3. **Isolate test data**
   - Each test gets fresh browser context
   - Don't depend on other tests

4. **Use Page Object Model**
   - Encapsulate page interactions
   - Single place to update selectors

### For Claude MCP

1. **Be specific in prompts**
   ```
   Navigate to /wordle and verify the lobby shows three buttons:
   Daily Challenge, Play With Friends, and Past Dailies
   ```

2. **Request screenshots as evidence**
   ```
   Take a screenshot of any issues you find
   ```

3. **Use for exploration, not regression**
   - MCP is slower than scripted tests
   - Save it for visual verification and debugging

## Multiplayer Testing Patterns

### Isolated Browser Contexts
Each player needs their own session:
```typescript
const hostCtx = await browser.newContext();
const guestCtx = await browser.newContext();
```

### Fixtures for Common Scenarios
```typescript
// Pre-configured fixtures
twoPlayers     // Two players in lobby
sabotageGame   // Two players in selection phase
randomGame     // Two players in active game
```

### Synchronization Points
Wait for both players to reach same state:
```typescript
await host.waitForGamePhase();
await guest.waitForGamePhase();
```

## Coverage Strategy

### Critical Paths (Always Test)
- Room creation and joining
- Ready/start flow
- Word submission
- Game completion
- Results display

### Visual Verification (Claude MCP)
- Layout on mobile vs desktop
- Color coding (correct/wrong letters)
- Timer display
- Player list updates

### Edge Cases (Scripted)
- Disconnection handling
- Invalid input
- Race conditions

## Metrics to Track

| Metric | Target |
|--------|--------|
| E2E test pass rate | > 95% |
| Test execution time | < 2 min |
| Flaky test rate | < 5% |
| Coverage of critical paths | 100% |

## Tools Reference

| Tool | Command | Purpose |
|------|---------|---------|
| Run tests | `npx playwright test` | CI/regression |
| Headed mode | `npx playwright test --headed` | Demos |
| UI mode | `npx playwright test --ui` | Debugging |
| Show report | `npx playwright show-report` | View results |
| Record trace | `npx playwright test --trace on` | Debugging |
| MCP setup | `claude mcp add playwright` | Claude integration |

## Further Reading

- [test/e2e/README.md](../test/e2e/README.md) - Quick start guide
- [ai-dev-templates: Testing Guide](https://github.com/your-org/ai-dev-templates/templates/testing/) - Template library

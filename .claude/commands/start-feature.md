# Start Feature

Start a new feature from the backlog with integrated testing planning.

## Step 1: Load Context

**Read these files:**
1. `CLAUDE.md` - Project standards
2. `BACKLOG.md` - Feature backlog
3. `docs/CI_TESTING_STATUS.md` - What testing methods are verified

## Step 2: Feature Selection

### If user provided a feature ID or name:
Look up in BACKLOG.md and confirm.

### If no argument provided:
Read BACKLOG.md and show available features grouped by priority:

```
🎯 CURRENT SPRINT
[List items from "Current Sprint" section in BACKLOG.md]

📋 HIGH PRIORITY (P1)
[List P1 items from "Prioritized Backlog" section]

📋 MEDIUM PRIORITY (P2)
[List first 3-5 P2 items]

Which feature? (Enter number, ID, or describe new feature)
```

**Parse BACKLOG.md dynamically** - don't hardcode feature lists.

## Step 3: Size Assessment

| Effort | Action |
|--------|--------|
| **XS** (<1h) | Skip planning, just start |
| **S** (1-2h) | Lightweight plan |
| **M** (3-4h) | Full plan with checkpoints |
| **L+** (5h+) | Must split first |

## Step 4: Testability Analysis

**Before suggesting tests, analyze what kind of code will be written:**

### 4.1 Pure Functions Check

Does the feature add/modify functions that are:
- Takes inputs, returns outputs
- No side effects (no DB, WebSocket, DOM manipulation)
- Deterministic (same inputs = same outputs)

**If YES → Unit test is REQUIRED (not optional)**

Examples in this codebase:
- `validateGuess()` - wordle-validator.ts
- `validateHardMode()` - wordle-validator.ts
- `calculateScore()` - wordle-validator.ts
- `generateRoomCode()` - room-codes.ts

Pattern: `server/src/services/wordle-validator.test.ts`

### 4.2 Integration Points Check

Does the feature involve:
- WebSocket message handling
- Database operations
- Multi-player coordination
- User flows across multiple screens

**If YES → E2E test recommended**

Pattern: `test/e2e/*.spec.ts`

**For deterministic gameplay testing**, use test word seeding:
```typescript
// In E2E test
await host.createRoom({ testWord: 'CRANE' });
// Now target word is CRANE - enables deterministic testing
```

### 4.3 UI Changes Check

Does the feature change visual appearance?
- New components/modals
- CSS changes
- Layout changes

**If YES → Visual regression recommended**

Pattern: `test/e2e/visual.spec.ts`

---

## Step 5: Testing Plan (Auto-Suggest)

**Based on testability analysis, suggest testing:**

### Testing Decision Matrix (Prescriptive)

| Feature Type | Unit Test | E2E Test | Visual |
|--------------|-----------|----------|--------|
| Pure function logic | **REQUIRED** | Optional | - |
| WebSocket/DB integration | Optional | **REQUIRED** | - |
| UI components | - | Recommended | **REQUIRED** |
| Bug fix | Match original | Regression | - |
| Refactor | Existing only | - | - |
| Trivial (config/text) | - | - | CI QA only |

### Feature Type Detection

| If feature involves... | Type | Suggested Testing |
|------------------------|------|-------------------|
| Buttons, modals, views, CSS | UI Feature | Visual + E2E flow |
| Game rules, validation, scoring | Game Logic | **Unit REQUIRED** + E2E |
| Fixing a bug | Bug Fix | Regression test |
| Code reorganization only | Refactor | Existing tests only |
| Config, text, minor tweak | Trivial | CI QA only |

### Generate Testing Suggestion

Based on testability analysis, output:

```
📋 TESTING PLAN (auto-suggested):
├─ Type: [detected type]
├─ Recommended:
│   ├─ [✓/○] E2E Test: [specific flow]
│   ├─ [✓/○] Visual Regression: [if UI changes]
│   └─ [✓/○] Unit Test: [if pure logic]
├─ CI (automatic):
│   ├─ Security Review: Always on PR
│   └─ QA Workflow: On Wordle file changes
├─ Testability:
│   ├─ Pure Functions: [Yes/No] → [Unit test REQUIRED if Yes]
│   ├─ Integration: [Yes/No] → [E2E recommended if Yes]
│   └─ UI Changes: [Yes/No] → [Visual recommended if Yes]
└─ Status: See docs/CI_TESTING_STATUS.md

Adjust testing plan? [Y/n]
```

### Testing Method Status Reference

From `docs/CI_TESTING_STATUS.md`:
- E2E Tests: TESTED locally
- Visual Regression: TESTED locally
- CI Security: UNTESTED (needs first PR)
- CI QA: UNTESTED (needs first PR)

**Flag if suggesting untested methods.**

## Step 6: Create Feature Plan

### For XS/S Features (Lightweight)

```markdown
# [Feature Name]

**ID:** [BACKLOG-ID] | **Effort:** [X]h | **Status:** In Progress

## Goal
[1-2 sentence goal]

## Approach
- [Key technical point 1]
- [Key technical point 2]

## Tasks
1. [ ] [Task 1]
2. [ ] [Task 2]
3. [ ] [Test task if applicable]

## Testing Plan
- [ ] [Test type]: [What to test]
- [ ] CI: Automatic on PR

## Files to Change
- `path/to/file` - [what changes]
```

### For M+ Features (Full Plan)

Create `docs/features/[FEATURE-ID]/plan.md` with:
- Detailed approach
- Phase breakdown
- Checkpoints for multi-session
- Testing plan section
- Open questions

## Step 7: Update Tracking

**Update BACKLOG.md:**
Move feature to "Current Sprint" if not already there, mark as "In Progress".

**Create todo list:**
```
[
  { content: "[ID]: [Feature Name]", status: "in_progress", activeForm: "Working on [Feature]" },
  { content: "[First task]", status: "pending", activeForm: "[First task]" },
  { content: "Write tests", status: "pending", activeForm: "Writing tests" }
]
```

## Step 8: Start Implementation

**Output format:**

```
✅ FEATURE SELECTED: [ID] [Name]
├─ Priority: [P1/P2/P3]
├─ Effort: [XS/S/M/L] ([X] hours)
├─ Files: [key files]
└─ Testing: [E2E / Visual / Unit / CI only]

📋 TESTING PLAN:
├─ [Test 1]: [description]
│   Status: [TESTED/UNTESTED]
├─ [Test 2]: [description]
│   Status: [TESTED/UNTESTED]
└─ CI: Security + QA automatic

📝 PLAN:
[Lightweight plan or link to full plan]

⚡ FIRST STEP:
[Concrete first task]

Ready to proceed? [Y/n]
```

Wait for user confirmation before making changes.

---

## Quick Reference

### Testing Decision Matrix (Prescriptive)

| Feature Type | Unit Test | E2E Test | Visual | Notes |
|--------------|-----------|----------|--------|-------|
| Pure function logic | **REQUIRED** | Optional | - | Test logic directly |
| WebSocket/DB | Optional | **REQUIRED** | - | Test integration |
| UI components | - | Recommended | **REQUIRED** | Test appearance |
| Bug fix | Match original | Regression | - | Prevent recurrence |
| Refactor | - | - | - | Existing tests |
| Trivial | - | - | - | CI QA only |

### Commands to Run Tests

```bash
# Unit tests (server)
cd server && npm test

# E2E tests
npx playwright test

# Visual regression
npx playwright test visual.spec.ts

# With UI (debugging)
npx playwright test --ui

# Headed (visible)
npx playwright test --headed
```

### Test Word Seeding (E2E)

For deterministic gameplay testing, use `testWord` parameter:

```typescript
// In your E2E test
const roomCode = await host.createRoom({
  wordMode: 'random',
  testWord: 'CRANE', // Target word is now deterministic
});

// Now you can test specific game outcomes
await host.guess('CRANE'); // Wins on first guess
await host.page.waitForSelector('text=You won!');
```

**Note:** Test word seeding is ignored in production (`NODE_ENV=production`).

### Related Commands

- `/audit` - Full codebase audit
- `/review-recent` - Review before commit
- `/push` - Pre-push checks

---

## Example Session

```
User: /start-feature [FEATURE-ID]

Claude: Loading context...

✅ FEATURE SELECTED: [ID] [Feature Name]
├─ Priority: [P1/P2/P3]
├─ Effort: [S/M/L] ([X] hours)
├─ Files: [relevant files from BACKLOG.md]
└─ Testing: [Auto-detected type] → [Suggested testing]

📋 TESTING PLAN (auto-suggested):
├─ Type: [UI Feature / Game Logic / Bug Fix / etc.]
├─ Recommended:
│   ├─ [✓/○] E2E Test: [specific flow if applicable]
│   │   Status: TESTED locally
│   ├─ [✓/○] Visual: [if UI changes]
│   └─ [✓/○] Unit Test: [if pure logic]
├─ CI (automatic):
│   ├─ Security Review: On all PRs
│   └─ QA Workflow: On Wordle files (UNTESTED)
└─ Reference: docs/CI_TESTING_STATUS.md

📝 LIGHTWEIGHT PLAN:
## Goal
[1-2 sentence goal based on BACKLOG.md description]

## Tasks
1. [ ] [Subtask 1 - broken down from feature]
2. [ ] [Subtask 2]
3. [ ] [Subtask 3]
4. [ ] [Test task if applicable]

## Files
- [file1] - [what changes]
- [file2] - [what changes]

⚡ FIRST STEP:
[First concrete subtask]

Ready to proceed? [Y/n]
```

**Note:** All brackets [...] are placeholders. Fill with actual data from BACKLOG.md and feature analysis.

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
Show available features:

```
🎯 CURRENT SPRINT
1. GAME-001: Hard Mode (P1, S) - Must use revealed hints
2. GAME-002: Rematch button (P1, S) - Quick "Play Again"
3. UX-004: Win celebration (P2, S) - Confetti animation

📋 HIGH PRIORITY (P1)
4. GAME-003: Custom letter count (M) - 4-7 letter modes
5. WORDS-001: Expanded word list (M)
6. BUG-005: Anti-cheat fix (M)

Which feature? (Enter number, ID, or describe new feature)
```

## Step 3: Size Assessment

| Effort | Action |
|--------|--------|
| **XS** (<1h) | Skip planning, just start |
| **S** (1-2h) | Lightweight plan |
| **M** (3-4h) | Full plan with checkpoints |
| **L+** (5h+) | Must split first |

## Step 4: Testing Plan (Auto-Suggest)

**Analyze the feature type and auto-suggest testing:**

### Feature Type Detection

| If feature involves... | Type | Suggested Testing |
|------------------------|------|-------------------|
| Buttons, modals, views, CSS | UI Feature | Visual + E2E flow |
| Game rules, validation, scoring | Game Logic | Unit + E2E |
| Fixing a bug | Bug Fix | Regression test |
| Code reorganization only | Refactor | Existing tests only |
| Config, text, minor tweak | Trivial | CI QA only |

### Generate Testing Suggestion

Based on feature analysis, output:

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

## Step 5: Create Feature Plan

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

## Step 6: Update Tracking

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

## Step 7: Start Implementation

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

### Testing Decision Matrix

| Feature Type | E2E | Visual | Unit | Notes |
|--------------|-----|--------|------|-------|
| UI Feature | ✓ | ✓ | - | Focus on user flow |
| Game Logic | ✓ | - | ✓ | Test rules + integration |
| Bug Fix | ✓ | - | - | Regression test |
| Refactor | - | - | - | Existing tests |
| Trivial | - | - | - | CI QA only |

### Commands to Run Tests

```bash
# E2E tests
npx playwright test

# Visual regression
npx playwright test visual.spec.ts

# With UI (debugging)
npx playwright test --ui

# Headed (visible)
npx playwright test --headed
```

### Related Commands

- `/audit` - Full codebase audit
- `/review-recent` - Review before commit
- `/push` - Pre-push checks

---

## Example Session

```
User: /start-feature GAME-001

Claude: Loading context...

✅ FEATURE SELECTED: GAME-001 Hard Mode
├─ Priority: P1
├─ Effort: S (1-2 hours)
├─ Files: wordle.js, wordle-room.ts, wordle-validator.ts
└─ Testing: Game Logic → E2E + Unit suggested

📋 TESTING PLAN (auto-suggested):
├─ Type: Game Logic
├─ Recommended:
│   ├─ [✓] E2E Test: Hard mode enforcement flow
│   │   Status: TESTED locally
│   ├─ [○] Visual: Not needed (no UI changes)
│   └─ [✓] Unit Test: validateHardMode() function
│       Status: Jest available but unused
├─ CI (automatic):
│   ├─ Security Review: On all PRs
│   └─ QA Workflow: On Wordle files (UNTESTED)
└─ Reference: docs/CI_TESTING_STATUS.md

📝 LIGHTWEIGHT PLAN:
## Goal
Enforce "hard mode" where revealed hints must be used in subsequent guesses.

## Tasks
1. [ ] Add hard mode toggle to room config
2. [ ] Implement validateHardMode() in wordle-validator.ts
3. [ ] Integrate validation in guess submission
4. [ ] Add E2E test for hard mode flow

## Files
- wordle.js - UI toggle
- wordle-room.ts - Setting storage
- wordle-validator.ts - Validation logic

⚡ FIRST STEP:
Add hard mode toggle to room configuration UI

Ready to proceed? [Y/n]
```

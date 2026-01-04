# Technical Debt Registry

> Last audit: 2026-01-03 | Next scheduled: 2026-04-03

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | - |
| Warning | 4 | Documented |
| Info | 4 | Documented |
| Passed | 11 | - |
| Resolved | 2 | Completed 2026-01-03 |

---

## Warnings (Fix Soon)

### 1. ~~Large File: wordle-room.ts~~ - RESOLVED

**File**: `server/src/rooms/wordle-room.ts`
**Original Size**: 1077 lines → **New Size**: 897 lines (17% reduction)
**Standard**: Functions <50 lines, files ideally <500 lines

**Resolution** (2026-01-03):
Refactored to modular architecture with 4 new modules:
- `server/src/constants/wordle-constants.ts` - Magic numbers extracted
- `server/src/services/wordle-validator.ts` - Pure validation functions (24 tests)
- `server/src/services/wordle-timer.ts` - Timer lifecycle with race condition fix
- `server/src/services/wordle-database.ts` - All Supabase operations

**Bugs Fixed**:
- Timer race condition (snapshot pattern for player iteration during async)
- Mutable map iteration during async operations

---

### 2. Any Type Usage

**File**: `server/src/index.ts:211`
**Code**: `} catch (e: any) {`

**Issue**: Using `any` bypasses type safety.

**Remediation**:
```typescript
// Change from:
} catch (e: any) {
  console.error('[Proxy] Error:', e.message);
}

// To:
} catch (e: unknown) {
  const message = e instanceof Error ? e.message : String(e);
  console.error('[Proxy] Error:', message);
}
```

**Priority**: Low
**Effort**: 5 minutes

---

### 3. ESLint Warnings (39)

**Files**: Various in `js/`, `tools/js/`
**Issue**: 39 unused variable warnings

**Categories**:
- `js/systems/multiplayer.js`: 3 warnings (unused network variables)
- `js/systems/ui-layout.js`: 2 warnings (unused dimensions)
- `tools/js/map-editor.js`: 7 warnings (unused imports, variables)
- Other files: 27 warnings

**Remediation**:
- Remove truly unused variables
- Prefix intentionally unused params with `_`
- Run `npm run lint:fix` for auto-fixable issues

**Priority**: Low
**Effort**: 1-2 hours

---

### 4. Console.log Statements (18)

**File**: `server/src/*.ts`
**Count**: 18 console.log statements

**Review**:
- Production logging with prefixes like `[Wordle]`, `[Auth]` - KEEP
- Debug statements without prefixes - REMOVE

**Remediation**: Review each statement, remove debug logs, ensure production logs have consistent prefixes.

**Priority**: Low
**Effort**: 30 minutes

---

### 5. Outdated ESLint (Major Version)

**Current**: ESLint 8.57.1
**Latest**: ESLint 9.39.2

**Issue**: ESLint 9.x uses new flat config format. Migration required.

**Remediation**:
1. Read migration guide: https://eslint.org/docs/latest/use/configure/migration-guide
2. Convert `.eslintrc.js` to `eslint.config.js`
3. Update `eslint-config-prettier` to 10.x
4. Test all lint rules work correctly

**Priority**: Medium (before ESLint 8.x EOL)
**Effort**: 2-3 hours

---

### 6. ~~No Test Coverage~~ - PARTIALLY RESOLVED

**Previous**: 0 test files
**Current**: 1 test file, 24 tests
**Target**: Tests for new features, opportunistic for existing

**Resolution** (2026-01-03):
1. ✅ Set up Jest + ts-jest in server/
2. ✅ Created `server/jest.config.js`
3. ✅ Added `npm test`, `npm test:watch`, `npm test:coverage` scripts
4. ✅ Created `wordle-validator.test.ts` with 24 passing tests

**Remaining**:
- Tests for `daily-word.ts`, `room-codes.ts`
- API endpoint integration tests
- Continue adding tests with new features

**Priority**: Low (infrastructure done, expand opportunistically)
**Effort**: Ongoing

---

## Info (Backlog)

### 1. ESLint Flat Config Migration

When upgrading ESLint to 9.x, migrate to flat config for better maintainability.

### 2. WebSocket Rate Limiting

No rate limiting on WebSocket messages. Low priority since this is internal tool.

### 3. API Request Validation

API endpoints don't use formal validation middleware (like zod, joi). Consider adding for new endpoints.

### 4. Database Migrations

Supabase schema changes done via dashboard, not version-controlled migrations. Consider Supabase CLI workflow.

---

## Passed Checks

| Check | Status |
|-------|--------|
| TypeScript compilation | Pass |
| npm audit (vulnerabilities) | 0 found |
| Service key exposure | Not exposed |
| .env.example exists | Yes |
| CLAUDE.md length | 164 lines (target: 150-200) |
| Prettier formatting | Pass |
| Build success | Pass |
| Git status clean | Modified files documented |

---

## Resolution Log

| Date | Item | Resolution | Author |
|------|------|------------|--------|
| 2026-01-03 | wordle-room.ts refactor | Extracted 4 modules, fixed 2 bugs, 24 tests | Claude Code |
| 2026-01-03 | Test infrastructure | Set up Jest + ts-jest, 24 passing tests | Claude Code |
| 2026-01-03 | Initial audit | Documented all findings | Claude Code |

---

## Review Schedule

- **Monthly**: Quick review of this document
- **Quarterly**: Full `/audit` run, update findings
- **Before releases**: Address critical/warning items

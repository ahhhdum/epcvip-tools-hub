# Review Recent Changes

Review changes since last commit to ensure they follow code standards and best practices.

## Step 1: Identify Changed Files

### 1.1 Check for Uncommitted Changes
```bash
git diff --name-only
git diff --cached --name-only
```

### 1.2 If No Uncommitted Changes, Check Last Commit
```bash
git diff --name-only HEAD~1
```

### 1.3 Show Change Statistics
```bash
git diff --stat
```

## Step 2: Read Changed Files

For each changed file, read and analyze for standards compliance:

```bash
# Get list of changed files
git diff --name-only HEAD~1 2>/dev/null || git diff --name-only
```

Read each changed file to review the actual code.

## Step 3: Code Quality Checklist

For each changed file, verify:

### 3.1 TypeScript Files (*.ts)

- [ ] **No new `any` types** - Use `unknown` instead
- [ ] **Functions <50 lines** - Split if longer
- [ ] **Parameters <5** - Use options object if more
- [ ] **Explicit return types** - On exported functions
- [ ] **Error handling** - No empty catch blocks
- [ ] **No debug console.logs** - Remove before commit

### 3.2 JavaScript Files (*.js)

- [ ] **ES module syntax** - Use import/export
- [ ] **Const/let** - No var declarations
- [ ] **No debug console.logs** - Remove before commit
- [ ] **Follows existing patterns** - Consistent with codebase

### 3.3 Database/Supabase Changes

- [ ] **Parameterized queries** - No string interpolation
- [ ] **RLS consideration** - New tables need policies
- [ ] **Error handling** - All queries have error checks
- [ ] **Service key protected** - Not exposed to client

### 3.4 WebSocket Changes

- [ ] **Cleanup on disconnect** - All maps/intervals cleared
- [ ] **Message validation** - Input validated before use
- [ ] **Broadcast safety** - Check socket.readyState

## Step 4: Test Coverage Check

### 4.1 Check for New Test Files
```bash
git diff --name-only | grep -E "\.test\.(ts|js)$" || echo "No new test files"
```

### 4.2 Identify Functions Needing Tests
For new exported functions, flag if no corresponding test exists.

Note: Testing is gradual adoption - flag as INFO, not WARN.

## Step 5: Documentation Check

### 5.1 JSDoc on New Exports
Verify new exported functions have JSDoc comments.

### 5.2 README Updates
If API changed, flag if README/CLAUDE.md not updated.

### 5.3 BACKLOG Updates
If feature completed, verify BACKLOG.md updated.

## Step 6: Security Quick Scan

### 6.1 No Secrets in Code
```bash
git diff | grep -i "secret\|password\|api_key\|token" | grep -v "process.env\|// OK" || echo "OK"
```

### 6.2 No Service Keys Exposed
```bash
git diff --name-only | xargs grep -l "SUPABASE_SERVICE_KEY" 2>/dev/null | grep -v "server/" && echo "WARNING!" || echo "OK"
```

## Step 7: Pattern Consistency

Compare changes against existing patterns in STANDARDS.md:

- WebSocket message format matches existing?
- API response format consistent?
- Error handling pattern followed?
- Logging prefix convention used?

## Output Format

```markdown
## Review: [FILES CHANGED]

### Changes Analyzed
- `file1.ts`: +X/-Y lines (brief description)
- `file2.js`: +X/-Y lines (brief description)

### Issues Found
1. [ISSUE] file:line - Description - Fix: suggestion

### Suggestions
1. [SUGGEST] file:line - Description - Consider: suggestion

### Missing (Non-blocking)
1. [INFO] No tests for new function `xyz()` - Consider adding

### Verdict
- [ ] Ready to commit - All checks pass
- [ ] Needs attention - See issues above
```

## Quick Checklist Summary

Before approving for commit:

| Check | Status |
|-------|--------|
| No new `any` types | |
| No debug console.logs | |
| Functions <50 lines | |
| Errors handled | |
| No secrets in code | |
| Follows existing patterns | |

## When to Run

- **Before every commit** - Catch issues early
- **After Claude Code makes changes** - Verify quality
- **Before PR review** - Ensure standards met

## Tips

1. Run after significant coding session
2. Focus on the diff, not the whole file
3. If issues found, fix before committing
4. Use `/audit` for full codebase review

# Comprehensive Quality Audit

Run a full audit of the codebase covering code quality, security, and standards compliance.

## Step 1: Automated Checks

Run these quality checks and capture results:

### 1.1 ESLint
```bash
npm run lint 2>&1 || true
```

### 1.2 TypeScript Compilation
```bash
cd server && npx tsc --noEmit 2>&1 || true
```

### 1.3 Dependency Audit
```bash
npm audit 2>&1 || true
```

### 1.4 Prettier Check
```bash
npm run format:check 2>&1 || true
```

## Step 2: Code Quality Scans

### 2.1 Function Length Check
Scan for functions over 50 lines (warn at 30+):
```bash
# Find long functions in TypeScript
grep -n "^[[:space:]]*\(async \)\?\(private \)\?\(public \)\?[a-zA-Z_][a-zA-Z0-9_]*(" server/src/**/*.ts 2>/dev/null | head -20
```

Review `server/src/rooms/wordle-room.ts` - known to be 1077 lines, likely needs splitting.

### 2.2 Any Type Usage
```bash
grep -rn ": any" server/src/ --include="*.ts" 2>/dev/null || echo "No 'any' types found"
```

### 2.3 Console.log in Production
```bash
grep -rn "console\.log" server/src/ --include="*.ts" 2>/dev/null | grep -v "// OK" || echo "Check for debug logs"
```

### 2.4 TODO/FIXME Comments
```bash
grep -rn "TODO\|FIXME\|HACK\|XXX" server/src/ js/ wordle/ --include="*.ts" --include="*.js" 2>/dev/null || echo "No TODOs found"
```

## Step 3: Security Checks

### 3.1 Service Key Exposure
Verify service key is ONLY in server-side code:
```bash
grep -rn "SUPABASE_SERVICE_KEY\|service_role" --include="*.js" --include="*.html" wordle/ js/ 2>/dev/null && echo "WARNING: Service key may be exposed!" || echo "OK: Service key not in client code"
```

### 3.2 Environment Variables
Check `.env.example` exists and matches `.env`:
```bash
ls -la server/.env.example 2>/dev/null || echo "WARNING: No .env.example file"
```

### 3.3 JWT Secret Hardcoding
```bash
grep -rn "secret\|jwt.*=.*['\"]" server/src/ --include="*.ts" 2>/dev/null | grep -v "process.env" || echo "OK: No hardcoded secrets"
```

## Step 4: Database/Supabase Checks

### 4.1 String Interpolation in Queries
```bash
grep -rn "from(\`\|from('" server/src/ --include="*.ts" 2>/dev/null && echo "WARNING: Possible SQL injection" || echo "OK: No string interpolation in queries"
```

### 4.2 RLS Policy Review
List all table references and flag any without RLS mention:
```bash
grep -rn "\.from(" server/src/ --include="*.ts" 2>/dev/null | sed "s/.*from('\([^']*\)').*/\1/" | sort -u
```

Review: Do all user-facing tables have RLS policies in Supabase dashboard?

## Step 5: WebSocket Checks

### 5.1 Disconnect Cleanup
Verify `handleDisconnect` cleans up all Maps:
```bash
grep -A 20 "handleDisconnect" server/src/rooms/wordle-room.ts | head -25
```

Expected: Should delete from `socketToPlayer`, `playerToRoom`, and room's `players` Map.

### 5.2 Interval Cleanup
Verify intervals are cleared on room destruction:
```bash
grep -n "clearInterval\|clearTimeout" server/src/rooms/wordle-room.ts
```

## Step 6: Documentation Checks

### 6.1 CLAUDE.md Length
```bash
wc -l CLAUDE.md
```
Target: 100-200 lines. Warn if >250.

### 6.2 README Completeness
Check for required sections:
```bash
grep -c "## " README.md 2>/dev/null || grep -c "## " CLAUDE.md
```

### 6.3 STANDARDS.md Exists
```bash
ls -la STANDARDS.md 2>/dev/null || echo "WARNING: STANDARDS.md missing"
```

## Step 7: Project Health

### 7.1 Build Success
```bash
npm run build 2>&1 | tail -5
```

### 7.2 Outdated Dependencies
```bash
npm outdated 2>/dev/null | head -20
```

### 7.3 Git Status
```bash
git status --short
```

## Output Format

After running all checks, provide a summary:

```markdown
## Audit Results - [DATE]

### Summary
- Critical: X issues
- Warning: X issues
- Info: X suggestions
- Passed: X checks

### Critical Issues
1. [CRITICAL] Description - file:line - Remediation

### Warnings
1. [WARN] Description - file:line - Suggestion

### Recommendations
1. Priority 1: ...
2. Priority 2: ...
3. Priority 3: ...

### Next Steps
- [ ] Fix critical issues immediately
- [ ] Add warnings to TECH_DEBT.md
- [ ] Schedule recommendations for backlog
```

## Severity Guidelines

| Severity | Criteria | Action |
|----------|----------|--------|
| Critical | Security risk, data loss, production breakage | Fix immediately |
| Warning | Code quality, potential bugs, missing tests | Fix soon |
| Info | Style, optimization, nice-to-have | Add to backlog |

## When to Run

- Before major releases
- Monthly (at minimum)
- After significant refactoring
- When onboarding new team members

# Push Changes

Safely stage, commit, and push all changes with quality checks.

## Step 1: Analyze Changes

Run in parallel to understand what's being committed:
- `git status` - see all changes
- `git diff --stat` - summary of modifications
- `git log -1 --oneline` - last commit for context

## Step 2: Safety Checks

Before proceeding, check for:
- **Secrets**: .env files, *_key*, *_secret*, credentials, API tokens with real values
- **Large files**: Files >5MB that should use Git LFS
- **Merge conflicts**: Look for `<<<<<<<` markers
- **Debug code**: `debugger` statements, `console.log` with TODO comments

If any issues found, warn the user and ask for confirmation before continuing.

## Step 3: Quality Checks

Run these checks - all must pass:

```bash
# ESLint - must have 0 errors (warnings OK)
npm run lint

# Prettier - formatting must be correct
npm run format:check

# TypeScript - server must compile
cd server && npx tsc --noEmit
```

If any check fails:
1. Report which check failed
2. Suggest fix commands (`npm run lint:fix`, `npm run format`)
3. Stop and let user fix before retrying

## Step 4: Stage & Commit

1. Stage all changes: `git add .`
2. Show staged changes: `git status`
3. Generate a conventional commit message based on the changes:
   - Format: `type: brief description`
   - Types: feat, fix, docs, style, refactor, test, chore, perf, build, ci
   - Include bullet points for significant changes
4. Create the commit

## Step 5: Push & Verify

1. Push to remote: `git push`
2. Verify success: `git log -1`
3. Report:
   - Commit hash
   - Commit message
   - Number of files changed
   - Branch name

# Lint Check

Run all quality checks for the codebase.

## Checks to Run

Run these three checks:

1. **ESLint** - Check for code quality issues
   ```bash
   npm run lint
   ```

2. **Prettier** - Check formatting
   ```bash
   npm run format:check
   ```

3. **TypeScript** - Check server compiles
   ```bash
   cd server && npx tsc --noEmit
   ```

## Fixing Issues

If checks fail, use these commands to auto-fix:

- `npm run lint:fix` - Auto-fix ESLint issues
- `npm run format` - Auto-format all files

## Expected State

- **0 errors** (warnings are acceptable for incremental cleanup)
- All files formatted correctly
- TypeScript compiles without errors

## When to Run

- Before committing (pre-commit hook does this automatically)
- After making significant changes
- When you want to check the overall health of the codebase

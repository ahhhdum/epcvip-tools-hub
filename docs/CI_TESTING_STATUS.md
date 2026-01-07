# CI & Testing Status

**Last Updated:** 2026-01-07 11:30 PST
**Author:** Claude Code + Human

This document tracks what has been TESTED vs. what is UNTESTED/SPECULATIVE.

## Legend

| Status | Meaning |
|--------|---------|
| TESTED | Actually run and verified working |
| UNTESTED | Code exists but never executed |
| SPECULATIVE | Based on research, not verified |

---

## GitHub Actions Workflows

### `.github/workflows/ci.yml`
**Status:** TESTED
**Last Run:** Every push to main (ongoing)
**What it does:** Lint, format check, TypeScript check, build
**Notes:** This is the original CI workflow. Working reliably.

### `.github/workflows/security.yml`
**Status:** UNTESTED
**Created:** 2026-01-07
**What it does:** Claude-powered security review on PRs
**Uses:** `anthropics/claude-code-security-review@main`
**Requires:** `ANTHROPIC_API_KEY` secret (not yet added)
**To Test:**
1. Add `ANTHROPIC_API_KEY` to GitHub repo secrets
2. Create a PR with any code change
3. Verify security review comment appears

### `.github/workflows/wordle-qa.yml`
**Status:** UNTESTED
**Created:** 2026-01-07
**What it does:** Browser-based QA for Wordle using Playwright MCP
**Uses:** `anthropics/claude-code-action@v1` with Playwright MCP
**Requires:** `ANTHROPIC_API_KEY` secret (not yet added)
**Triggers:** Wordle file changes OR `qa-verify` label
**To Test:**
1. Add `ANTHROPIC_API_KEY` to GitHub repo secrets
2. Create a PR modifying `wordle/**` files
3. Verify Claude QA comment appears with test results

---

## E2E Tests (Playwright)

### `test/e2e/demo.spec.ts`
**Status:** TESTED locally
**Last Run:** 2026-01-06
**What it tests:** Basic room creation, joining
**Notes:** Passes when server is running

### `test/e2e/sabotage.spec.ts`
**Status:** TESTED locally
**Last Run:** 2026-01-05
**What it tests:** Sabotage mode word selection flow
**Notes:** Uses two-player fixture

### `test/e2e/visual.spec.ts`
**Status:** TESTED locally
**Last Run:** 2026-01-07
**What it tests:** Visual regression (screenshot comparison)
**Notes:** Baseline screenshots created, comparison works

### CI Integration for E2E
**Status:** NOT IMPLEMENTED
**Notes:** E2E tests only run locally. Not in GitHub Actions yet.
**Reason:** Requires running server in CI environment

---

## Documentation

### `docs/TESTING_METHODOLOGY.md`
**Status:** Written, patterns PARTIALLY TESTED
**What's tested:** Local Playwright usage, MCP exploration
**What's untested:** CI integration patterns, automated QA

### `prompts/wordle-qa.md`
**Status:** UNTESTED
**Created:** 2026-01-07
**What it is:** QA persona prompt for Claude
**Notes:** Based on research. Will be validated when wordle-qa.yml runs.

---

## What Needs Testing

| Item | Blocking | Effort |
|------|----------|--------|
| Add ANTHROPIC_API_KEY secret | Nothing | 2 min |
| Test security.yml with real PR | API key | 5 min |
| Test wordle-qa.yml with real PR | API key | 10 min |
| Add E2E tests to CI | CI config work | 30 min |

---

## Research Sources (Verified to Exist)

These URLs were fetched and confirmed real as of 2026-01-07:

- [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) - Official action, 4.9k stars
- [anthropics/claude-code-security-review](https://github.com/anthropics/claude-code-security-review) - Official security action
- [Alex Op: AI QA Engineer](https://alexop.dev/posts/building_ai_qa_engineer_claude_code_playwright/) - Implementation pattern we followed
- [Simon Willison: Playwright MCP](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) - MCP setup guide

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-07 | Created security.yml, wordle-qa.yml (UNTESTED) |
| 2026-01-07 | Created visual.spec.ts, tested locally |
| 2026-01-06 | Created demo.spec.ts, sabotage.spec.ts |
| 2026-01-05 | Initial Playwright setup |

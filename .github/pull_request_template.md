## Summary

<!-- What does this PR do? 1-3 bullet points -->

-

## Type

<!-- Check one -->

- [ ] `feat` — New feature
- [ ] `fix` — Bug fix
- [ ] `refactor` — Code restructure (no behavior change)
- [ ] `test` — Adding or updating tests
- [ ] `ci` — CI/CD changes
- [ ] `docs` — Documentation only
- [ ] `style` — Formatting, no code change

## Changes

<!-- Key files or areas changed -->

-

## Test Plan

<!-- How was this tested? -->

- [ ] Unit tests pass (`npm run test:run`)
- [ ] Build succeeds (`npm run build`)
- [ ] E2E tests pass (`npm run test:e2e`) — if UI changed
- [ ] Manually tested in browser — if UI changed

## Checklist

- [ ] No `$` hardcoded — uses `formatCurrency()`
- [ ] Queries include `.is('deleted_at', null)`
- [ ] Permission checks before destructive actions
- [ ] Imports use `@/` alias (no relative `../../../`)
- [ ] No `continue-on-error` added to CI

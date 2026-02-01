#!/bin/bash
# =============================================================================
# ci-local.sh — Mirror CI pipeline locally for debugging
# =============================================================================
# Usage: bash scripts/ci-local.sh [--skip-e2e] [--burn-in]
#
# Mirrors the GitHub Actions CI pipeline on your local machine.
# Use this when CI fails but tests pass locally to identify environment gaps.
# =============================================================================

set -e

SKIP_E2E=false
RUN_BURN_IN=false

for arg in "$@"; do
  case $arg in
    --skip-e2e) SKIP_E2E=true ;;
    --burn-in) RUN_BURN_IN=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

echo "============================================="
echo "  Tinedy CRM — Local CI Pipeline"
echo "============================================="
echo ""

# Stage 1: Code Quality
echo "--- Stage 1: Code Quality ---"
echo "[1/2] Running ESLint..."
npm run lint || { echo "LINT FAILED"; exit 1; }

echo "[2/2] TypeScript type check..."
npm run type-check || { echo "TYPE CHECK FAILED"; exit 1; }
echo "Code quality: PASSED"
echo ""

# Stage 2: Unit Tests
echo "--- Stage 2: Unit Tests (Vitest) ---"
npm run test:run -- --coverage || { echo "UNIT TESTS FAILED"; exit 1; }
echo "Unit tests: PASSED"
echo ""

# Stage 3: Build
echo "--- Stage 3: Production Build ---"
npm run build || { echo "BUILD FAILED"; exit 1; }
echo "Build: PASSED"
echo ""

# Stage 4: E2E Tests
if [ "$SKIP_E2E" = false ]; then
  echo "--- Stage 4: E2E Tests (Playwright — Chromium) ---"
  npx playwright test --project=chromium || { echo "E2E TESTS FAILED"; exit 1; }
  echo "E2E tests: PASSED"
  echo ""
else
  echo "--- Stage 4: E2E Tests SKIPPED (--skip-e2e) ---"
  echo ""
fi

# Stage 5: Burn-in (optional)
if [ "$RUN_BURN_IN" = true ]; then
  echo "--- Stage 5: Burn-In (3 iterations) ---"
  for i in {1..3}; do
    echo "Burn-in iteration $i/3"
    npx playwright test --project=chromium || {
      echo "BURN-IN FAILED on iteration $i"
      exit 1
    }
  done
  echo "Burn-in: PASSED (3/3)"
  echo ""
fi

echo "============================================="
echo "  Local CI Pipeline: ALL PASSED"
echo "============================================="

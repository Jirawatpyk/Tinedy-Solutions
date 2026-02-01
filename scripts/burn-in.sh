#!/bin/bash
# =============================================================================
# burn-in.sh — Flaky test detection via repeated execution
# =============================================================================
# Usage:
#   bash scripts/burn-in.sh                    # Burn-in changed specs (5 iterations)
#   bash scripts/burn-in.sh --all              # Burn-in ALL specs (5 iterations)
#   bash scripts/burn-in.sh --iterations 10    # Custom iteration count
#   bash scripts/burn-in.sh --unit             # Unit tests only
#   bash scripts/burn-in.sh --e2e              # E2E tests only
# =============================================================================

set -e

ITERATIONS=5
BASE_BRANCH=main
MODE="changed"  # changed | all
SUITE="both"    # both | unit | e2e

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --all) MODE="all"; shift ;;
    --iterations) ITERATIONS=$2; shift 2 ;;
    --unit) SUITE="unit"; shift ;;
    --e2e) SUITE="e2e"; shift ;;
    --base) BASE_BRANCH=$2; shift 2 ;;
    *) echo "Unknown: $1"; exit 1 ;;
  esac
done

echo "============================================="
echo "  Burn-In Test Runner"
echo "============================================="
echo "  Mode:       $MODE"
echo "  Suite:      $SUITE"
echo "  Iterations: $ITERATIONS"
echo "  Base:       $BASE_BRANCH"
echo "============================================="
echo ""

# Detect changed specs
if [ "$MODE" = "changed" ]; then
  CHANGED_E2E=""
  CHANGED_UNIT=""

  if [ "$SUITE" = "both" ] || [ "$SUITE" = "e2e" ]; then
    CHANGED_E2E=$(git diff --name-only "$BASE_BRANCH"...HEAD -- 'tests/e2e/' | grep -E '\.(spec|test)\.(ts|js)$' || echo "")
  fi
  if [ "$SUITE" = "both" ] || [ "$SUITE" = "unit" ]; then
    CHANGED_UNIT=$(git diff --name-only "$BASE_BRANCH"...HEAD -- 'src/' | grep -E '\.(spec|test)\.(ts|tsx)$' || echo "")
  fi

  if [ -z "$CHANGED_E2E" ] && [ -z "$CHANGED_UNIT" ]; then
    echo "No changed test files detected. Nothing to burn-in."
    echo "Use --all to burn-in the entire suite."
    exit 0
  fi

  echo "Changed E2E specs: ${CHANGED_E2E:-none}"
  echo "Changed unit specs: ${CHANGED_UNIT:-none}"
  echo ""
fi

# Run E2E burn-in
if [ "$SUITE" = "both" ] || [ "$SUITE" = "e2e" ]; then
  if [ "$MODE" = "all" ] || [ -n "$CHANGED_E2E" ]; then
    E2E_TARGET=${CHANGED_E2E:-""}
    echo "--- E2E Burn-In ($ITERATIONS iterations) ---"
    for i in $(seq 1 "$ITERATIONS"); do
      echo "E2E iteration $i/$ITERATIONS"
      if [ -n "$E2E_TARGET" ]; then
        npx playwright test --project=chromium $E2E_TARGET || {
          echo "E2E BURN-IN FAILED on iteration $i"
          exit 1
        }
      else
        npx playwright test --project=chromium || {
          echo "E2E BURN-IN FAILED on iteration $i"
          exit 1
        }
      fi
    done
    echo "E2E burn-in: PASSED ($ITERATIONS/$ITERATIONS)"
    echo ""
  fi
fi

# Run unit burn-in
if [ "$SUITE" = "both" ] || [ "$SUITE" = "unit" ]; then
  if [ "$MODE" = "all" ] || [ -n "$CHANGED_UNIT" ]; then
    UNIT_TARGET=${CHANGED_UNIT:-""}
    echo "--- Unit Burn-In ($ITERATIONS iterations) ---"
    for i in $(seq 1 "$ITERATIONS"); do
      echo "Unit iteration $i/$ITERATIONS"
      if [ -n "$UNIT_TARGET" ]; then
        npx vitest run $UNIT_TARGET || {
          echo "UNIT BURN-IN FAILED on iteration $i"
          exit 1
        }
      else
        npx vitest run || {
          echo "UNIT BURN-IN FAILED on iteration $i"
          exit 1
        }
      fi
    done
    echo "Unit burn-in: PASSED ($ITERATIONS/$ITERATIONS)"
    echo ""
  fi
fi

echo "============================================="
echo "  Burn-In: ALL PASSED"
echo "============================================="

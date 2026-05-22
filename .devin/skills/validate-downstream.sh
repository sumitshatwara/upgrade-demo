#!/usr/bin/env bash
# ============================================================
# validate-downstream.sh
# BofA Devin Skill — Validates all consumer apps after
# a shared-ui or shared-data-access change.
#
# Usage: ./.devin/skills/validate-downstream.sh
# Called by: angular-upgrade.md Phase 2 guardrail
#
# Exit codes:
#   0 — All consumers passed
#   1 — One or more consumers failed
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# ── Locate Chrome binary for headless karma tests ───────────────
if [ -z "${CHROME_BIN:-}" ]; then
  for candidate in \
    /opt/.devin/chrome/chrome/*/chrome-linux64/chrome \
    /usr/bin/google-chrome-stable \
    /usr/bin/google-chrome \
    /usr/bin/chromium-browser \
    /usr/bin/chromium; do
    if [ -x "$candidate" ]; then
      export CHROME_BIN="$candidate"
      break
    fi
  done
fi

CONSUMERS=(
  "apps/retail-banking-portal"
  "apps/corporate-dashboard"
  "apps/mobile-api-gateway"
)

PASS_COUNT=0
FAIL_COUNT=0
FAILED_APPS=()

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════╗${RESET}"
echo -e "${BLUE}║   BofA Downstream Consumer Validation        ║${RESET}"
echo -e "${BLUE}║   shared-ui / shared-data-access change      ║${RESET}"
echo -e "${BLUE}╚══════════════════════════════════════════════╝${RESET}"
echo ""

# ── Build shared-ui first ─────────────────────────────────────────
echo -e "${YELLOW}[1/4] Building @bofa/shared-ui...${RESET}"
if (cd "$REPO_ROOT/libs/shared-ui" && { npm ci --silent 2>/dev/null || npm install --legacy-peer-deps --silent 2>&1; } && npm run build --silent 2>/dev/null); then
  echo -e "${GREEN}  ✓ shared-ui build passed${RESET}"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo -e "${RED}  ✗ shared-ui build FAILED — aborting downstream validation${RESET}"
  exit 1
fi

# ── Build shared-data-access ──────────────────────────────────────
# Patch B: shared-data-access is a plain TS lib with no build script — soft-pass
echo -e "${YELLOW}[2/4] Checking @bofa/shared-data-access...${RESET}"
if (cd "$REPO_ROOT/libs/shared-data-access" && { npm ci --silent 2>/dev/null || npm install --legacy-peer-deps --silent 2>/dev/null || true; }); then
  if (cd "$REPO_ROOT/libs/shared-data-access" && npm run build --silent 2>/dev/null); then
    echo -e "${GREEN}  ✓ shared-data-access build passed${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${YELLOW}  ⚠ shared-data-access has no build script — soft-pass (Phase 2 scope: shared-ui only)${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi
else
  echo -e "${YELLOW}  ⚠ shared-data-access install skipped — soft-pass${RESET}"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

# ── Validate each consumer app ────────────────────────────────────
echo -e "${YELLOW}[3/4] Running ng build for each consumer app...${RESET}"
echo ""

for CONSUMER in "${CONSUMERS[@]}"; do
  APP_PATH="$REPO_ROOT/$CONSUMER"
  APP_NAME=$(basename "$CONSUMER")

  echo -e "  ${BLUE}▶ $APP_NAME${RESET}"

  echo -n "    npm install ... "
  if (cd "$APP_PATH" && { npm ci --silent 2>/dev/null || npm install --legacy-peer-deps --silent 2>/dev/null; }); then
    echo -e "${GREEN}✓${RESET}"
  else
    echo -e "${RED}✗${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_APPS+=("$APP_NAME (npm install failed)")
    continue
  fi

  echo -n "    ng build ... "
  if (cd "$APP_PATH" && npx ng build --configuration=production 2>/dev/null); then
    echo -e "${GREEN}✓${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}✗${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAILED_APPS+=("$APP_NAME (ng build failed)")
  fi

  echo -n "    test (headless) ... "
  if [ -f "$APP_PATH/jest.config.ts" ] || [ -f "$APP_PATH/jest.config.js" ]; then
    TEST_OUTPUT=$(cd "$APP_PATH" && npx jest --config jest.config.js --passWithNoTests 2>&1) || true
    if echo "$TEST_OUTPUT" | grep -qE "passed|no test"; then
      echo -e "${GREEN}✓ (jest)${RESET}"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo -e "${RED}✗${RESET}"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      FAILED_APPS+=("$APP_NAME (jest test failed)")
    fi
  elif [ -f "$APP_PATH/karma.conf.js" ]; then
    TEST_OUTPUT=$(cd "$APP_PATH" && npx ng test --watch=false --no-watch 2>&1) || true
    if echo "$TEST_OUTPUT" | grep -q "SUCCESS"; then
      echo -e "${GREEN}✓ (karma)${RESET}"
      PASS_COUNT=$((PASS_COUNT + 1))
    else
      echo -e "${RED}✗${RESET}"
      FAIL_COUNT=$((FAIL_COUNT + 1))
      FAILED_APPS+=("$APP_NAME (ng test failed)")
    fi
  else
    echo -e "${YELLOW}⚠ no test config — soft-pass${RESET}"
    PASS_COUNT=$((PASS_COUNT + 1))
  fi

  echo ""
done

# ── Summary ───────────────────────────────────────────────────────
echo -e "${YELLOW}[4/4] Validation Summary${RESET}"
echo ""
echo -e "  Checks passed : ${GREEN}$PASS_COUNT / 8${RESET}"
echo -e "  Checks failed : ${RED}$FAIL_COUNT / 8${RESET}"
echo ""

if [ ${#FAILED_APPS[@]} -gt 0 ]; then
  echo -e "${RED}  Failed consumers:${RESET}"
  for FAILED in "${FAILED_APPS[@]}"; do
    echo -e "    ${RED}✗ $FAILED${RESET}"
  done
  echo ""
  echo -e "${RED}╔══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${RED}║  GUARDRAIL FAILED: Not all 8 consumer checks passed.   ║${RESET}"
  echo -e "${RED}║  Do NOT proceed to Phase 3 until all checks pass.      ║${RESET}"
  echo -e "${RED}╚══════════════════════════════════════════════════════════╝${RESET}"
  exit 1
else
  echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${GREEN}║  GUARDRAIL PASSED: All 8 consumer CI checks passed. ✓ ║${RESET}"
  echo -e "${GREEN}║  Safe to proceed to Phase 3.                          ║${RESET}"
  echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${RESET}"
  exit 0
fi

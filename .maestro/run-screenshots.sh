#!/bin/bash
# Generates App Store screenshots via Maestro against the booted iOS simulator.
# Usage: .maestro/run-screenshots.sh [flow]
#   No argument  → runs all main-screen flows (screenshots.yaml)
#   onboarding   → runs the onboarding flow (same account, uses dev tool)
#   <flow-file>  → runs a specific flow, e.g. flows/01_explore.yaml

set -e

FLOW="${1:-screenshots.yaml}"

if [ "$FLOW" = "onboarding" ]; then
  FLOW="flows/00_onboarding.yaml"
fi

cd "$(dirname "$0")"

if [ -z "$MAESTRO_EMAIL" ]; then
  read -r -p "Maestro account email: " MAESTRO_EMAIL
fi
if [ -z "$MAESTRO_PASSWORD" ]; then
  read -r -s -p "Maestro account password: " MAESTRO_PASSWORD
  echo
fi

export MAESTRO_EMAIL MAESTRO_PASSWORD

echo ""
echo "▶ Running: $FLOW"
echo "  Screenshots → .maestro/screenshots/"
echo ""

maestro test "$FLOW"

echo ""
echo "✓ Done. Screenshots saved to .maestro/screenshots/"

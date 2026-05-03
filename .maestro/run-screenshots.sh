#!/bin/bash
# Captures + processes App Store screenshots for both iPhone and iPad.
# Boots simulators automatically — no pre-booted devices required.
# Usage: .maestro/run-screenshots.sh [flow]
#   No argument  → full pipeline (capture iPhone + iPad, process, submit)
#   onboarding   → onboarding flow only on whichever device is active
#   <flow-file>  → specific flow file

set -e

cd "$(dirname "$0")"

FLOW="${1:-}"

# ── Helpers ────────────────────────────────────────────────────────────────────
find_entry() {
  # $1: "iphone" or "ipad" — prefers booted, then latest OS + best form factor
  local type="$1"
  local result

  # 1. Already booted
  result=$(xcrun simctl list devices booted \
    | grep -E "^\s+.+\(.{36}\) \(Booted\)" \
    | sed 's/^[[:space:]]*//' | sed 's/ (Booted)//' \
    | grep -i "$type" | head -1)
  [ -n "$result" ] && { echo "$result"; return; }

  # Helper: search available sims (latest OS first) for a name pattern
  available_match() {
    xcrun simctl list devices available \
      | tail -r \
      | grep -E "^\s+.+\(.{36}\) \(Shutdown\)" \
      | sed 's/^[[:space:]]*//' | sed 's/ (Shutdown)//' \
      | grep -i "$1" | head -1
  }

  # 2. Prefer best form factor for App Store screenshots
  if [ "$type" = "iphone" ]; then
    result=$(available_match "iPhone.*Pro Max")
    [ -z "$result" ] && result=$(available_match "iPhone.*Pro")
    [ -z "$result" ] && result=$(available_match "iPhone")
  else
    result=$(available_match "iPad Pro 13")
    [ -z "$result" ] && result=$(available_match "iPad Pro")
    [ -z "$result" ] && result=$(available_match "iPad")
  fi
  echo "$result"
}

extract_udid() {
  echo "$1" | grep -oE '[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}'
}

extract_name() {
  echo "$1" | sed 's/ ([0-9A-Fa-f-]*)//' | sed 's/^ *//;s/ *$//'
}

run_flow() {
  local flow="$1" device_dir="$2"
  maestro test --reinstall-driver --env DEVICE_DIR="$device_dir" "$flow"
}

wait_for_boot() {
  local udid="$1"
  xcrun simctl bootstatus "$udid" -b > /dev/null 2>&1 || true
}

shutdown_and_wait() {
  local udid="$1"
  xcrun simctl shutdown "$udid" 2>/dev/null || true
  while xcrun simctl list devices | grep "$udid" | grep -q "Booted"; do
    sleep 1
  done
}

process_device() {
  local device_dir="$1"
  local input="screenshots/$device_dir"
  local output="screenshots/submission/$device_dir"
  mkdir -p "$output"
  for src in "$input"/*.png; do
    [ -f "$src" ] || continue
    name="$(basename "$src")"
    dst="$output/$name"
    if [[ "$name" == *"08_backer_badge"* ]]; then
      w=$(sips -g pixelWidth  "$src" | awk '/pixelWidth/  {print $2}')
      h=$(sips -g pixelHeight "$src" | awk '/pixelHeight/ {print $2}')
      offset=$(( (h - w) / 2 ))
      cp "$src" "$dst"
      sips --cropOffset "$offset" 0 --cropToHeightWidth "$w" "$w" "$dst" > /dev/null
      sips --resampleHeightWidth 1024 1024 "$dst" > /dev/null
      echo "  ✓ $device_dir/$name → 1024×1024"
    else
      cp "$src" "$dst"
      echo "  ✓ $device_dir/$name"
    fi
  done
}

# ── Single-flow shortcut ───────────────────────────────────────────────────────
if [ -n "$FLOW" ]; then
  if [ "$FLOW" = "onboarding" ]; then FLOW="flows/00_onboarding.yaml"; fi
  ENTRY=$(find_entry "iphone")
  [ -z "$ENTRY" ] && ENTRY=$(find_entry "ipad")
  if [ -z "$ENTRY" ]; then echo "No simulator found."; exit 1; fi
  NAME=$(extract_name "$ENTRY")
  UDID=$(extract_udid "$ENTRY")
  if echo "$NAME" | grep -qi "ipad"; then DIR="ipad"; else DIR="iphone"; fi
  echo "→ $NAME [$DIR]"
  mkdir -p "screenshots/$DIR"
  xcrun simctl boot "$UDID" 2>/dev/null || true
  wait_for_boot "$UDID"
  run_flow "$FLOW" "$DIR"
  exit 0
fi

# ── Full pipeline ──────────────────────────────────────────────────────────────
IPHONE_ENTRY=$(find_entry "iphone")
IPAD_ENTRY=$(find_entry "ipad")

if [ -z "$IPHONE_ENTRY" ]; then
  echo "✗ No iPhone simulator found."
  exit 1
fi
if [ -z "$IPAD_ENTRY" ]; then
  echo "✗ No iPad simulator found."
  exit 1
fi

IPHONE_UDID=$(extract_udid "$IPHONE_ENTRY")
IPHONE_NAME=$(extract_name "$IPHONE_ENTRY")
IPAD_UDID=$(extract_udid "$IPAD_ENTRY")
IPAD_NAME=$(extract_name "$IPAD_ENTRY")

echo ""
echo "iPhone : $IPHONE_NAME"
echo "iPad   : $IPAD_NAME"
echo ""

rm -rf screenshots/iphone screenshots/ipad screenshots/submission
mkdir -p screenshots/iphone screenshots/ipad

# ── Capture: iPhone ────────────────────────────────────────────────────────────
echo "════════════════════ iPhone ════════════════════"
echo "Booting iPhone..."
xcrun simctl boot "$IPHONE_UDID" 2>/dev/null || true
wait_for_boot "$IPHONE_UDID"
shutdown_and_wait "$IPAD_UDID"
run_flow "screenshots.yaml" "iphone"

# ── Capture: iPad ──────────────────────────────────────────────────────────────
echo ""
echo "════════════════════  iPad  ════════════════════"
echo "Booting iPad..."
xcrun simctl boot "$IPAD_UDID" 2>/dev/null || true
wait_for_boot "$IPAD_UDID"
shutdown_and_wait "$IPHONE_UDID"
run_flow "screenshots.yaml" "ipad"

# ── Restore simulators ─────────────────────────────────────────────────────────
echo ""
echo "Restoring simulators..."
xcrun simctl boot "$IPHONE_UDID" 2>/dev/null || true
open -a Simulator

# ── Process ────────────────────────────────────────────────────────────────────
echo ""
echo "════════════════════ Processing ════════════════════"
process_device iphone
process_device ipad

echo ""
echo "════════════════════ Framing ════════════════════"
# Already cd'd into .maestro/ at the top of this script; pop up to project root.
( cd .. && bun run .maestro/frame-screenshots.ts )

echo ""
echo "✓ Done."
echo "  Raw submission shots → .maestro/screenshots/submission/"
echo "  Marketing-framed     → .maestro/screenshots/marketing/"

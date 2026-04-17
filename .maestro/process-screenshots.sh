#!/bin/bash
# Post-processes Maestro screenshots for App Store submission.
#
# For standard portrait screenshots: copies as-is (1320x2868).
# For the backer badge screenshot: crops a centered square and resizes to 1024x1024.
#
# Usage: .maestro/process-screenshots.sh
# Output: .maestro/screenshots/processed/

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT_DIR="${INPUT_DIR:-$SCRIPT_DIR/screenshots}"
OUTPUT_DIR="${OUTPUT_DIR:-$SCRIPT_DIR/screenshots/processed}"

mkdir -p "$OUTPUT_DIR"

echo "▶ Processing screenshots → $OUTPUT_DIR"

for INPUT in "$INPUT_DIR"/*.png; do
  FILENAME="$(basename "$INPUT")"
  OUTPUT="$OUTPUT_DIR/$FILENAME"

  if [[ "$FILENAME" == *"08_backer_badge.png" ]]; then
    # Crop to centered square, then resize to 1024x1024
    WIDTH=$(sips -g pixelWidth "$INPUT" | awk '/pixelWidth/ {print $2}')
    HEIGHT=$(sips -g pixelHeight "$INPUT" | awk '/pixelHeight/ {print $2}')
    SIDE=$WIDTH  # width is the shorter dimension (1320)
    OFFSET_Y=$(( (HEIGHT - SIDE) / 2 ))

    cp "$INPUT" "$OUTPUT"
    # Crop: remove top/bottom to make square
    sips --cropOffset "$OFFSET_Y" 0 --cropToHeightWidth "$SIDE" "$SIDE" "$OUTPUT" > /dev/null
    # Resize to 1024x1024
    sips --resampleHeightWidth 1024 1024 "$OUTPUT" > /dev/null
    echo "  ✓ $FILENAME → 1024x1024 (cropped + resized)"
  else
    cp "$INPUT" "$OUTPUT"
    echo "  ✓ $FILENAME (copied as-is)"
  fi
done

echo ""
echo "✓ Done. Processed screenshots in $OUTPUT_DIR"

#!/usr/bin/env bash
# save-demo-video.sh — Finds the Playwright video and converts it to MP4 with timestamp.
# Usage: bash scripts/save-demo-video.sh [headed]

set -euo pipefail

FRONTEND_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEMOS_DIR="$FRONTEND_DIR/demos"
RESULTS_DIR="$FRONTEND_DIR/test-results"

mkdir -p "$DEMOS_DIR"

# --- 1. Run the Playwright demo ---
echo ""
echo "========================================"
echo "  Running MedOS demo..."
echo "========================================"
echo ""

MODE="${1:-headless}"
if [ "$MODE" = "headed" ]; then
  npx playwright test full-demo --headed || true
else
  npx playwright test full-demo || true
fi

# --- 2. Find the generated .webm video ---
VIDEO_SRC=$(find "$RESULTS_DIR" -name "video.webm" -type f 2>/dev/null | head -1)

if [ -z "$VIDEO_SRC" ]; then
  echo ""
  echo "[ERROR] No video found in $RESULTS_DIR"
  echo "        The test may have failed before generating a video."
  exit 1
fi

echo ""
echo "[OK] Found video: $VIDEO_SRC"
echo "     Size: $(du -h "$VIDEO_SRC" | cut -f1)"

# --- 3. Convert to MP4 with timestamp filename ---
TIMESTAMP=$(date +"%Y%m%d%H%M")
OUTPUT="$DEMOS_DIR/${TIMESTAMP}.mp4"

echo ""
echo "========================================"
echo "  Converting to MP4..."
echo "  Output: demos/${TIMESTAMP}.mp4"
echo "========================================"
echo ""

ffmpeg -y -i "$VIDEO_SRC" \
  -c:v libx264 -preset fast -crf 23 \
  -pix_fmt yuv420p \
  -movflags +faststart \
  "$OUTPUT" 2>&1 | tail -3

echo ""
echo "========================================"
echo "  DONE"
echo "  Video: demos/${TIMESTAMP}.mp4"
echo "  Size:  $(du -h "$OUTPUT" | cut -f1)"
echo "========================================"
echo ""

# List all demos
echo "All demos in demos/:"
ls -lh "$DEMOS_DIR"/*.mp4 2>/dev/null || echo "  (none)"

#!/bin/bash
# Syncs canonical shared markdown/hljs files to consumer fallback locations.
#
# Usage: bash scripts/sync-shared.sh
#
# Canonical source:  epcvip-tools-hub/shared/
# Consumer targets:  experiments-dashboard, docs-site
#
# Handles filename differences between consumers:
#   epc-markdown.css → experiments-dashboard: static/css/shared/epc-markdown.css
#                    → docs-site:             static/css/markdown.css
#   epc-hljs.css     → experiments-dashboard: static/css/hljs-epcvip.css
#                    → docs-site:             static/css/hljs-epcvip.css
#   epc-markdown.js  → both:                  static/js/shared/epc-markdown.js

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SHARED_DIR="$SCRIPT_DIR/../shared"
UTILS_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Detect worktree naming — branches use --shared-markdown suffix
find_consumer() {
  local name="$1"
  if [[ -d "$UTILS_DIR/${name}--shared-markdown" ]]; then
    echo "$UTILS_DIR/${name}--shared-markdown"
  elif [[ -d "$UTILS_DIR/${name}" ]]; then
    echo "$UTILS_DIR/${name}"
  else
    echo ""
  fi
}

XP_DIR=$(find_consumer "experiments-dashboard")
DOCS_DIR=$(find_consumer "docs-site")

if [[ -z "$XP_DIR" ]]; then
  echo "ERROR: experiments-dashboard directory not found in $UTILS_DIR"
  exit 1
fi
if [[ -z "$DOCS_DIR" ]]; then
  echo "ERROR: docs-site directory not found in $UTILS_DIR"
  exit 1
fi

echo "Canonical source:  $SHARED_DIR"
echo "Target (xp):       $XP_DIR"
echo "Target (docs):     $DOCS_DIR"
echo ""

# File mapping: source → [target_dir, target_filename]
CHANGED=0
SYNCED=0

sync_file() {
  local src="$1"
  local dst="$2"
  local label="$3"

  if [[ ! -f "$src" ]]; then
    echo "SKIP  $label — source not found: $src"
    return
  fi

  # Create target directory if needed
  mkdir -p "$(dirname "$dst")"

  if [[ ! -f "$dst" ]]; then
    cp "$src" "$dst"
    echo "NEW   $label"
    CHANGED=$((CHANGED + 1))
  elif ! diff -q "$src" "$dst" > /dev/null 2>&1; then
    echo "DIFF  $label"
    diff --color=auto "$src" "$dst" | head -30 || true
    echo "---"
    cp "$src" "$dst"
    CHANGED=$((CHANGED + 1))
  else
    echo "OK    $label"
    SYNCED=$((SYNCED + 1))
  fi
}

echo "=== epc-markdown.js ==="
sync_file "$SHARED_DIR/epc-markdown.js" \
          "$XP_DIR/static/js/shared/epc-markdown.js" \
          "xp: static/js/shared/epc-markdown.js"
sync_file "$SHARED_DIR/epc-markdown.js" \
          "$DOCS_DIR/static/js/shared/epc-markdown.js" \
          "docs: static/js/shared/epc-markdown.js"
echo ""

echo "=== epc-markdown.css ==="
sync_file "$SHARED_DIR/epc-markdown.css" \
          "$XP_DIR/static/css/shared/epc-markdown.css" \
          "xp: static/css/shared/epc-markdown.css"
sync_file "$SHARED_DIR/epc-markdown.css" \
          "$DOCS_DIR/static/css/markdown.css" \
          "docs: static/css/markdown.css"
echo ""

echo "=== epc-hljs.css ==="
sync_file "$SHARED_DIR/epc-hljs.css" \
          "$XP_DIR/static/css/hljs-epcvip.css" \
          "xp: static/css/hljs-epcvip.css"
sync_file "$SHARED_DIR/epc-hljs.css" \
          "$DOCS_DIR/static/css/hljs-epcvip.css" \
          "docs: static/css/hljs-epcvip.css"
echo ""

echo "=== Summary ==="
echo "Already in sync: $SYNCED"
echo "Updated:         $CHANGED"

if [[ $CHANGED -gt 0 ]]; then
  echo ""
  echo "Fallback copies were out of sync and have been updated."
  echo "Commit the changes in the consumer repos."
fi

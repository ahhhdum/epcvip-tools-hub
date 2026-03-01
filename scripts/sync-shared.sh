#!/bin/bash
# Syncs canonical shared markdown files to consumer fallback locations.
#
# Usage: bash scripts/sync-shared.sh
#
# Canonical source:  epcvip-tools-hub/shared/
# Consumer targets:  experiments-dashboard (xp), docs-site (docs)
#
# Syncs 14 files (core + plugins + tokens) to both consumers.
# Sidebar/header files are tools-hub-only and not synced.
#
# Filename renames between source and consumers:
#   epc-markdown.css → docs: static/css/markdown.css  (xp keeps canonical name)
#   epc-hljs.css     → both: static/css/hljs-epcvip.css

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

echo "=== epc-tokens.css ==="
sync_file "$SHARED_DIR/epc-tokens.css" \
          "$XP_DIR/static/css/shared/epc-tokens.css" \
          "xp: static/css/shared/epc-tokens.css"
sync_file "$SHARED_DIR/epc-tokens.css" \
          "$DOCS_DIR/static/css/shared/epc-tokens.css" \
          "docs: static/css/shared/epc-tokens.css"
echo ""

echo "=== Plugin JS ==="
for plugin in significance decision-banner metric-cards checks slack-tables toc; do
  sync_file "$SHARED_DIR/epc-markdown-plugin-${plugin}.js" \
            "$XP_DIR/static/js/plugins/epc-markdown-plugin-${plugin}.js" \
            "xp: static/js/plugins/epc-markdown-plugin-${plugin}.js"
  sync_file "$SHARED_DIR/epc-markdown-plugin-${plugin}.js" \
            "$DOCS_DIR/static/js/plugins/epc-markdown-plugin-${plugin}.js" \
            "docs: static/js/plugins/epc-markdown-plugin-${plugin}.js"
done
echo ""

echo "=== Plugin CSS ==="
for plugin_css in significance blocks; do
  sync_file "$SHARED_DIR/epc-markdown-plugin-${plugin_css}.css" \
            "$XP_DIR/static/css/epc-markdown-plugin-${plugin_css}.css" \
            "xp: static/css/epc-markdown-plugin-${plugin_css}.css"
  sync_file "$SHARED_DIR/epc-markdown-plugin-${plugin_css}.css" \
            "$DOCS_DIR/static/css/epc-markdown-plugin-${plugin_css}.css" \
            "docs: static/css/epc-markdown-plugin-${plugin_css}.css"
done
echo ""

echo "=== Summary ==="
echo "Already in sync: $SYNCED"
echo "Updated:         $CHANGED"

if [[ $CHANGED -gt 0 ]]; then
  echo ""
  echo "Fallback copies were out of sync and have been updated."
  echo "Commit the changes in the consumer repos."
fi

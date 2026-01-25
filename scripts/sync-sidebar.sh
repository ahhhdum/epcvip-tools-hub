#!/bin/bash
# Syncs sidebar nav items from source template to all EPCVIP apps
# Usage: ./sync-sidebar.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
UTILS_DIR="$(dirname "$SCRIPT_DIR")/.."
SOURCE="$SCRIPT_DIR/../shared/epc-sidebar.html"

# Extract nav items from source (between epc-nav-items div)
NAV_ITEMS=$(sed -n '/<div class="epc-nav-items">/,/<\/div>/p' "$SOURCE" | grep -v 'epc-nav-items')

echo "Extracted nav items from source:"
echo "$NAV_ITEMS" | head -5
echo "..."

# Target apps and their index.html locations
TARGETS=(
  "ping-tree-compare/static/index.html"
  "experiments-dashboard/static/index.html"
  "athena-usage-monitor-fastapi/static/index.html"
)

for target in "${TARGETS[@]}"; do
  TARGET_PATH="$UTILS_DIR/$target"
  if [[ -f "$TARGET_PATH" ]]; then
    echo "→ Would update: $target"
    # TODO: Implement sed replacement or use a proper templating approach
  else
    echo "⚠ Not found: $target"
  fi
done

echo ""
echo "Note: Full automation requires careful HTML parsing."
echo "For now, manually update each file or use this as a reference."

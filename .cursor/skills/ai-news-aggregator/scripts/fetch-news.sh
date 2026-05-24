#!/usr/bin/env bash
# Fetch latest AI news — works globally, caches data under skill dir.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CACHE_REPO="$SKILL_DIR/cache/repo"
CACHE_DATA="$SKILL_DIR/cache/data"
REPO_URL="https://github.com/huang1125677925/ai-news-aggregator.git"

is_project_root() {
  [ -f "$1/package.json" ] && grep -q '"name"[[:space:]]*:[[:space:]]*"ai-news-aggregator"' "$1/package.json"
}

find_project_root() {
  if [ -n "${AI_NEWS_AGGREGATOR_ROOT:-}" ] && is_project_root "$AI_NEWS_AGGREGATOR_ROOT"; then
    echo "$AI_NEWS_AGGREGATOR_ROOT"
    return 0
  fi

  local dir="$PWD"
  for _ in $(seq 1 12); do
    if is_project_root "$dir"; then
      echo "$dir"
      return 0
    fi
    local parent
    parent="$(dirname "$dir")"
    [ "$parent" = "$dir" ] && break
    dir="$parent"
  done

  if [ -d "$CACHE_REPO" ] && is_project_root "$CACHE_REPO"; then
    echo "$CACHE_REPO"
    return 0
  fi

  return 1
}

if ! command -v pnpm &>/dev/null; then
  echo "Error: pnpm is required. Install with: npm install -g pnpm" >&2
  exit 1
fi

PROJECT_ROOT=""
if ! PROJECT_ROOT="$(find_project_root)"; then
  echo "Cloning ai-news-aggregator to $CACHE_REPO ..."
  mkdir -p "$(dirname "$CACHE_REPO")"
  git clone --depth 1 "$REPO_URL" "$CACHE_REPO"
  PROJECT_ROOT="$CACHE_REPO"
fi

cd "$PROJECT_ROOT"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  pnpm install
fi

echo "Fetching AI news from $PROJECT_ROOT ..."
pnpm fetch "$@"

mkdir -p "$CACHE_DATA"
cp -f data/latest-24h.json data/latest-7d.json "$CACHE_DATA/" 2>/dev/null || cp -f data/latest-24h.json "$CACHE_DATA/"

echo ""
echo "Done. Cached to $CACHE_DATA"
echo "Query with:"
echo "  node $SCRIPT_DIR/query-news.mjs --limit 20"

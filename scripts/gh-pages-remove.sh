#!/usr/bin/env bash
# K5: removes one subfolder from the gh-pages branch (a closed PR's preview build).
# Usage: gh-pages-remove.sh <subfolder>
# Requires GITHUB_TOKEN and GITHUB_REPOSITORY in the environment.
set -euo pipefail

SUBFOLDER="$1"
if [ -z "$SUBFOLDER" ]; then
  echo "gh-pages-remove: subfolder is required" >&2
  exit 1
fi

WORK="$(mktemp -d)"
URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

if ! git clone --quiet --depth 1 --branch gh-pages "$URL" "$WORK" 2>/dev/null; then
  echo "gh-pages: branch doesn't exist, nothing to remove"
  exit 0
fi

cd "$WORK"
if [ ! -d "$SUBFOLDER" ]; then
  echo "gh-pages: '$SUBFOLDER' isn't there, nothing to remove"
  exit 0
fi

rm -rf "$SUBFOLDER"
git add -A
git -c user.name="github-actions[bot]" \
  -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit --quiet -m "Remove closed PR preview: $SUBFOLDER"
git push --quiet origin gh-pages
echo "gh-pages: removed '$SUBFOLDER'"

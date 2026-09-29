#!/usr/bin/env bash
# K5: publishes a built directory into a subfolder of the gh-pages branch, leaving
# everything else already on that branch untouched (main's own build lives at the
# root; each open PR's preview lives at pr-<n>/). Used by both deploy.yml (root) and
# preview.yml (a PR subfolder) so the publish logic lives in exactly one place.
#
# Usage: gh-pages-publish.sh <subfolder|""> <src-dir> <commit-message>
# Requires GITHUB_TOKEN and GITHUB_REPOSITORY in the environment (both already set
# by GitHub Actions).
set -euo pipefail

SUBFOLDER="$1"
SRC_DIR="$2"
MESSAGE="$3"

if [ ! -d "$SRC_DIR" ]; then
  echo "gh-pages-publish: $SRC_DIR does not exist" >&2
  exit 1
fi

REPO_DIR="$(pwd)"
WORK="$(mktemp -d)"
URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"

if ! git clone --quiet --depth 1 --branch gh-pages "$URL" "$WORK" 2>/dev/null; then
  echo "gh-pages branch doesn't exist yet - starting it"
  git clone --quiet --depth 1 "$URL" "$WORK"
  (cd "$WORK" && git checkout --orphan gh-pages && git rm -rf . >/dev/null 2>&1 || true)
fi

if [ -n "$SUBFOLDER" ]; then
  TARGET="$WORK/$SUBFOLDER"
  rm -rf "$TARGET"
  mkdir -p "$TARGET"
else
  # Root publish: clear every existing top-level entry except .git itself - unlike
  # the subfolder case, rm -rf on the whole worktree would delete the clone's .git too.
  TARGET="$WORK"
  find "$WORK" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
fi
cp -r "$REPO_DIR/$SRC_DIR"/. "$TARGET"/

cd "$WORK"
git add -A
if git diff --cached --quiet; then
  echo "gh-pages: no changes for '${SUBFOLDER:-<root>}'"
  exit 0
fi
git -c user.name="github-actions[bot]" \
  -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit --quiet -m "$MESSAGE"
git push --quiet origin gh-pages
echo "gh-pages: published '${SUBFOLDER:-<root>}'"

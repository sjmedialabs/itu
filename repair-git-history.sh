#!/usr/bin/env bash
# Run on the server: bash repair-git-history.sh
# GitHub rejected push because node_modules (Next SWC .node files >100MB) is in local history.
# Removing only the last commit is NOT enough — blobs stay in parent commits.
# This script: saves a backup branch, resets to match remote (push failed = remote never got the bad pack),
# untracks node_modules/.next if present, then one clean commit from the working tree.

set -euo pipefail
cd "$(dirname "$0")"

UPSTREAM="${1:-origin/main}"
if ! git rev-parse --verify "$UPSTREAM" >/dev/null 2>&1; then
  UPSTREAM="origin/master"
fi

echo "Using upstream: $UPSTREAM"
BACKUP="backup/local-before-repair-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP" HEAD
echo "Saved current tip as branch: $BACKUP (recover files with: git checkout $BACKUP -- <path>)"

git fetch origin
git reset --hard "$UPSTREAM"

git rm -r --cached node_modules .next 2>/dev/null || true

git add -A
git status

if git diff --cached --quiet; then
  echo "Nothing staged to commit. Working tree matches $UPSTREAM."
else
  git commit -m "chore: commit app source only (exclude node_modules and .next per .gitignore)"
fi

echo "Next: git push origin $(git rev-parse --abbrev-ref HEAD)"

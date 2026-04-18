#!/usr/bin/env bash
# Run on the host (SSH), not from a restricted Cursor sandbox: git needs write access to .git/index
set -euo pipefail
cd "$(dirname "$0")"
git rm -r --cached node_modules .next
git add .gitignore .env.example
git add -u
git status
git commit -m "chore: add .gitignore and .env.example; stop tracking node_modules and .next"

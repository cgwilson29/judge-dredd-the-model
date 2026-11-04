#!/usr/bin/env bash
# Starts the Node app on this computer only (it does not publish anything).
# Usage, in a Bash terminal in this folder (on Windows: Git Bash or WSL):  bash run_app.sh
# Then open http://localhost:8766/ in your browser. Stop it with Ctrl+C.
set -euo pipefail

# Run from this script's own folder, wherever it is called from.
cd "$(dirname "${BASH_SOURCE[0]}")"

PORT="${PORT:-8766}"

# Prerequisite: Node.js 20 or newer. Nothing is installed: the app has no npm dependencies.
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js was not found. Install Node.js 20 or newer from https://nodejs.org/, then run: bash run_app.sh" >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "This app needs Node.js 20 or newer; you have $(node --version). Update Node.js, then run: bash run_app.sh" >&2
  exit 1
fi

if [ ! -f web/server.mjs ]; then
  echo "web/server.mjs is missing: run this script from the project folder." >&2
  exit 1
fi
if [ ! -f results/readmission.json ] || [ ! -f results/diabetes.json ]; then
  echo "Note: results/ is incomplete; the app will say which results are missing (run python -m analysis)."
fi

echo "Starting the app on your computer only. Open http://localhost:${PORT}/ in your browser."
echo "Stop it with Ctrl+C."
exec node web/server.mjs "$PORT"

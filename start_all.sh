#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Launching SMART REPORT..."

# Start backend
"$SCRIPT_DIR/start_backend.sh" &
BACKEND_PID=$!

echo "Backend started with PID: $BACKEND_PID on http://0.0.0.0:8001"
echo "Smart Report is ready and running at http://0.0.0.0:8001 (Production Build) and http://0.0.0.0:5173 (Dev Server)"

# Wait on backend process
wait $BACKEND_PID


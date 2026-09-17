#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend"

source venv/bin/activate
export PYTHONPATH="$SCRIPT_DIR/backend"

echo "Starting Smart Report Backend on http://0.0.0.0:8001..."
exec uvicorn main:app --host 0.0.0.0 --port 8001


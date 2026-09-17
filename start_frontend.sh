#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/frontend"

echo "Starting Smart Report Frontend (Vite Dev Server) on http://0.0.0.0:5173..."
exec npm run dev -- --host 0.0.0.0 --port 5173


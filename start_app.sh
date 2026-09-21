#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

PORT="${PORT:-8001}"
HOST="${HOST:-0.0.0.0}"

echo "=================================================="
echo "   🚀 LAUNCHING SMART REPORT (SAP QUERY ENGINE)   "
echo "=================================================="

# Function to check if a port is in use
is_port_busy() {
    local p="$1"
    ss -tulpn 2>/dev/null | grep -q -E ":$p\b" || lsof -i :"$p" >/dev/null 2>&1
}

# Auto-detect and switch to next available port if requested port is occupied
if is_port_busy "$PORT"; then
    ORIG_PORT="$PORT"
    OCCUPIED_BY=$(docker ps --filter "publish=$PORT" --format "{{.Names}}" 2>/dev/null || true)
    
    echo "⚠️  Port $PORT is currently in use" ${OCCUPIED_BY:+"(occupied by Docker container: $OCCUPIED_BY)"}
    
    while is_port_busy "$PORT"; do
        PORT=$((PORT + 1))
    done
    
    echo "🔄 Automatically switching to available port: $PORT"
    if [ -n "$OCCUPIED_BY" ]; then
        echo "   👉 Note: To free port $ORIG_PORT, run: docker stop $OCCUPIED_BY"
    fi
    echo ""
fi

# Ensure Python Virtual Environment exists
if [ ! -f "$SCRIPT_DIR/backend/venv/bin/activate" ]; then
    echo "❌ Error: Virtual environment not found in backend/venv."
    echo "Please create it first: python3 -m venv backend/venv && backend/venv/bin/pip install -r backend/requirements.txt"
    exit 1
fi

# Setup cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Stopping Smart Report services..."
    if [ -n "$BACKEND_PID" ]; then
        kill "$BACKEND_PID" 2>/dev/null || true
    fi
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# Start Backend
echo "📦 Starting FastAPI backend on http://$HOST:$PORT..."
source "$SCRIPT_DIR/backend/venv/bin/activate"
export PYTHONPATH="$SCRIPT_DIR/backend"
cd "$SCRIPT_DIR/backend"

uvicorn main:app --host "$HOST" --port "$PORT" --reload &
BACKEND_PID=$!

# Collect IP addresses
IP_LIST=$(hostname -I 2>/dev/null || ip -4 addr show 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "127.0.0.1")

echo ""
echo "✅ Smart Report is running and ready for network access!"
echo "   👉 Local:       http://localhost:$PORT"
for ip_addr in $IP_LIST; do
    # Skip docker internal bridges in display if other IPs exist
    if [[ ! "$ip_addr" =~ ^172\.(1[7-9]|2[0-9]|3[0-1])\. ]]; then
        echo "   👉 Network IP:  http://$ip_addr:$PORT"
    fi
done
echo "   👉 API Docs:    http://localhost:$PORT/api/v1/docs"
echo "=================================================="
echo "Press Ctrl+C to stop the application."
echo ""

# Wait on backend process
wait $BACKEND_PID

#!/bin/bash

echo "Starting Viral Content Cloner Agent..."
echo ""

# Go to project root regardless of where script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Install backend dependencies if needed
echo "Checking backend dependencies..."
pip install -r backend/requirements.txt -q

# Install frontend dependencies if needed
if [ ! -d "frontend/node_modules" ]; then
    echo "Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

# Kill any existing processes on our ports
echo "Clearing ports 5002 and 3100..."
fuser -k 5002/tcp 2>/dev/null || true
fuser -k 3100/tcp 2>/dev/null || true
sleep 1

echo ""
echo "Starting backend on http://localhost:5002 ..."
cd backend && python app.py > /tmp/vca-backend.log 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

sleep 3

echo "Starting frontend on http://localhost:3100 ..."
cd frontend && npm run dev > /tmp/vca-frontend.log 2>&1 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

sleep 3

echo ""
echo "Both servers are running!"
echo ""
echo "  App:     http://localhost:3100"
echo "  Backend: http://localhost:5002"
echo ""
echo "Logs: /tmp/vca-backend.log and /tmp/vca-frontend.log"
echo "To stop: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Keep script alive and handle Ctrl+C
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT
wait $BACKEND_PID $FRONTEND_PID

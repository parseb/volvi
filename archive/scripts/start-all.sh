#!/bin/bash

# Start everything in parallel with proper process management

echo "🚀 Starting Complete Development Stack"
echo "======================================"
echo ""

# Check if fork is already running
if lsof -Pi :8545 -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "✅ Fork already running on port 8545"
    echo ""
else
    echo "⚠️  Fork not detected. Starting fork first..."
    echo "   Run: ./scripts/start-dev.sh"
    echo "   Then in new terminals:"
    echo "     - npm run dev:backend"
    echo "     - npm run dev:frontend"
    exit 1
fi

# Load environment
if [ -f .env.local ]; then
    source .env.local
else
    echo "❌ .env.local not found. Run ./scripts/start-dev.sh first"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

echo "📦 Starting Backend..."
cd backend && npm run dev > /tmp/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

sleep 3

echo "🎨 Starting Frontend..."
cd frontend && npm run dev > /tmp/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

sleep 2

echo ""
echo "======================================"
echo "✅ ALL SERVICES RUNNING!"
echo "======================================"
echo ""
echo "🍴 Fork:     http://127.0.0.1:8545"
echo "🔧 Backend:  http://localhost:3001"
echo "🎨 Frontend: http://localhost:3000"
echo ""
echo "📋 Protocol: $PROTOCOL_ADDRESS"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f /tmp/backend.log"
echo "   Frontend: tail -f /tmp/frontend.log"
echo "   Fork:     tail -f /tmp/anvil.log"
echo ""
echo "======================================"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait

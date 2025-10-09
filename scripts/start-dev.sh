#!/bin/bash

# Complete development environment startup script

set -e

echo "🚀 Starting Options Protocol Development Environment"
echo "===================================================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "   Run: cp .env.example .env"
    echo "   Then configure your BASE_RPC_URL"
    exit 1
fi

# Load environment
source .env

# Check BASE_RPC_URL
if [ -z "$BASE_RPC_URL" ]; then
    echo "❌ BASE_RPC_URL not set in .env"
    exit 1
fi

# Step 1: Kill existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "anvil.*8545" || true
pkill -f "npm run dev:backend" || true
pkill -f "npm run dev:frontend" || true
sleep 2

# Step 2: Start Anvil fork
echo ""
echo "🍴 Starting Anvil Base fork..."
anvil --fork-url "$BASE_RPC_URL" --chain-id 8453 --host 0.0.0.0 --port 8545 > /tmp/anvil.log 2>&1 &
ANVIL_PID=$!

# Wait for anvil to be ready
echo "   Waiting for fork to start..."
for i in {1..10}; do
    if curl -s -X POST http://127.0.0.1:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        > /dev/null 2>&1; then
        echo "   ✅ Fork running on http://127.0.0.1:8545"
        break
    fi
    if [ $i -eq 10 ]; then
        echo "   ❌ Fork failed to start"
        cat /tmp/anvil.log
        exit 1
    fi
    sleep 1
done

# Step 3: Deploy contracts
echo ""
echo "📦 Deploying contracts to fork..."
forge script script/DeployFork.s.sol \
    --rpc-url http://127.0.0.1:8545 \
    --broadcast \
    2>&1 | grep -E "(Step|Protocol|COMPLETE|Deployer|Writer|Taker)" || true

if [ ! -f .env.local ]; then
    echo "❌ Deployment failed - .env.local not created"
    exit 1
fi

echo "   ✅ Contracts deployed"

# Step 4: Fund accounts with tokens
echo ""
echo "💰 Funding test accounts..."

source .env.local

# Known token holders on Base
COINBASE_USDC="0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A"
WETH_HOLDER="0xD9A442856C234a39a81a089C06451EBAA4306a72"

# Give them ETH for gas
cast rpc anvil_setBalance $COINBASE_USDC 1000000000000000000 --rpc-url http://127.0.0.1:8545 > /dev/null
cast rpc anvil_setBalance $WETH_HOLDER 1000000000000000000 --rpc-url http://127.0.0.1:8545 > /dev/null

# Impersonate
cast rpc anvil_impersonateAccount $COINBASE_USDC --rpc-url http://127.0.0.1:8545 > /dev/null
cast rpc anvil_impersonateAccount $WETH_HOLDER --rpc-url http://127.0.0.1:8545 > /dev/null

# Transfer USDC to all accounts
for addr in $DEPLOYER_ADDRESS $WRITER_ADDRESS $TAKER_ADDRESS; do
    cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
        "transfer(address,uint256)" \
        $addr \
        50000000000 \
        --from $COINBASE_USDC \
        --unlocked \
        --rpc-url http://127.0.0.1:8545 > /dev/null 2>&1 || true
done

# Transfer WETH to writer
cast send 0x4200000000000000000000000000000000000006 \
    "transfer(address,uint256)" \
    $WRITER_ADDRESS \
    10000000000000000000 \
    --from $WETH_HOLDER \
    --unlocked \
    --rpc-url http://127.0.0.1:8545 > /dev/null 2>&1 || true

echo "   ✅ Accounts funded"

# Step 5: Show summary
echo ""
echo "===================================================="
echo "✅ DEVELOPMENT ENVIRONMENT READY!"
echo "===================================================="
echo ""
echo "📍 Services:"
echo "   Anvil Fork: http://127.0.0.1:8545"
echo "   Chain ID: 8453 (Base Fork)"
echo ""
echo "📝 Contract:"
echo "   Protocol: $PROTOCOL_ADDRESS"
echo "   Fee: \$1 USDC per option"
echo ""
echo "👥 Test Accounts:"
echo "   Deployer:  $DEPLOYER_ADDRESS"
echo "   Writer:    $WRITER_ADDRESS"
echo "   Taker:     $TAKER_ADDRESS"
echo ""
echo "🔑 Import to MetaMask:"
echo "   Network Name: Base Fork"
echo "   RPC URL: http://127.0.0.1:8545"
echo "   Chain ID: 8453"
echo "   Currency: ETH"
echo ""
echo "   Account #1 (Deployer): 0xac097...f2ff80"
echo "   Account #2 (Writer):   0x59c69...8690d"
echo "   Account #3 (Taker):    0x5de41...ab365a"
echo ""
echo "📂 Environment loaded from .env.local"
echo ""
echo "===================================================="
echo ""
echo "🚦 Starting Backend & Frontend..."
echo ""

# Export env vars for child processes
export PROTOCOL_ADDRESS
export DEPLOYER_ADDRESS
export WRITER_ADDRESS
export TAKER_ADDRESS
export BROADCASTER_PRIVATE_KEY

# Get absolute path to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Start backend in background
echo "📦 Starting Backend (port 3001)..."
(cd "$PROJECT_ROOT/backend" && npm run dev > /tmp/backend.log 2>&1) &
BACKEND_PID=$!

sleep 3

# Start frontend in background
echo "🎨 Starting Frontend (port 3000)..."
(cd "$PROJECT_ROOT/frontend" && npm run dev > /tmp/frontend.log 2>&1) &
FRONTEND_PID=$!

sleep 3

echo ""
echo "===================================================="
echo "✅ ALL SERVICES RUNNING!"
echo "===================================================="
echo ""
echo "🌐 Access Points:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Fork RPC:  http://127.0.0.1:8545"
echo ""
echo "📋 Contract:"
echo "   Protocol:  $PROTOCOL_ADDRESS"
echo ""
echo "👥 Test Accounts:"
echo "   Deployer:  $DEPLOYER_ADDRESS"
echo "   Writer:    $WRITER_ADDRESS"
echo "   Taker:     $TAKER_ADDRESS"
echo ""
echo "📝 Logs:"
echo "   Backend:   tail -f /tmp/backend.log"
echo "   Frontend:  tail -f /tmp/frontend.log"
echo "   Fork:      tail -f /tmp/anvil.log"
echo ""
echo "===================================================="
echo ""
echo "🚀 Open http://localhost:3000 to start!"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping all services..."
    kill $ANVIL_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Cleanup complete"
    exit
}

trap cleanup INT TERM

# Wait for all processes
wait

#!/bin/bash

# Setup script for Base mainnet fork development environment

echo "🔧 Setting up Base mainnet fork environment..."

# Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo "📝 Creating .env from .env.example..."
    cp .env.example .env
    echo "✅ .env created. Please configure it with your settings."
fi

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if BASE_RPC_URL is set
if [ -z "$BASE_RPC_URL" ]; then
    echo "❌ BASE_RPC_URL not set in .env"
    exit 1
fi

echo "🍴 Starting Anvil fork of Base mainnet..."
echo "   Chain ID: 8453"
echo "   RPC: http://127.0.0.1:8545"
echo ""
echo "📋 Available test accounts (use these in your .env.local):"
echo "   Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "   Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
echo ""
echo "🚀 Starting anvil..."
echo ""

# Start anvil in the background
anvil \
    --fork-url "$BASE_RPC_URL" \
    --chain-id 8453 \
    --host 0.0.0.0 \
    --port 8545

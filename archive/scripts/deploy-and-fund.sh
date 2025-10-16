#!/bin/bash

set -e

echo "🚀 Deploying to Base Fork..."
echo ""

# Deploy contracts
forge script script/DeployFork.s.sol --rpc-url http://127.0.0.1:8545 --broadcast 2>/dev/null | grep -E "(Step|Protocol|COMPLETE|Deployer|Writer|Taker)" || true

# Load addresses
source .env.local

echo ""
echo "📦 Funding test accounts with tokens..."

# Known USDC/WETH holders on Base mainnet
COINBASE_USDC="0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A"
WETH_HOLDER="0xD9A442856C234a39a81a089C06451EBAA4306a72"

# Fund with ETH for gas
cast rpc anvil_setBalance $COINBASE_USDC 1000000000000000000 > /dev/null
cast rpc anvil_setBalance $WETH_HOLDER 1000000000000000000 > /dev/null

# Impersonate whale accounts
cast rpc anvil_impersonateAccount $COINBASE_USDC > /dev/null
cast rpc anvil_impersonateAccount $WETH_HOLDER > /dev/null

# Transfer USDC
echo "💵 Transferring USDC..."
cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" \
  $DEPLOYER_ADDRESS \
  100000000000 \
  --from $COINBASE_USDC \
  --unlocked \
  --rpc-url http://127.0.0.1:8545 > /dev/null

cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" \
  $WRITER_ADDRESS \
  50000000000 \
  --from $COINBASE_USDC \
  --unlocked \
  --rpc-url http://127.0.0.1:8545 > /dev/null

cast send 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 \
  "transfer(address,uint256)" \
  $TAKER_ADDRESS \
  50000000000 \
  --from $COINBASE_USDC \
  --unlocked \
  --rpc-url http://127.0.0.1:8545 > /dev/null

# Transfer WETH
echo "💎 Transferring WETH..."
cast send 0x4200000000000000000000000000000000000006 \
  "transfer(address,uint256)" \
  $WRITER_ADDRESS \
  10000000000000000000 \
  --from $WETH_HOLDER \
  --unlocked \
  --rpc-url http://127.0.0.1:8545 > /dev/null

# Verify balances
echo ""
echo "✅ Deployment & Funding Complete!"
echo ""
echo "Protocol: $PROTOCOL_ADDRESS"
echo ""
echo "Test Account Balances:"
echo "  Deployer ($DEPLOYER_ADDRESS):"
echo "    USDC: $(cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 'balanceOf(address)(uint256)' $DEPLOYER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast --to-unit 6) USDC"
echo ""
echo "  Writer ($WRITER_ADDRESS):"
echo "    USDC: $(cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 'balanceOf(address)(uint256)' $WRITER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast --to-unit 6) USDC"
echo "    WETH: $(cast call 0x4200000000000000000000000000000000000006 'balanceOf(address)(uint256)' $WRITER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast --to-unit 18) WETH"
echo ""
echo "  Taker ($TAKER_ADDRESS):"
echo "    USDC: $(cast call 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 'balanceOf(address)(uint256)' $TAKER_ADDRESS --rpc-url http://127.0.0.1:8545 | cast --to-unit 6) USDC"
echo ""
echo "Next: source .env.local && npm run dev:backend"

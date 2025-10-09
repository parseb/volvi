#!/bin/bash

# Fund test accounts with USDC and WETH on fork

FORK_RPC="http://127.0.0.1:8545"
TEST_ACCOUNT="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
USDC="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
WETH="0x4200000000000000000000000000000000000006"

# Known USDC whale on Base (Coinbase)
USDC_WHALE="0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A"

echo "🏦 Funding test accounts on fork..."

# Impersonate USDC whale
echo "📝 Impersonating USDC whale: $USDC_WHALE"
cast rpc anvil_impersonateAccount $USDC_WHALE --rpc-url $FORK_RPC

# Give whale some ETH for gas
cast rpc anvil_setBalance $USDC_WHALE 0x56BC75E2D63100000 --rpc-url $FORK_RPC

# Transfer 10,000 USDC to test account
echo "💵 Transferring 10,000 USDC to test account..."
cast send $USDC \
  "transfer(address,uint256)" \
  $TEST_ACCOUNT \
  10000000000 \
  --from $USDC_WHALE \
  --rpc-url $FORK_RPC \
  --unlocked

# Transfer 10 WETH to test account
echo "💎 Transferring 10 WETH to test account..."
cast send $WETH \
  "transfer(address,uint256)" \
  $TEST_ACCOUNT \
  10000000000000000000 \
  --from $USDC_WHALE \
  --rpc-url $FORK_RPC \
  --unlocked

# Check balances
echo ""
echo "✅ Balances for $TEST_ACCOUNT:"
echo "   ETH:  $(cast balance $TEST_ACCOUNT --rpc-url $FORK_RPC --ether) ETH"
echo "   USDC: $(cast call $USDC "balanceOf(address)(uint256)" $TEST_ACCOUNT --rpc-url $FORK_RPC) ($(cast --from-wei $(cast call $USDC "balanceOf(address)(uint256)" $TEST_ACCOUNT --rpc-url $FORK_RPC) ether) USDC)"
echo "   WETH: $(cast call $WETH "balanceOf(address)(uint256)" $TEST_ACCOUNT --rpc-url $FORK_RPC) ($(cast --from-wei $(cast call $WETH "balanceOf(address)(uint256)" $TEST_ACCOUNT --rpc-url $FORK_RPC) ether) WETH)"

echo ""
echo "✅ Test accounts funded successfully!"

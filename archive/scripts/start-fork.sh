#!/bin/bash

# Custom mnemonic for Options Protocol development (valid BIP-39 words)
# Using memorable words: test test test test test test test test test test test junk
MNEMONIC="test test test test test test test test test test test junk"

echo "🍴 Starting Anvil Fork of Base Mainnet..."
echo ""
echo "Network Details:"
echo "  RPC URL: http://127.0.0.1:8545"
echo "  Chain ID: 123999 (Base Fork)"
echo "  Fork Block: Latest"
echo ""
echo "🔑 Seed Phrase (Import to MetaMask):"
echo "  test test test test test test test test test test test junk"
echo ""
echo "Test Accounts (each has 10,000 ETH on fork):"
echo "  Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
echo "  Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
echo "  Account #2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
echo ""
echo "⚠️  Setup in MetaMask:"
echo "  1. Add Network:"
echo "     - Networks → Add Network → Add network manually"
echo "     - Network Name: Base Fork"
echo "     - RPC URL: http://127.0.0.1:8545"
echo "     - Chain ID: 123999"
echo "     - Currency Symbol: ETH"
echo ""
echo "  2. Import Accounts:"
echo "     - Settings → Security & Privacy → Reveal Secret Recovery Phrase"
echo "     - OR Import using the seed phrase above to restore all accounts"
echo ""
echo "Starting anvil..."
echo ""

anvil \
  --fork-url https://mainnet.base.org \
  --chain-id 123999 \
  --host 0.0.0.0 \
  --port 8545 \
  --mnemonic "$MNEMONIC" \
  --block-time 1

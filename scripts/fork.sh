#!/bin/bash

# Custom mnemonic for Options Protocol development (valid BIP-39 words)
MNEMONIC="test test test test test test test test test test test junk"

# Source .env for BASE_RPC_URL
if [ -f .env ]; then
    source .env
fi

if [ -z "$BASE_RPC_URL" ]; then
    echo "❌ BASE_RPC_URL not set in .env"
    exit 1
fi

anvil \
  --fork-url "$BASE_RPC_URL" \
  --chain-id 123999 \
  --host 0.0.0.0 \
  --port 8545 \
  --mnemonic "$MNEMONIC"

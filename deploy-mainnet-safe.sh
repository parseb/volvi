#!/bin/bash

# Volvi Options Protocol - Safe Base Mainnet Deployment Script
# This script includes comprehensive safety checks before deployment

set -e  # Exit on any error

echo "=================================="
echo "Volvi Base Mainnet Deployment"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color


echo "${YELLOW}🔒 SECURITY CHECKS${NC}"
echo ""

# Check 1: .env file exists
if [ ! -f .env ]; then
    echo "${RED}❌ Error: .env file not found${NC}"
    echo "Create .env file from .env.foundry.example"
    exit 1
fi
echo "${GREEN}✅ .env file exists${NC}"

# Check 2: Required variables are set
if ! grep -q "^DEPLOYER_PRIVATE_KEY=" .env; then
    echo "${RED}❌ Error: DEPLOYER_PRIVATE_KEY not set in .env${NC}"
    exit 1
fi
echo "${GREEN}✅ DEPLOYER_PRIVATE_KEY is set${NC}"


# Check 4: Foundry is installed
if ! command -v forge &> /dev/null; then
    echo "${RED}❌ Error: Foundry not installed${NC}"
    echo "Install with: curl -L https://foundry.paradigm.xyz | bash && foundryup"
    exit 1
fi
echo "${GREEN}✅ Foundry is installed ($(forge --version | head -n1))${NC}"

# Check 5: RPC URL is set
if ! grep -q "^BASE_MAINNET_RPC_URL=" .env; then
    echo "${YELLOW}⚠️  Warning: BASE_MAINNET_RPC_URL not set, using default${NC}"
    export BASE_MAINNET_RPC_URL="https://mainnet.base.org"
else
    export BASE_MAINNET_RPC_URL=$(grep "^BASE_MAINNET_RPC_URL=" .env | cut -d'=' -f2 | tr -d ' "')
    echo "${GREEN}✅ BASE_MAINNET_RPC_URL is set${NC}"
fi

# Check 6: Get deployer address and check balance
echo ""
echo "${YELLOW}💰 CHECKING DEPLOYER BALANCE${NC}"
echo ""

# Load private key
export DEPLOYER_PRIVATE_KEY=$CURRENT_KEY

# Get deployer address
DEPLOYER_ADDRESS=$(cast wallet address --private-key $DEPLOYER_PRIVATE_KEY)
echo "Deployer Address: $DEPLOYER_ADDRESS"

# Check balance
BALANCE_WEI=$(cast balance $DEPLOYER_ADDRESS --rpc-url $BASE_MAINNET_RPC_URL)
BALANCE_ETH=$(cast --to-unit $BALANCE_WEI ether)

echo "Balance: $BALANCE_ETH ETH"
echo ""

# Check if balance is sufficient (0.01 ETH minimum)
MIN_BALANCE="10000000000000000"  # 0.01 ETH in wei
if [ $(echo "$BALANCE_WEI < $MIN_BALANCE" | bc) -eq 1 ]; then
    echo "${RED}❌ Error: Insufficient balance${NC}"
    echo "Required: >= 0.01 ETH (actual deployment ~0.003-0.005 ETH)"
    echo "Current: $BALANCE_ETH ETH"
    echo ""
    echo "Fund your address: $DEPLOYER_ADDRESS"
    echo "Bridge ETH to Base: https://bridge.base.org/"
    exit 1
fi
echo "${GREEN}✅ Sufficient balance for deployment${NC}"

# Check 7: Verify we're targeting Base Mainnet
echo ""
echo "${YELLOW}🌐 NETWORK VERIFICATION${NC}"
echo ""
CHAIN_ID=$(cast chain-id --rpc-url $BASE_MAINNET_RPC_URL)
if [ "$CHAIN_ID" != "8453" ]; then
    echo "${RED}❌ Error: Not connected to Base Mainnet${NC}"
    echo "Current Chain ID: $CHAIN_ID"
    echo "Expected: 8453 (Base Mainnet)"
    exit 1
fi
echo "${GREEN}✅ Connected to Base Mainnet (Chain ID: 8453)${NC}"

# All checks passed
echo ""
echo "${GREEN}=================================="
echo "✅ ALL SECURITY CHECKS PASSED"
echo "==================================${NC}"
echo ""
echo "Deployment Details:"
echo "  Network: Base Mainnet"
echo "  Chain ID: 8453"
echo "  Deployer: $DEPLOYER_ADDRESS"
echo "  Balance: $BALANCE_ETH ETH"
echo ""

# Final confirmation
echo "${YELLOW}⚠️  WARNING: This will deploy to MAINNET using REAL ETH${NC}"
echo ""
echo "What would you like to do?"
echo ""
echo "1) DRY RUN (simulate deployment, no broadcast)"
echo "2) DEPLOY TO MAINNET (real deployment, uses real ETH)"
echo "3) Cancel"
echo ""
read -p "Enter choice (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "${YELLOW}🧪 Running DRY RUN (simulation only)...${NC}"
        echo ""
        forge script script/DeployBaseMainnet.s.sol:DeployBaseMainnetScript \
            --rpc-url $BASE_MAINNET_RPC_URL \
            -vvvv
        echo ""
        echo "${GREEN}✅ Dry run complete${NC}"
        echo ""
        echo "Review the output above. If everything looks good,"
        echo "run this script again and choose option 2 to deploy for real."
        ;;
    2)
        echo ""
        echo "${RED}🚀 DEPLOYING TO BASE MAINNET - THIS USES REAL ETH${NC}"
        echo ""
        echo "${YELLOW}Press Ctrl+C within 5 seconds to cancel...${NC}"
        sleep 5
        echo ""
        echo "${GREEN}Proceeding with deployment...${NC}"
        echo ""

        forge script script/DeployBaseMainnet.s.sol:DeployBaseMainnetScript \
            --rpc-url $BASE_MAINNET_RPC_URL \
            --broadcast \
            --verify \
            -vvvv

        echo ""
        echo "${GREEN}=================================="
        echo "🎉 DEPLOYMENT COMPLETE!"
        echo "==================================${NC}"
        echo ""
        echo "Next steps:"
        echo "1. Check deployment info: cat deployments/base-mainnet.txt"
        echo "2. Verify on BaseScan: https://basescan.org/address/<CONTRACT_ADDRESS>"
        echo "3. Update backend .env with new contract address"
        echo "4. Update frontend .env with new contract address"
        echo "5. Test with small amounts first!"
        echo ""
        ;;
    3)
        echo ""
        echo "Deployment cancelled."
        exit 0
        ;;
    *)
        echo ""
        echo "${RED}Invalid choice. Exiting.${NC}"
        exit 1
        ;;
esac

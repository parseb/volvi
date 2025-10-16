# Options Protocol - Deployment Information

## Contract Deployments (OptionsProtocolGasless)

All deployments use the **optimized gasless version** of the protocol with CoW Protocol integration.

### Sepolia Testnet
- **Contract Address:** `0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce`
- **Contract Type:** OptionsProtocolGasless (optimized, 24,168 bytes)
- **Chain ID:** 11155111
- **RPC URL:** https://eth-sepolia.g.alchemy.com/v2/0GjaZPZDDDnYA7PfvC6_Q
- **Deployed:** October 13, 2025
- **Status:** ✅ Verified and Tested

**Infrastructure:**
- Pyth Oracle: `0xDd24F84d36BF92C65F92307595335bdFab5Bbd21`
- Uniswap Router: `0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E`
- USDC: `0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8`
- WETH: `0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9`
- CoW Settlement: `0x9008D19f58AAbD9eD0D60971565AA8510560ab41`

**Token Configurations:**
- WETH Config Hash: `0x40087a2674e8344f00e046506c9b5afcb2d399be687815cbe4aaa7f1c967b57a`
  - Min Unit: 0.001 ETH (1e15 wei)
  - Pool Fee: 0.05% (500)
  - Pyth Feed: ETH/USD

### Base Sepolia Testnet
- **Contract Address:** `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`
- **Contract Type:** OptionsProtocolGasless (optimized, 24,168 bytes)
- **Chain ID:** 84532
- **RPC URL:** https://sepolia.base.org
- **Deployed:** October 13, 2025
- **Status:** ✅ Verified and Tested

**Infrastructure:**
- Pyth Oracle: `0xA2aa501b19aff244D90cc15a4Cf739D2725B5729`
- Uniswap Router: `0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4`
- USDC: `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- WETH: `0x4200000000000000000000000000000000000006`
- CoW Settlement: `0x9008D19f58AAbD9eD0D60971565AA8510560ab41`

**Token Configurations:**
- WETH Config Hash: `0x837fa02bce21f3cbbcfe440a3255dd1bd1b0d834e55f6afe1b4c08a88c55a3ce`
  - Min Unit: 0.001 ETH (1e15 wei)
  - Pool Fee: 0.05% (500)
  - Pyth Feed: ETH/USD

---

## Frontend Configuration

The frontend automatically detects the network and uses the appropriate contract address.

**Configuration Location:** `frontend/lib/config.ts`

```typescript
const protocolAddresses = {
  11155111: '0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce', // Sepolia
  84532: '0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2',    // Base Sepolia
};
```

**Supported Networks:**
1. Sepolia (11155111)
2. Base Sepolia (84532)
3. Base Mainnet (8453) - placeholder
4. Base Fork (123999) - local development

---

## Backend Configuration

The backend needs the protocol address set based on the target network.

**For Sepolia:**
```bash
export NEXT_PUBLIC_CHAIN_ID=11155111
export NEXT_PUBLIC_PROTOCOL_ADDRESS=0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce
export SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/0GjaZPZDDDnYA7PfvC6_Q
```

**For Base Sepolia:**
```bash
export NEXT_PUBLIC_CHAIN_ID=84532
export NEXT_PUBLIC_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

---

## Running the Application

### Start with Sepolia
```bash
npm run start:sepolia
```

This will:
1. Start backend with Sepolia configuration
2. Start frontend with Sepolia as default network
3. Connect to contracts at `0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce`

### Start with Base Sepolia
```bash
npm run start:base-sepolia
```

This will:
1. Start backend with Base Sepolia configuration
2. Start frontend with Base Sepolia as default network
3. Connect to contracts at `0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2`

---

## Contract Verification

### Verify on Sepolia
```bash
forge verify-contract \
  0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce \
  src/OptionsProtocolGasless.sol:OptionsProtocolGasless \
  --chain sepolia \
  --watch
```

### Verify on Base Sepolia
```bash
forge verify-contract \
  0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2 \
  src/OptionsProtocolGasless.sol:OptionsProtocolGasless \
  --chain base-sepolia \
  --watch
```

---

## Optimization Details

### Contract Size Reduction
**Challenge:** Original contract was 24,653 bytes (77 bytes over the 24,576 limit)
**Solution:** Reduced to 24,168 bytes (**408 bytes under limit**)

**Optimization Techniques:**
1. **Compiler Settings:** Changed `optimizer_runs=1` in foundry.toml (prioritizes deployment size over runtime gas)
2. **Code Compression:** Removed unnecessary whitespace from declarations, events, and function signatures
3. **Error Messages:** Shortened error messages (e.g., "Invalid signature" → "Sig")
4. **Code Structure:** Removed verbose comments and consolidated declarations

### Test Coverage
- ✅ All 18 tests passing (6 gasless + 12 standard)
- ✅ Full test suite verified
- ✅ Gasless functionality tested: takeOptionGasless, EIP-1271, settlement flow

---

## Key Features

### OptionsProtocolGasless
1. **Gasless Offers** - Makers create offers with EIP-712 signatures (no gas)
2. **Gasless Takes** - Takers pay premium via EIP-3009 (no ETH gas needed)
3. **CoW Settlement** - MEV-protected settlement via CoW Protocol
4. **EIP-1271 Support** - Contract can sign CoW orders
5. **Multi-Step Settlement Flow:**
   - `initiateSettlement()` - Create settlement terms
   - `approveSettlement()` - Taker approves with signature
   - `postSettlementHook()` - CoW calls after execution

---

## Next Steps

### Immediate
- [x] Deploy to Sepolia
- [x] Deploy to Base Sepolia
- [x] Update frontend configuration
- [x] Update backend configuration
- [x] Optimize contract size
- [x] All tests passing

### Before Mainnet
- [ ] Complete security audit
- [ ] Implement CoW settlement backend endpoints
- [ ] Add persistent database storage
- [ ] Set up monitoring and alerts
- [ ] Fund gas vault for relayer
- [ ] Deploy to Base Mainnet

---

## Important Notes

1. **Gas Vault:** The gas reimbursement vault is currently set to the deployer address. Update this before production.

2. **CoW Settlement:** The CoW Settlement contract address is the same on both Sepolia and Base Sepolia (`0x9008...560ab41`).

3. **Network Switching:** Users can switch networks in the frontend, and the correct contract will be used automatically.

4. **Token Configs:** Only WETH is configured on both networks. Add more tokens as needed using `setTokenConfig()`.

5. **Contract Size:** Successfully optimized to fit within Ethereum's 24KB contract size limit while maintaining full functionality.

6. **Optimizer Settings:** Using `optimizer_runs=1` prioritizes deployment size. This may slightly increase runtime gas costs but is necessary to stay under the size limit.

---

## Troubleshooting

### Frontend not connecting
- Check that the correct network is selected in wallet
- Verify `NEXT_PUBLIC_REOWN_PROJECT_ID` is set in `.env`
- Check browser console for errors

### Backend not finding contract
- Verify `NEXT_PUBLIC_PROTOCOL_ADDRESS` matches the network
- Check `NEXT_PUBLIC_CHAIN_ID` is correct (11155111 or 84532)
- Ensure RPC URL is accessible

### Transactions failing
- Verify user has approved WETH/USDC tokens
- Check that token configurations are set on-chain
- Ensure offers haven't expired (check `deadline`)

---

## Contact & Support

- GitHub: [options-protocol](https://github.com/your-org/options-protocol)
- Documentation: See `PROTOCOL_STATUS.md` for feature details
- Issues: Report bugs via GitHub Issues

# 🚀 Options Protocol - Deployment Guide

Test on **Sepolia**, deploy to **Base Mainnet** with full CoW Protocol gasless settlement.

---

## 📋 CoW Protocol Addresses

**GPv2Settlement** (same on all networks):
- Sepolia: `0x9008D19f58AAbD9eD0D60971565AA8510560ab41`
- Base: `0x9008D19f58AAbD9eD0D60971565AA8510560ab41`

**CoW APIs:**
- Sepolia: `https://api.cow.fi/sepolia/api/v1`
- Base: `https://api.cow.fi/base/api/v1`

---

## 🧪 Sepolia Testing

### Already Deployed
```
Contract: 0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
Chain ID: 11155111
WETH: 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9
USDC: 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8
```

### Quick Start

1. **Configure**

   `frontend/.env.local`:
   ```
   NEXT_PUBLIC_CHAIN_ID=11155111
   NEXT_PUBLIC_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
   ```

   `backend/.env`:
   ```
   CHAIN_ID=11155111
   PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
   ```

2. **Start**: `npm run start:sepolia`

3. **Test CoW Settlement**:
   - Create offer → Take option → Settle
   - Watch 5-step CoW flow in UI
   - Settlement via batch auction

---

## 🔵 Base Mainnet Deployment

### Base Addresses
```
Pyth:            0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a
Uniswap Router:  0x2626664c2603336E57B271c5C0b26F421741e481
CoW Settlement:  0x9008D19f58AAbD9eD0D60971565AA8510560ab41
USDC:            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
WETH:            0x4200000000000000000000000000000000000006
```

### Deploy Script

Create `script/DeployBase.s.sol`:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptionsProtocolGasless.sol";

contract DeployBaseScript is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));

        OptionsProtocolGasless protocol = new OptionsProtocolGasless(
            0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a,  // Pyth
            0x2626664c2603336E57B271c5C0b26F421741e481,  // Uniswap
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,  // USDC
            msg.sender,                                  // Gas vault
            0x9008D19f58AAbD9eD0D60971565AA8510560ab41   // CoW
        );

        protocol.setTokenConfig(
            0x4200000000000000000000000000000000000006,  // WETH
            0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,  // USDC
            1e15, 0x2626664c2603336E57B271c5C0b26F421741e481, 500,
            0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace,
            address(0), address(0), address(0), address(0)
        );

        vm.stopBroadcast();
        console.log("Deployed:", address(protocol));
    }
}
```

### Deploy
```bash
forge script script/DeployBase.s.sol \
  --rpc-url https://mainnet.base.org \
  --broadcast --verify -vv
```

---

## ✅ Checklist

### Sepolia Testing
- [ ] Create/take/settle options
- [ ] Test CoW settlement flow
- [ ] Verify P&L calculations
- [ ] Check order on CoW API

### Base Production
- [ ] Security audit done
- [ ] Deploy contract
- [ ] Verify on Basescan
- [ ] Configure prod environment
- [ ] Deploy backend + frontend
- [ ] Monitor 24h with limits

---

## 📚 Docs

- [COW_BACKEND_ADDED.md](COW_BACKEND_ADDED.md) - Backend implementation
- [PROTOCOL_STATUS.md](PROTOCOL_STATUS.md) - Feature status
- https://docs.cow.fi/ - CoW Protocol docs

---

**Ready for Sepolia testing and Base deployment!** 🚀

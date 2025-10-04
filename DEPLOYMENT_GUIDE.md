# Options Protocol - Deployment Guide

Quick reference for deploying the Options Protocol to Base.

---

## 📋 Pre-Deployment Checklist

### 1. Get Required Accounts/Keys
- [ ] Reown Project ID: https://cloud.reown.com
- [ ] Base RPC URL (Alchemy/Infura)
- [ ] Deployer wallet with ETH on Base
- [ ] Broadcaster wallet (can be same as deployer)

### 2. Set Up Environment Variables

Create `.env` in project root:

```bash
# Blockchain
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
CHAIN_ID=8453

# Contract Addresses (Base Mainnet)
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
WETH_ADDRESS=0x4200000000000000000000000000000000000006
WBTC_ADDRESS=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
UNISWAP_V3_ROUTER=0x2626664c2603336E57B271c5C0b26F421741e481
PYTH_ADDRESS=0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a

# Pyth Price Feeds
PYTH_ETH_USD_FEED=0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace
PYTH_BTC_USD_FEED=0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43

# Private Keys
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
BROADCASTER_PRIVATE_KEY=your_broadcaster_private_key

# Backend API
API_PORT=3001
```

Backend `.env`:
```bash
BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_PROTOCOL_ADDRESS=<deployed_contract_address>
BROADCASTER_PRIVATE_KEY=your_broadcaster_private_key
WETH_ADDRESS=0x4200000000000000000000000000000000000006
WBTC_ADDRESS=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
PORT=3001
```

Frontend `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://your-backend-url.railway.app
NEXT_PUBLIC_REOWN_PROJECT_ID=your_reown_project_id
NEXT_PUBLIC_PROTOCOL_ADDRESS=<deployed_contract_address>
NEXT_PUBLIC_CHAIN_ID=8453
```

---

## 🚀 Step-by-Step Deployment

### Step 1: Deploy to Base Sepolia (Testnet)

```bash
# Build contracts
forge build

# Run tests to ensure everything works
forge test -vv

# Deploy to Sepolia testnet
forge script script/Deploy.s.sol \
  --rpc-url $BASE_SEPOLIA_RPC_URL \
  --broadcast \
  --verify

# Save the deployed contract address
export PROTOCOL_ADDRESS=<deployed_address>
```

### Step 2: Deploy Backend to Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Create new project
railway init

# Link to project
railway link

# Add environment variables via Railway dashboard or CLI
railway variables set BASE_RPC_URL=https://mainnet.base.org
railway variables set NEXT_PUBLIC_PROTOCOL_ADDRESS=$PROTOCOL_ADDRESS
railway variables set BROADCASTER_PRIVATE_KEY=your_key
# ... add all backend env vars

# Deploy backend
cd backend
railway up

# Note the backend URL for frontend config
export BACKEND_URL=<your-backend-url.railway.app>
```

### Step 3: Deploy Frontend to Railway/Vercel

#### Option A: Railway

```bash
# In root directory
cd frontend

# Deploy to Railway
railway up

# Frontend will be available at your Railway URL
```

#### Option B: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
cd frontend
vercel

# Add environment variables in Vercel dashboard
# - NEXT_PUBLIC_API_URL
# - NEXT_PUBLIC_REOWN_PROJECT_ID
# - NEXT_PUBLIC_PROTOCOL_ADDRESS
# - NEXT_PUBLIC_CHAIN_ID

# Deploy to production
vercel --prod
```

### Step 4: Test on Sepolia

1. Visit your frontend URL
2. Connect wallet to Base Sepolia
3. Get testnet ETH from faucet
4. Test writing an option:
   - Fill out form
   - Sign EIP-712 message
   - Submit offer
5. Test taking an option:
   - Select offer from orderbook
   - Set fill amount and duration
   - Execute transaction
6. Check portfolio for position
7. Test settlement (wait for expiry or use time travel in testing)

### Step 5: Deploy to Base Mainnet (Production)

**⚠️ Only after successful testing and audit!**

```bash
# Deploy contracts to Base mainnet
forge script script/Deploy.s.sol \
  --rpc-url $BASE_RPC_URL \
  --broadcast \
  --verify \
  --slow

# Update environment variables with mainnet contract address
# - Backend: NEXT_PUBLIC_PROTOCOL_ADDRESS
# - Frontend: NEXT_PUBLIC_PROTOCOL_ADDRESS

# Redeploy backend with new env vars
cd backend
railway up

# Redeploy frontend with new env vars
cd frontend
railway up  # or vercel --prod
```

---

## 🔧 Configuration Tasks

### Configure Token Settings

After deployment, configure supported tokens:

```bash
# Using cast (Foundry)
export PROTOCOL_ADDRESS=<your_contract_address>

# Configure WETH
cast send $PROTOCOL_ADDRESS \
  "setTokenConfig(address,address,address,uint24,uint256,uint256,address)" \
  $WETH_ADDRESS \                    # underlying
  $USDC_ADDRESS \                    # stablecoin
  $UNISWAP_V3_ROUTER \              # swapVenue
  3000 \                             # poolFee (0.3%)
  1000000000000000000 \             # minUnit (1.0 token)
  1000000 \                          # minPremium (1 USDC)
  0x0000000000000000000000000000000000000000 \  # hook
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY

# Configure WBTC
cast send $PROTOCOL_ADDRESS \
  "setTokenConfig(address,address,address,uint24,uint256,uint256,address)" \
  $WBTC_ADDRESS \
  $USDC_ADDRESS \
  $UNISWAP_V3_ROUTER \
  3000 \
  100000000 \                        # minUnit (0.001 BTC)
  1000000 \
  0x0000000000000000000000000000000000000000 \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

### Grant Broadcaster Role

```bash
# Get broadcaster role hash
BROADCASTER_ROLE=$(cast keccak "BROADCASTER_ROLE")

# Grant role to backend service
cast send $PROTOCOL_ADDRESS \
  "grantRole(bytes32,address)" \
  $BROADCASTER_ROLE \
  $BROADCASTER_ADDRESS \
  --rpc-url $BASE_RPC_URL \
  --private-key $DEPLOYER_PRIVATE_KEY
```

---

## 📊 Monitoring & Verification

### Verify Deployment

```bash
# Check contract is deployed
cast code $PROTOCOL_ADDRESS --rpc-url $BASE_RPC_URL

# Check contract owner
cast call $PROTOCOL_ADDRESS "owner()" --rpc-url $BASE_RPC_URL

# Check broadcaster has role
cast call $PROTOCOL_ADDRESS \
  "hasRole(bytes32,address)" \
  $BROADCASTER_ROLE \
  $BROADCASTER_ADDRESS \
  --rpc-url $BASE_RPC_URL

# Check WETH config
cast call $PROTOCOL_ADDRESS \
  "getTokenConfig(address)" \
  $WETH_ADDRESS \
  --rpc-url $BASE_RPC_URL
```

### Monitor Events

```bash
# Watch for OrderBroadcast events
cast logs \
  --address $PROTOCOL_ADDRESS \
  --from-block latest \
  "OrderBroadcast(bytes32,bool)" \
  --rpc-url $BASE_RPC_URL

# Watch for OptionTaken events
cast logs \
  --address $PROTOCOL_ADDRESS \
  --from-block latest \
  "OptionTaken(uint256,bytes32,address,uint256,uint256,uint64)" \
  --rpc-url $BASE_RPC_URL
```

### Health Checks

```bash
# Check backend health
curl https://your-backend-url.railway.app/api/health

# Check orderbook
curl https://your-backend-url.railway.app/api/orderbook/$WETH_ADDRESS

# Check frontend loads
curl https://your-frontend-url.railway.app
```

---

## 🐛 Troubleshooting

### Contract Deployment Fails

**Issue**: Deployment transaction fails
**Solutions**:
- Check deployer has enough ETH for gas
- Verify RPC URL is correct
- Check contract size isn't too large
- Enable via-ir in foundry.toml (already done)

### Backend Can't Connect to Contract

**Issue**: Backend errors when calling contract
**Solutions**:
- Verify NEXT_PUBLIC_PROTOCOL_ADDRESS is correct
- Check RPC URL is accessible
- Verify contract is deployed at address
- Check broadcaster private key is correct

### Frontend Can't Connect to Backend

**Issue**: API calls fail from frontend
**Solutions**:
- Verify NEXT_PUBLIC_API_URL is correct
- Check CORS is enabled in backend
- Verify backend is running and accessible
- Check Railway logs for errors

### Reown AppKit Won't Connect

**Issue**: Wallet connection fails
**Solutions**:
- Verify NEXT_PUBLIC_REOWN_PROJECT_ID is correct
- Check project is active on cloud.reown.com
- Verify chain ID matches (8453 for Base)
- Check browser console for errors

### Transactions Fail

**Issue**: Taking/settling options fails
**Solutions**:
- Check user has approved USDC spending
- Verify user has enough USDC for premium
- Check offer isn't expired
- Verify fill amount is within min/max
- Check duration is within range

---

## 🔒 Security Checklist

Before mainnet deployment:

- [ ] Smart contract professionally audited
- [ ] Private keys stored securely (not in code)
- [ ] Environment variables set correctly
- [ ] HTTPS enabled on all endpoints
- [ ] Rate limiting configured
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Backup deployer key stored safely
- [ ] Test all user flows on testnet
- [ ] Monitor gas prices before deployment
- [ ] Have rollback plan ready

---

## 📈 Post-Deployment Tasks

### Immediate (Day 1)
1. Monitor first transactions closely
2. Check event logs for errors
3. Verify orderbook updates correctly
4. Test all user flows with real users
5. Set up error alerting

### Week 1
1. Gather user feedback
2. Monitor gas usage
3. Check oracle price feeds
4. Verify settlement accuracy
5. Plan bug fixes

### Month 1
1. Analyze usage patterns
2. Plan Phase 2 features
3. Set up analytics dashboard
4. Community engagement
5. Marketing/partnerships

---

## 🎯 Success Metrics

Track these metrics post-launch:

### Protocol Metrics
- Total Value Locked (TVL)
- Number of offers created
- Number of options taken
- Settlement success rate
- Average premium paid
- Protocol fees collected

### User Metrics
- Unique users
- Wallet connections
- Email/social signups
- Active positions
- Portfolio P&L

### Technical Metrics
- API response times
- Contract gas usage
- Error rates
- Uptime
- Transaction success rate

---

## 📞 Support Resources

### Documentation
- README.md - Quick start
- CONVERSATION_CONTEXT.md - Development history
- IMPLEMENTATION_STATUS.md - Current status
- FRONTEND_COMPLETE.md - Frontend details

### External Services
- Railway: https://railway.app/dashboard
- Reown: https://cloud.reown.com
- Base: https://base.org
- Basescan: https://basescan.org

### Smart Contract Help
- Foundry Book: https://book.getfoundry.sh
- OpenZeppelin: https://docs.openzeppelin.com
- Solidity Docs: https://docs.soliditylang.org

---

## ✅ Final Pre-Launch Checklist

### Smart Contracts
- [ ] All tests passing (12/12)
- [ ] Professional audit complete
- [ ] Gas optimization verified
- [ ] Deployed to testnet
- [ ] Tested on testnet
- [ ] Ready for mainnet

### Backend
- [ ] Environment variables set
- [ ] Deployed to Railway
- [ ] Health check passing
- [ ] Event listeners working
- [ ] API endpoints tested
- [ ] Error tracking enabled

### Frontend
- [ ] Environment variables set
- [ ] Deployed to Railway/Vercel
- [ ] Reown AppKit working
- [ ] All pages loading
- [ ] Wallet connection working
- [ ] Transactions working

### Configuration
- [ ] Token configs set
- [ ] Broadcaster role granted
- [ ] Oracle feeds configured
- [ ] Fee collector set
- [ ] Admin controls tested

---

**You're ready to deploy! 🚀**

Start with Base Sepolia testnet, thoroughly test all features, then proceed to mainnet after audit completion.

Good luck! 🎉

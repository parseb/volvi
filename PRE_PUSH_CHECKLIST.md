# Pre-Push and Deployment Checklist

**Date**: 2025-10-22
**Contract**: 0x0c239d161780747763E13Bee4366Ad44D347608F (Base Mainnet)
**App URL**: https://app.volvi.xyz

---

## ✅ Smart Contract Deployment

- [x] **Contract deployed to Base Mainnet**
  - Address: `0x0c239d161780747763E13Bee4366Ad44D347608F`
  - Block: 37180459
  - Deployer: `0xedF541e93b8533ff1673131c8110823Af7AF2DF2`

- [ ] **Contract verified on BaseScan**
  - URL: https://basescan.org/address/0x0c239d161780747763E13Bee4366Ad44D347608F
  - Status: Check if source code is verified
  - [ ] If not verified, run verification command

- [ ] **Test contract functions**
  ```bash
  # Check USDC address
  cast call 0x0c239d161780747763E13Bee4366Ad44D347608F \
    "usdc()(address)" \
    --rpc-url https://mainnet.base.org

  # Should return: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  ```

---

## ✅ Code Repository

- [x] **Environment files protected**
  - .gitignore covers all .env files
  - Only .env.example files committed
  - Checked: No .env files staged

- [x] **Documentation updated**
  - [x] SPECIFICATION.md has mainnet address
  - [x] deployments/base-mainnet.txt created
  - [x] .env.example files updated with production values
  - [x] RAILWAY_DEPLOYMENT.md created

- [ ] **Commit all changes**
  ```bash
  git add -A
  git commit -m "feat: Production deployment ready - Base Mainnet contract deployed"
  ```

- [ ] **Push to GitHub**
  ```bash
  git push origin vincent-migration
  ```

- [ ] **Create release tag** (optional)
  ```bash
  git tag -a v1.0.0-mainnet -m "Base Mainnet Production Deployment"
  git push origin v1.0.0-mainnet
  ```

---

## ✅ Vincent Dashboard Configuration

- [ ] **Update Vincent App settings**
  1. Go to: https://dashboard.heyvincent.ai/
  2. Open your app
  3. **Add production redirect URI**:
     - Add: `https://app.volvi.xyz/callback`
     - Keep: `http://localhost:5173/callback` (for local dev)
  4. **Update App User URL**: `https://app.volvi.xyz`
  5. Verify App ID and Delegatee keys are saved

- [ ] **Verify abilities are registered**
  - [ ] Create Profile (QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15)
  - [ ] Create Offer (QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE)
  - [ ] Take Option (Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L)
  - [ ] Settle Option (QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM)

---

## ✅ Railway Backend Deployment

- [ ] **Create Railway project**
  1. Go to: https://railway.app/
  2. New Project → Deploy from GitHub
  3. Select repository
  4. Root directory: `packages/backend`

- [ ] **Add MongoDB database**
  1. New → Database → MongoDB
  2. Copy connection string reference

- [ ] **Configure environment variables** (copy from Railway docs)
  - [ ] VINCENT_APP_ID
  - [ ] DELEGATEE_PRIVATE_KEY
  - [ ] ALLOWED_AUDIENCE=https://app.volvi.xyz
  - [ ] CREATE_PROFILE_ABILITY_CID
  - [ ] CREATE_OFFER_ABILITY_CID
  - [ ] TAKE_OPTION_ABILITY_CID
  - [ ] SETTLE_OPTION_ABILITY_CID
  - [ ] CHAIN_ID=8453
  - [ ] RPC_URL=https://mainnet.base.org
  - [ ] OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F
  - [ ] USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  - [ ] MONGODB_URI=${{MongoDB.MONGO_URL}}
  - [ ] USE_MONGODB=true
  - [ ] PORT=3001
  - [ ] NODE_ENV=production
  - [ ] CORS_ALLOWED_DOMAIN=https://app.volvi.xyz
  - [ ] LOG_LEVEL=info

- [ ] **Deploy backend**
  - Click "Deploy"
  - Wait for build to complete
  - Copy Railway URL (e.g., https://volvi-backend.up.railway.app)

- [ ] **Test backend health**
  ```bash
  curl https://YOUR-RAILWAY-URL/health
  # Should return: {"status":"ok"}
  ```

- [ ] **Check logs for errors**
  - Verify MongoDB connection
  - Check for any startup errors

---

## ✅ Frontend Deployment (Vercel/Netlify)

- [ ] **Deploy to Vercel/Netlify**
  1. Connect GitHub repository
  2. Root directory: `packages/frontend`
  3. Build command: `pnpm build`
  4. Output directory: `dist`

- [ ] **Configure environment variables**
  - [ ] VITE_VINCENT_APP_ID (same as backend)
  - [ ] VITE_REDIRECT_URI=https://app.volvi.xyz/callback
  - [ ] VITE_BACKEND_URL=https://YOUR-RAILWAY-URL.railway.app
  - [ ] VITE_CHAIN_ID=8453
  - [ ] VITE_RPC_URL=https://mainnet.base.org
  - [ ] VITE_OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F
  - [ ] VITE_ENV=production

- [ ] **Configure custom domain**
  - Add domain: `app.volvi.xyz`
  - Configure DNS settings
  - Wait for SSL certificate

- [ ] **Test frontend**
  - [ ] Opens at https://app.volvi.xyz
  - [ ] No console errors
  - [ ] Assets load correctly

---

## ✅ Integration Testing

- [ ] **Test Vincent authentication**
  1. Go to https://app.volvi.xyz
  2. Click "Connect with Vincent"
  3. Should redirect to Vincent
  4. Authenticate and create PKP
  5. Should redirect back to app successfully

- [ ] **Test backend connection**
  - Check Network tab for API calls
  - Verify /health endpoint responds
  - Check for CORS errors

- [ ] **Test database**
  - Check Railway logs for MongoDB connection
  - Verify collections are created

- [ ] **Test full flow with small amounts**
  1. [ ] Get test USDC (small amount, like $10)
  2. [ ] Approve USDC spending
  3. [ ] Create liquidity profile
  4. [ ] Create option offer
  5. [ ] Take option (with second account if possible)
  6. [ ] Verify all transactions succeed
  7. [ ] Check database for persisted data

---

## ✅ Monitoring and Alerts

- [ ] **Set up error tracking**
  - [ ] Sentry or similar (optional but recommended)
  - [ ] Configure for both frontend and backend

- [ ] **Configure Railway alerts**
  - [ ] Email/Slack notifications
  - [ ] Alert on crashes
  - [ ] Alert on high error rates

- [ ] **Monitor gas costs**
  - Watch actual deployment gas costs
  - Monitor user transaction costs
  - Verify gas sponsorship working (if enabled)

---

## ✅ Security Final Check

- [ ] **No secrets in repository**
  ```bash
  # Double check
  git diff --cached | grep -i "private.*key\|secret\|password"
  # Should return nothing
  ```

- [ ] **Environment variables secure**
  - [ ] Railway secrets are encrypted
  - [ ] Vincent delegatee key secured
  - [ ] No keys in logs

- [ ] **Contract security**
  - [ ] Consider security audit (if budget allows)
  - [ ] Set up monitoring (Tenderly, OpenZeppelin Defender)
  - [ ] Review contract permissions

- [ ] **Access control**
  - [ ] GitHub repository settings reviewed
  - [ ] Railway project access restricted
  - [ ] Vincent Dashboard access secured

---

## ✅ Documentation

- [ ] **README.md updated**
  - [ ] Production URLs included
  - [ ] Deployment status reflected
  - [ ] Installation instructions clear

- [ ] **API documentation**
  - [ ] Backend endpoints documented
  - [ ] Example requests/responses
  - [ ] Error codes explained

- [ ] **User guides** (if applicable)
  - [ ] How to connect wallet
  - [ ] How to create profiles
  - [ ] How to trade options

---

## ✅ Pre-Launch

- [ ] **Announce preparation**
  - [ ] Social media posts prepared
  - [ ] Launch announcement ready
  - [ ] Community notified

- [ ] **Support ready**
  - [ ] Support email/channel set up
  - [ ] FAQ prepared
  - [ ] Team ready to respond

- [ ] **Backup plan**
  - [ ] Rollback procedure documented
  - [ ] Emergency contacts listed
  - [ ] Incident response plan ready

---

## 🚀 Launch Checklist

When all above items are checked:

- [ ] **Final smoke test**
  - [ ] Complete one full trade cycle
  - [ ] Verify all functions work
  - [ ] Check logs for warnings/errors

- [ ] **Go live**
  - [ ] Announce on Twitter/X
  - [ ] Post in Discord/Telegram
  - [ ] Update website (if applicable)

- [ ] **Monitor closely for 24-48 hours**
  - [ ] Watch error rates
  - [ ] Monitor user feedback
  - [ ] Be ready for quick fixes

---

## 📊 Success Metrics to Track

After launch, monitor:

- [ ] **User engagement**
  - Total users connected
  - Profiles created
  - Offers created
  - Options taken

- [ ] **Technical health**
  - API response times
  - Error rates
  - Database performance
  - Gas costs

- [ ] **Business metrics**
  - Total value locked
  - Trading volume
  - User retention
  - Transaction count

---

## ✅ Current Status Summary

### Completed ✅
- Smart contract deployed to Base Mainnet
- Contract address added to .env files
- Documentation updated with mainnet address
- Railway deployment guide created
- .env.example files configured for production

### To Do Before Push 📝
- [ ] Verify contract on BaseScan
- [ ] Commit and push changes
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Vercel
- [ ] Update Vincent Dashboard
- [ ] Complete integration testing

### After Railway Deployment 🚂
- [ ] Update frontend VITE_BACKEND_URL with Railway URL
- [ ] Redeploy frontend
- [ ] Complete full flow testing
- [ ] Set up monitoring
- [ ] Announce launch 🎉

---

**Ready to push?** Make sure all ✅ items above are completed!

**Questions?** See RAILWAY_DEPLOYMENT.md for detailed deployment steps.

Good luck with your launch! 🚀

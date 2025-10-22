# Railway Deployment Fix

## Issue Summary

You're experiencing two common Railway monorepo issues:

1. **Backend**: `Cannot find module '/app/src/index.js'` - Railway looking in wrong directory
2. **Frontend**: `Dockerfile does not exist` - Railway trying to use Docker instead of Nixpacks

## ✅ Solution: Configuration Files Added

I've created the necessary config files in both packages:

### Backend (`packages/backend/`)
- `railway.json` - Railway deployment config
- `nixpacks.toml` - Nixpacks build config
- `Procfile` - Backup start command

### Frontend (`packages/frontend/`)
- `railway.json` - Railway deployment config
- `nixpacks.toml` - Nixpacks build config

These tell Railway:
- Where to find the code
- How to build it (TypeScript → JavaScript)
- How to run it (node dist/index.js)

---

## 🚂 Backend Deployment Fix

### Option A: Auto-Detection (Recommended)

1. **Commit and push** the new config files:
   ```bash
   git add packages/backend/railway.json packages/backend/nixpacks.toml packages/backend/Procfile
   git commit -m "fix: Add Railway config for backend"
   git push
   ```

2. In Railway:
   - Go to your backend service
   - Click "Settings" → "Deploy"
   - Click "Redeploy" or trigger new deployment

Railway should now auto-detect the config and use:
- Build: `pnpm install && pnpm build`
- Start: `node dist/index.js`

### Option B: Manual Configuration

If auto-detection doesn't work, manually configure in Railway:

1. Go to backend service → "Settings" → "Deploy"

2. Set these values:
   ```
   Root Directory: packages/backend
   Build Command: pnpm install && pnpm build
   Start Command: node dist/index.js
   Builder: Nixpacks
   ```

3. Add environment variables (if not already added):
   ```bash
   VINCENT_APP_ID=your_app_id
   DELEGATEE_PRIVATE_KEY=0x...
   ALLOWED_AUDIENCE=https://app.volvi.xyz

   # All the ability CIDs from .env.example
   CREATE_PROFILE_ABILITY_CID=QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15
   CREATE_OFFER_ABILITY_CID=QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE
   TAKE_OPTION_ABILITY_CID=Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L
   SETTLE_OPTION_ABILITY_CID=QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM

   CHAIN_ID=8453
   RPC_URL=https://mainnet.base.org
   OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F
   USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

   MONGODB_URI=${{MongoDB.MONGO_URL}}
   USE_MONGODB=true

   PORT=3001
   NODE_ENV=production
   CORS_ALLOWED_DOMAIN=https://app.volvi.xyz
   LOG_LEVEL=info
   ```

4. Click "Redeploy"

5. Check logs - should see:
   ```
   ✅ MongoDB connected successfully
   Server listening on port 3001
   ```

---

## 🌐 Frontend Deployment - Use Vercel Instead

**Railway is not ideal for static sites like Vite.** Use Vercel or Netlify instead.

### Why?
- Railway tries to run a server (overkill for static site)
- Vercel/Netlify are optimized for static React/Vite apps
- Better performance, CDN, automatic HTTPS
- Free tier is more generous

### Deploy to Vercel (Recommended)

1. Go to https://vercel.com/
2. "Add New" → "Project"
3. Import from GitHub
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

5. Add Environment Variables:
   ```bash
   VITE_VINCENT_APP_ID=your_app_id_here
   VITE_REDIRECT_URI=https://app.volvi.xyz/callback
   VITE_BACKEND_URL=https://YOUR-RAILWAY-BACKEND-URL.railway.app
   VITE_CHAIN_ID=8453
   VITE_RPC_URL=https://mainnet.base.org
   VITE_OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F
   VITE_ENV=production
   ```

6. Deploy

7. Add custom domain: `app.volvi.xyz`
   - Settings → Domains → Add `app.volvi.xyz`
   - Configure DNS as instructed

### If You Must Use Railway for Frontend

1. Push the config files:
   ```bash
   git add packages/frontend/railway.json packages/frontend/nixpacks.toml
   git commit -m "fix: Add Railway config for frontend"
   git push
   ```

2. In Railway Settings → Deploy:
   ```
   Root Directory: packages/frontend
   Build Command: pnpm install && pnpm build
   Start Command: pnpm preview --port $PORT --host 0.0.0.0
   Builder: Nixpacks (NOT Docker!)
   ```

3. Add all environment variables

4. Redeploy

**Note**: This runs `vite preview` which is not recommended for production. Vercel is better.

---

## 🧪 Testing After Fix

### Test Backend

```bash
# Check health endpoint
curl https://YOUR-BACKEND.railway.app/health

# Should return:
{"status":"ok"}
```

### Test Frontend

1. Open https://app.volvi.xyz (or Railway URL if using Railway)
2. Check browser console - no errors
3. Try connecting with Vincent
4. Should authenticate successfully

---

## 📋 Quick Checklist

**Backend on Railway:**
- [ ] Config files committed and pushed
- [ ] Railway redeployed
- [ ] Logs show successful start
- [ ] Health endpoint responds
- [ ] MongoDB connected

**Frontend on Vercel:**
- [ ] Project created in Vercel
- [ ] Environment variables added
- [ ] Build succeeds
- [ ] Custom domain configured (`app.volvi.xyz`)
- [ ] Site loads without errors

**Integration:**
- [ ] Vincent Dashboard has redirect URI: `https://app.volvi.xyz/callback`
- [ ] Backend CORS allows: `https://app.volvi.xyz`
- [ ] Frontend has correct backend URL
- [ ] Test full authentication flow

---

## 🆘 Still Having Issues?

### Backend still failing?

Check Railway logs for:
```bash
# Good - Backend started
✅ MongoDB connected successfully
Server listening on port 3001

# Bad - Module not found
Error: Cannot find module '/app/src/index.js'
→ Config not detected, set manually

# Bad - Env var missing
Error: VINCENT_APP_ID is required
→ Add environment variable

# Bad - MongoDB error
Error: connect ECONNREFUSED
→ Check MONGODB_URI is set to ${{MongoDB.MONGO_URL}}
```

### Frontend build failing?

1. **On Railway**: Switch to Vercel (seriously, it's better)
2. **On Vercel**:
   - Check build logs for errors
   - Verify all `VITE_*` env vars are set
   - Ensure node version is 20+ (usually auto-detected)

### CORS errors?

Backend needs:
```bash
CORS_ALLOWED_DOMAIN=https://app.volvi.xyz
ALLOWED_AUDIENCE=https://app.volvi.xyz
```

Frontend needs:
```bash
VITE_BACKEND_URL=https://your-backend.railway.app
```

---

## ✅ Summary

**What I Fixed:**
1. Created Railway config files for both packages
2. Specified correct build/start commands
3. Added troubleshooting to RAILWAY_DEPLOYMENT.md

**What You Need To Do:**
1. Commit and push the new config files
2. Redeploy backend on Railway (should work now)
3. Deploy frontend on Vercel (not Railway!)
4. Test integration

**Expected Result:**
- Backend: Running on Railway at `https://your-backend.railway.app`
- Frontend: Running on Vercel at `https://app.volvi.xyz`
- Both talking to each other via configured URLs
- Vincent authentication working

Good luck! 🚀

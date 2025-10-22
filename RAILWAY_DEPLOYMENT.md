# Railway Deployment Guide

**App URL**: https://app.volvi.xyz
**Backend URL**: TBD (Railway will generate)
**Smart Contract**: 0x0c239d161780747763E13Bee4366Ad44D347608F (Base Mainnet)

---

## 🚂 Deploy Backend to Railway

### 1. Create Railway Project

1. Go to https://railway.app/
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose your repository
5. Select `packages/backend` as the root directory

### 2. Configure Environment Variables

In Railway dashboard, add these environment variables:

```bash
# Vincent Configuration (from Vincent Dashboard)
VINCENT_APP_ID=your_app_id_here
DELEGATEE_PRIVATE_KEY=0x... (your Vincent delegatee key)
ALLOWED_AUDIENCE=https://app.volvi.xyz

# Vincent Ability IPFS CIDs
CREATE_PROFILE_ABILITY_CID=QmWKSV282p3NCWn7WaPW43KtrPqgAtzTK7A2DGYTTdXh15
CREATE_OFFER_ABILITY_CID=QmeuzKma2HrfGyMpvZj19TY15E3JJe4UjS4heYNdwwCQKE
TAKE_OPTION_ABILITY_CID=Qma41tK42VBM5fjqFKzdktzb7yLjZGGjjJsi1VK6ewnR1L
SETTLE_OPTION_ABILITY_CID=QmWFd4yeYpat1ZL69KKutkCfPbMnKF6WP4WmFx17uGX1eM

# Blockchain Configuration (Base Mainnet)
CHAIN_ID=8453
RPC_URL=https://mainnet.base.org
OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F
USDC_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Database Configuration (Railway will provide MongoDB)
MONGODB_URI=${{MongoDB.MONGO_URL}} (use Railway reference)
USE_MONGODB=true

# Server Configuration
PORT=3001
NODE_ENV=production
CORS_ALLOWED_DOMAIN=https://app.volvi.xyz
LOG_LEVEL=info

# Optional: Alchemy (if using)
ALCHEMY_API_KEY=your_alchemy_key (optional)
ALCHEMY_POLICY_ID=your_policy_id (optional)
```

### 3. Add MongoDB Database

1. In Railway project, click "New"
2. Select "Database" → "MongoDB"
3. Railway will automatically create `MONGO_URL` variable
4. Update backend env: `MONGODB_URI=${{MongoDB.MONGO_URL}}`

### 4. Configure Build Settings

Railway should auto-detect from `railway.json` and `nixpacks.toml`.

**If auto-detection fails**, manually set in Settings → Deploy:
- **Root Directory**: `/packages/backend` (or leave empty if deploying from backend folder)
- **Build Command**: `pnpm install && pnpm build`
- **Start Command**: `node dist/index.js`
- **Watch Paths**: `/packages/backend/**`

**Important**: Railway needs to:
1. Install dependencies: `pnpm install`
2. Build TypeScript: `pnpm build` (creates `dist/` folder)
3. Run compiled code: `node dist/index.js`

### 5. Deploy

1. Click "Deploy"
2. Wait for build to complete
3. Copy the generated Railway URL (e.g., `https://volvi-backend.up.railway.app`)
4. This is your backend URL!

---

## 🌐 Deploy Frontend to Vercel/Netlify

### Option A: Vercel (Recommended)

1. Go to https://vercel.com/
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `packages/frontend`
   - **Build Command**: `pnpm build`
   - **Output Directory**: `dist`
   - **Install Command**: `pnpm install`

5. Add Environment Variables:

```bash
# Vincent Configuration
VITE_VINCENT_APP_ID=your_app_id_here
VITE_REDIRECT_URI=https://app.volvi.xyz/callback

# Backend API (from Railway)
VITE_BACKEND_URL=https://volvi-backend.up.railway.app

# Blockchain Configuration
VITE_CHAIN_ID=8453
VITE_RPC_URL=https://mainnet.base.org
VITE_OPTIONS_PROTOCOL_ADDRESS=0x0c239d161780747763E13Bee4366Ad44D347608F

# Environment
VITE_ENV=production
```

6. Click "Deploy"
7. Configure custom domain:
   - Go to Settings → Domains
   - Add `app.volvi.xyz`
   - Follow DNS configuration instructions

### Option B: Netlify

Similar process:
1. Connect GitHub repo
2. Set build settings:
   - **Base directory**: `packages/frontend`
   - **Build command**: `pnpm build`
   - **Publish directory**: `packages/frontend/dist`
3. Add same environment variables as above
4. Configure custom domain

---

## 📝 Post-Deployment Checklist

### 1. Update Vincent Dashboard

1. Go to https://dashboard.heyvincent.ai/
2. Open your app settings
3. Update **Redirect URIs**:
   - Add: `https://app.volvi.xyz/callback`
   - Remove: `http://localhost:5173/callback` (if you want)

### 2. Test Backend Health

```bash
curl https://YOUR-RAILWAY-URL.railway.app/health

# Should return:
# {"status":"ok"}
```

### 3. Test Frontend

1. Open https://app.volvi.xyz
2. Click "Connect with Vincent"
3. Authenticate and create PKP
4. Should redirect successfully

### 4. Test Database Connection

Check Railway logs:
```
✅ MongoDB connected successfully
Server listening on port 3001
```

### 5. Test Full Flow

1. **Approve USDC**: Test with small amount ($10)
2. **Create Profile**: Verify profile creation
3. **Create Offer**: Check orderbook updates
4. **Take Option**: Test gasless taking
5. **Monitor Logs**: Check Railway logs for errors

---

## 🔧 Troubleshooting

### Backend Won't Start

**Error: `Cannot find module '/app/src/index.js'`**

This means Railway is looking in the wrong location. The fix:

1. **Railway should auto-detect** the config files (`railway.json`, `nixpacks.toml`)
2. If not, manually set in Railway dashboard:
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `node dist/index.js`
   - **Root Directory**: `/packages/backend`

**Check Railway logs for other errors:**

1. MongoDB connection issues:
   ```
   Error: MONGODB_URI not set
   ```
   → Add MONGODB_URI with Railway reference: `${{MongoDB.MONGO_URL}}`

2. Missing environment variables:
   ```
   Error: VINCENT_APP_ID is required
   ```
   → Add all required env vars from .env.example

3. Build failures:
   ```
   Error: Cannot find module
   ```
   → Check pnpm install ran successfully
   → Verify package.json scripts
   → Ensure TypeScript compiled (check for `dist/` folder in logs)

### Frontend Won't Build

**Error: `Dockerfile does not exist`**

Railway is trying to use Docker but frontend is a static Vite site. The fix:

1. **Railway should auto-detect** from `railway.json` and `nixpacks.toml`
2. If not, in Railway Settings → Deploy:
   - **Builder**: Select "Nixpacks" (not Docker)
   - **Build Command**: `pnpm install && pnpm build`
   - **Start Command**: `pnpm preview --port $PORT --host 0.0.0.0`
   - **Root Directory**: `/packages/frontend`

**Note**: For production, Vercel or Netlify are better choices for static sites than Railway.

### Frontend Can't Connect to Backend

1. **CORS Error**:
   - Check backend `CORS_ALLOWED_DOMAIN=https://app.volvi.xyz`
   - Verify Railway URL is correct in frontend env

2. **404 Errors**:
   - Verify backend is deployed and running
   - Check backend URL in frontend: `VITE_BACKEND_URL`

3. **API Errors**:
   - Check Railway logs for backend errors
   - Verify all env vars are set correctly

### Vincent Authentication Fails

1. **Redirect URI mismatch**:
   - Verify `VITE_REDIRECT_URI=https://app.volvi.xyz/callback`
   - Check Vincent Dashboard has this URI registered
   - Must match exactly (including https://)

2. **Invalid App ID**:
   - Verify `VITE_VINCENT_APP_ID` matches backend `VINCENT_APP_ID`
   - Both must match Vincent Dashboard

### Database Issues

1. **Connection timeout**:
   - Check Railway MongoDB is running
   - Verify `MONGODB_URI` is set correctly
   - Check Railway logs for connection errors

2. **Data not persisting**:
   - Verify `USE_MONGODB=true`
   - Check MongoDB connection logs
   - Ensure database collections are created

---

## 📊 Monitoring

### Railway Dashboard

Monitor:
- CPU usage
- Memory usage
- Request count
- Error rates

### Logs

```bash
# Real-time logs
railway logs --tail

# Filter errors
railway logs | grep ERROR
```

### Alerts

Set up in Railway:
1. Go to Settings → Notifications
2. Add email/Slack webhook
3. Configure alerts for:
   - High error rates
   - Service crashes
   - Memory/CPU limits

---

## 🔐 Security Best Practices

1. **Environment Variables**:
   - Never commit .env files
   - Use Railway's secret management
   - Rotate keys periodically

2. **Database**:
   - Enable Railway backup (Settings → Backup)
   - Use strong MongoDB password
   - Restrict IP access if possible

3. **API Security**:
   - CORS properly configured
   - Rate limiting enabled (if implemented)
   - Validate all inputs

4. **Monitoring**:
   - Set up error tracking (Sentry, etc.)
   - Monitor unusual activity
   - Regular security audits

---

## 📈 Scaling

### Backend Scaling

Railway auto-scales, but you can:
1. Increase resources in Settings
2. Add replicas for high traffic
3. Consider Redis for caching

### Database Scaling

1. MongoDB Atlas (upgrade from Railway if needed)
2. Add indexes for performance
3. Regular maintenance and backups

---

## ✅ Final Verification

Before announcing launch:

- [ ] Backend deployed and healthy
- [ ] Frontend deployed at app.volvi.xyz
- [ ] Vincent authentication working
- [ ] Database connected and persisting
- [ ] Full flow tested (create profile → offer → take → settle)
- [ ] Contract verified on BaseScan
- [ ] Monitoring and alerts configured
- [ ] DNS configured correctly
- [ ] SSL certificates active
- [ ] Error tracking set up

---

## 🚀 You're Live!

Once all checks pass:
1. Announce on social media
2. Share app.volvi.xyz
3. Monitor closely for first 24-48 hours
4. Be ready to respond to issues quickly
5. Collect user feedback

**Need help?** Check Railway docs or contact support.

Good luck! 🎉

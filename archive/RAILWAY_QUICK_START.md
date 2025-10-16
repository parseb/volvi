# Railway Quick Start Guide

Your Docker containers are **100% compatible** with Railway! Here's the quick version:

## TL;DR

Railway doesn't use docker-compose, but uses your Dockerfiles. Deploy each service separately:

1. **PostgreSQL** - Add from Railway template
2. **Redis** - Add from Railway template
3. **Backend** - Deploy from GitHub using `backend/Dockerfile`
4. **Frontend** - Deploy from GitHub using `frontend/Dockerfile`

## 5-Minute Deployment

### 1. Create Project
```
1. Go to railway.app
2. New Project → Empty Project
3. Name: "options-protocol"
```

### 2. Add Databases
```
Click "+ New" → Database → PostgreSQL
Click "+ New" → Database → Redis
```
✅ Done! `DATABASE_URL` and `REDIS_URL` auto-created

### 3. Deploy Backend
```
Click "+ New" → GitHub Repo → Select your repo
Settings → Service:
  - Dockerfile Path: backend/Dockerfile
Settings → Environment → Raw Editor:
  DATABASE_URL=${{Postgres.DATABASE_URL}}
  REDIS_URL=${{Redis.REDIS_URL}}
  USE_POSTGRES=true
  (copy rest from .env.railway.backend)
Settings → Networking → Generate Domain
```

### 4. Deploy Frontend
```
Click "+ New" → GitHub Repo → Select same repo
Settings → Service:
  - Root Directory: frontend
  - Dockerfile Path: Dockerfile
Settings → Environment → Raw Editor:
  NEXT_PUBLIC_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}
  (copy rest from .env.railway.frontend)
Settings → Networking → Generate Domain
```

### 5. Done!
Visit your frontend URL. Your app is live! 🚀

## Key Differences from Docker Compose

| Docker Compose (Local) | Railway (Production) |
|------------------------|----------------------|
| Single `docker-compose up` | Separate services in one project |
| DIY PostgreSQL container | Managed PostgreSQL service |
| DIY Redis container | Managed Redis service |
| Manual networking | Auto-connected private network |
| Local only | Public URLs + auto-deploy from git |

## What You Already Have

✅ **backend/Dockerfile** - Works on Railway
✅ **frontend/Dockerfile** - Works on Railway
✅ **backend/db/init.sql** - Auto-runs on first connection
✅ **PostgreSQL storage** - Already implemented
✅ **Redis caching** - Already implemented
✅ **Health checks** - Already implemented

## Environment Variables Cheat Sheet

**Backend:**
```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
USE_POSTGRES=true
PORT=3001
NODE_ENV=production
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SEPOLIA_PROTOCOL_ADDRESS=0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce
BASE_SEPOLIA_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
COW_API_BASE_URL=https://api.cow.fi
```

**Frontend:**
```bash
NEXT_PUBLIC_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=<your_id>
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111
NODE_ENV=production
```

## Cost

~**$6/month** total (includes $5 subscription + ~$1 usage)

Railway gives you $5 credit/month, so hobby projects are essentially free.

## Auto-Deploy

Push to GitHub → Railway auto-deploys. That's it!

```bash
git push origin main
# Railway deploys automatically
```

## Common Commands

```bash
# View logs
railway logs --service backend

# Run database query
railway run --service postgres psql $DATABASE_URL

# Connect to Redis
railway run --service redis redis-cli -u $REDIS_URL

# Redeploy
railway redeploy --service backend
```

## Monitoring

Each service has:
- Real-time logs
- CPU/Memory metrics
- Request counts
- Health checks

Access via Railway dashboard.

## Troubleshooting

**"Database connection failed"**
→ Check `DATABASE_URL` is set to `${{Postgres.DATABASE_URL}}`

**"Frontend can't reach backend"**
→ Check `NEXT_PUBLIC_API_URL` uses `${{Backend.RAILWAY_PUBLIC_DOMAIN}}`

**"Build failed"**
→ Check logs, verify Dockerfile path is correct

## Full Documentation

See [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md) for complete guide.

## Summary

Your existing Docker setup is Railway-ready! The only change is deploying services separately instead of using docker-compose. Everything else stays the same.

**Local Development:**
```bash
npm run docker:dev  # Use docker-compose
```

**Production (Railway):**
- Deploy each service separately
- Railway manages databases
- Auto-deploy from GitHub
- Public URLs + SSL included

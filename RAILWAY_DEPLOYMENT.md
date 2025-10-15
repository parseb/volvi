# Railway Deployment Guide

This guide explains how to deploy the Options Protocol application to Railway.app.

## Overview

Railway deployment uses **separate services** instead of docker-compose:

1. **PostgreSQL Service** - Managed database (from Railway template)
2. **Redis Service** - Managed cache (from Railway template)
3. **Backend Service** - Express.js API (from your Dockerfile)
4. **Frontend Service** - Next.js app (from your Dockerfile)

All services are deployed in a single Railway project and communicate via internal networking.

## Prerequisites

- Railway account (sign up at https://railway.app)
- GitHub account (for automatic deployments)
- Your repository pushed to GitHub

## Architecture on Railway

```
┌─────────────────────────────────────────────┐
│           Railway Project                   │
│                                             │
│  ┌──────────────┐      ┌──────────────┐   │
│  │   Frontend   │─────▶│   Backend    │   │
│  │   Service    │      │   Service    │   │
│  └──────────────┘      └───┬──────┬───┘   │
│                            │      │        │
│                  ┌─────────┘      └───────┐│
│                  ▼                         ▼│
│           ┌──────────────┐      ┌──────────────┐
│           │  PostgreSQL  │      │    Redis     │
│           │   Service    │      │   Service    │
│           └──────────────┘      └──────────────┘
└─────────────────────────────────────────────┘
```

## Step-by-Step Deployment

### 1. Create Railway Project

1. Go to https://railway.app
2. Click "New Project"
3. Choose "Empty Project"
4. Name it "options-protocol"

### 2. Add PostgreSQL Service

1. Click "+ New" in your project
2. Select "Database" → "PostgreSQL"
3. Railway automatically provisions a PostgreSQL instance
4. Note: The `DATABASE_URL` variable is automatically created

### 3. Add Redis Service

1. Click "+ New" in your project
2. Select "Database" → "Redis"
3. Railway automatically provisions a Redis instance
4. Note: The `REDIS_URL` variable is automatically created

### 4. Deploy Backend Service

#### Option A: From GitHub (Recommended)

1. Click "+ New" in your project
2. Select "GitHub Repo"
3. Authorize Railway to access your GitHub account
4. Select your `options-protocol` repository
5. Railway will detect the repository

#### Configure Backend Service:

1. Click on the backend service
2. Go to "Settings" → "Service"
3. Set **Root Directory**: Leave empty (or `/` if required)
4. Set **Dockerfile Path**: `backend/Dockerfile`
5. Go to "Settings" → "Environment"
6. Click "Raw Editor" and paste from [.env.railway.backend](.env.railway.backend):

```bash
# Railway will auto-fill these from connected services
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# Add these manually
USE_POSTGRES=true
PORT=3001
NODE_ENV=production
BASE_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
SEPOLIA_PROTOCOL_ADDRESS=0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce
BASE_SEPOLIA_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
BASE_MAINNET_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
PYTH_MAINNET=0x4305FB66699C3B2702D4d05CF36551390A4c69C6
PYTH_SEPOLIA=0xDd24F84d36BF92C65F92307595335bdFab5Bbd21
PYTH_BASE_SEPOLIA=0xA2aa501b19aff244D90cc15a4Cf739D2725B5729
COW_API_BASE_URL=https://api.cow.fi
LOG_LEVEL=info
```

7. Go to "Settings" → "Networking"
8. Click "Generate Domain" to get a public URL for your backend

#### Option B: From CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy backend
railway up --service backend
```

### 5. Deploy Frontend Service

1. In the same Railway project, click "+ New"
2. Select "GitHub Repo" → Choose same repository
3. Railway creates a second service from the same repo

#### Configure Frontend Service:

1. Click on the frontend service
2. Go to "Settings" → "Service"
3. Set **Root Directory**: `frontend`
4. Set **Dockerfile Path**: `Dockerfile`
5. Go to "Settings" → "Environment"
6. Click "Raw Editor" and paste:

```bash
# Backend connection - Railway auto-fills this
NEXT_PUBLIC_API_URL=https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}

# Add your WalletConnect project ID
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wallet_connect_project_id

# Default chain
NEXT_PUBLIC_DEFAULT_CHAIN_ID=11155111

# Environment
NODE_ENV=production
```

7. Go to "Settings" → "Networking"
8. Click "Generate Domain" to get a public URL for your frontend

### 6. Connect Services

Railway automatically creates service references:

- `${{Postgres.DATABASE_URL}}` - PostgreSQL connection string
- `${{Redis.REDIS_URL}}` - Redis connection string
- `${{Backend.RAILWAY_PUBLIC_DOMAIN}}` - Backend service URL
- `${{Frontend.RAILWAY_PUBLIC_DOMAIN}}` - Frontend service URL

These references are automatically resolved at runtime.

### 7. Initialize Database

The database schema is automatically initialized when the backend starts (via [backend/db/init.sql](backend/db/init.sql)).

To manually run initialization:

1. Open Railway dashboard
2. Click on PostgreSQL service
3. Click "Data" tab
4. Click "Query" tab
5. Paste contents of `backend/db/init.sql`
6. Click "Execute"

Or use Railway CLI:

```bash
railway run --service postgres psql $DATABASE_URL < backend/db/init.sql
```

### 8. Update CORS Settings

After frontend is deployed:

1. Go to Backend service settings
2. Update `CORS_ORIGIN` environment variable:
```bash
CORS_ORIGIN=https://your-frontend-domain.railway.app
```

### 9. Verify Deployment

1. Visit your frontend URL (e.g., `https://options-protocol-production.up.railway.app`)
2. Check backend health: `https://your-backend.railway.app/api/health`
3. Expected response:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "database": "connected",
  "redis": "connected"
}
```

## Railway Service Configuration Files

The repository includes Railway configuration files:

- **[railway.json](railway.json)** - Backend service config
- **[frontend/railway.json](frontend/railway.json)** - Frontend service config

These files tell Railway to use Docker builds instead of Nixpacks.

## Environment Variable Reference

### Backend Service Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Auto (Postgres) | PostgreSQL connection string |
| `REDIS_URL` | Auto (Redis) | Redis connection string |
| `USE_POSTGRES` | Manual | Set to `true` for production |
| `PORT` | Manual | Backend port (3001) |
| `NODE_ENV` | Manual | Set to `production` |
| `BASE_RPC_URL` | Manual | Base mainnet RPC endpoint |
| `BASE_SEPOLIA_RPC_URL` | Manual | Base Sepolia RPC endpoint |
| `SEPOLIA_RPC_URL` | Manual | Ethereum Sepolia RPC endpoint |
| `SEPOLIA_PROTOCOL_ADDRESS` | Manual | Sepolia contract address |
| `BASE_SEPOLIA_PROTOCOL_ADDRESS` | Manual | Base Sepolia contract address |
| `BASE_MAINNET_PROTOCOL_ADDRESS` | Manual | Base mainnet contract address |
| `CORS_ORIGIN` | Manual | Frontend domain |

### Frontend Service Variables

| Variable | Source | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_API_URL` | Reference | Backend service URL |
| `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` | Manual | WalletConnect project ID |
| `NEXT_PUBLIC_DEFAULT_CHAIN_ID` | Manual | Default chain (11155111 = Sepolia) |
| `NODE_ENV` | Manual | Set to `production` |

## Automatic Deployments

Railway automatically deploys when you push to GitHub:

1. Push changes to your repository
2. Railway detects the push
3. Automatically builds and deploys affected services
4. Zero-downtime deployment

### Trigger Redeploy

To manually trigger a redeploy:

1. Go to service in Railway dashboard
2. Click "Deploy" tab
3. Click "Redeploy"

Or via CLI:
```bash
railway redeploy --service backend
railway redeploy --service frontend
```

## Service-to-Service Communication

Services communicate via Railway's private network:

```typescript
// Backend connects to PostgreSQL
const db = new PostgresStorage(process.env.DATABASE_URL);

// Backend connects to Redis
const redis = new RedisCache(process.env.REDIS_URL);

// Frontend connects to Backend
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

Railway automatically resolves service references in environment variables.

## Monitoring and Logs

### View Logs

**Via Dashboard:**
1. Click on a service
2. Click "Logs" tab
3. View real-time logs

**Via CLI:**
```bash
railway logs --service backend
railway logs --service frontend
```

### Metrics

Railway provides built-in metrics:
- CPU usage
- Memory usage
- Network traffic
- Request count

Access via service "Metrics" tab.

## Database Management

### Access Database

**Via Railway Dashboard:**
1. Click PostgreSQL service
2. Click "Data" tab
3. Browse tables or run queries

**Via psql:**
```bash
# Get connection string
railway variables --service postgres

# Connect
psql $DATABASE_URL
```

**Via TablePlus/DBeaver:**
Use the `DATABASE_URL` from Railway variables.

### Backup Database

```bash
# Export database
railway run --service postgres pg_dump $DATABASE_URL > backup.sql

# Import database
railway run --service postgres psql $DATABASE_URL < backup.sql
```

### View Redis Data

```bash
# Connect to Redis
railway run --service redis redis-cli -u $REDIS_URL

# Inside Redis CLI
KEYS *
GET offer:0x123...
```

## Scaling

### Vertical Scaling (More Resources)

1. Go to service settings
2. Click "Plan" tab
3. Upgrade to higher tier for more CPU/RAM

### Horizontal Scaling (Multiple Instances)

Railway supports horizontal scaling:

1. Go to service settings
2. Set "Replicas" to desired count
3. Railway load-balances requests

Note: For stateless services (backend, frontend) only. Database services are single-instance.

## Cost Estimates

Railway pricing (as of 2025):

- **Developer Plan**: $5/month + usage
  - $5 includes $5 credit
  - ~$0.000463/GB-hour RAM
  - ~$0.000231/vCPU-hour

- **Team Plan**: $20/month + usage

**Estimated Monthly Cost:**

| Service | RAM | vCPU | Hours/month | Cost |
|---------|-----|------|-------------|------|
| PostgreSQL | 1GB | 0.5 | 730 | ~$0.42 |
| Redis | 512MB | 0.25 | 730 | ~$0.11 |
| Backend | 512MB | 0.5 | 730 | ~$0.26 |
| Frontend | 512MB | 0.5 | 730 | ~$0.26 |
| **Total** | | | | **~$1.05/month** |

Plus $5 subscription = **~$6/month total** (well within $5 credit for hobby projects).

## Custom Domains

### Add Custom Domain

1. Go to frontend service
2. Click "Settings" → "Networking"
3. Click "Custom Domain"
4. Add your domain (e.g., `options.yourdomain.com`)
5. Add DNS records:
   - Type: `CNAME`
   - Name: `options`
   - Value: (provided by Railway)

Railway automatically provisions SSL certificates via Let's Encrypt.

## Troubleshooting

### Service won't start

1. Check logs: `railway logs --service backend`
2. Verify environment variables are set
3. Check Dockerfile builds locally: `docker build -f backend/Dockerfile .`

### Database connection errors

1. Verify PostgreSQL service is running
2. Check `DATABASE_URL` is set correctly
3. Ensure `USE_POSTGRES=true` in backend env vars

### Frontend can't reach backend

1. Verify backend is deployed and running
2. Check `NEXT_PUBLIC_API_URL` is set correctly
3. Update `CORS_ORIGIN` in backend to match frontend domain

### Port binding issues

Railway automatically assigns ports. Your app should listen on `process.env.PORT`:

```typescript
const PORT = process.env.PORT || 3001;
app.listen(PORT);
```

### Build failures

1. Check Dockerfile is valid
2. Ensure `railway.json` points to correct Dockerfile
3. Try building locally first
4. Check build logs for specific errors

## Security Best Practices

1. **Never commit secrets** - Use Railway environment variables
2. **Use service references** - `${{Postgres.DATABASE_URL}}` instead of hardcoding
3. **Enable 2FA** - On your Railway account
4. **Restrict CORS** - Set specific origins, not `*`
5. **Use private networking** - Services communicate internally
6. **Regular backups** - Export database regularly
7. **Monitor logs** - Watch for suspicious activity

## Advanced Configuration

### Health Checks

Railway uses the health check endpoint:

```typescript
// backend/src/index.ts
app.get('/api/health', async (req, res) => {
  const dbHealth = await checkDatabaseConnection();
  const redisHealth = await checkRedisConnection();

  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    database: dbHealth ? 'connected' : 'disconnected',
    redis: redisHealth ? 'connected' : 'disconnected',
  });
});
```

Configure in `railway.json`:
```json
{
  "deploy": {
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100
  }
}
```

### Deploy Hooks

Railway supports webhooks:

1. Go to project settings
2. Click "Webhooks"
3. Add webhook URL
4. Trigger on deploy events

### Environment-Specific Configs

Use Railway environments:

1. Click "Environments" in project
2. Create "staging" and "production"
3. Each environment has separate services and variables

## Migration from Docker Compose

Your existing Docker Compose setup works locally for development. For Railway:

**Development (Local):**
```bash
npm run docker:dev
```

**Production (Railway):**
- Separate services
- Managed PostgreSQL/Redis
- Auto-scaling
- Automatic deployments

## CI/CD Integration

Railway integrates with GitHub Actions:

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway CLI
        run: npm i -g @railway/cli

      - name: Deploy
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## Next Steps

1. Set up monitoring (Railway metrics + external APM)
2. Configure alerts for errors
3. Set up automated backups
4. Add staging environment
5. Configure CI/CD pipeline
6. Add custom domain
7. Enable monitoring dashboards

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

## Summary

✅ **Containers**: Your Dockerfiles work perfectly on Railway
✅ **PostgreSQL**: Use Railway's managed service
✅ **Redis**: Use Railway's managed service
✅ **Services**: Deploy backend and frontend as separate services
✅ **Networking**: Services auto-connect via Railway's private network
✅ **Deployments**: Automatic from GitHub
✅ **Cost**: ~$6/month including subscription

Your Docker setup is Railway-ready! Just deploy each service separately instead of using docker-compose.

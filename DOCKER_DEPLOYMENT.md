# Docker Deployment Guide

This guide explains how to deploy and run the Options Protocol application using Docker containers.

## Overview

The application consists of four containerized services:

1. **PostgreSQL** - Persistent database for storing offers, active options, settlements
2. **Redis** - Caching layer for improved performance
3. **Backend** - Express.js API server with TypeScript
4. **Frontend** - Next.js web application

## Prerequisites

- Docker (v20.10+)
- Docker Compose (v2.0+)
- Git

## Quick Start

### 1. Clone and Setup

```bash
cd /home/pb/Desktop/options-protocol
cp .env.docker .env
```

Edit `.env` and fill in required values (RPC URLs, private keys for deployment, etc.).

### 2. Build and Start Containers

```bash
npm run docker:build
npm run docker:up
```

This will:
- Build all Docker images
- Start PostgreSQL, Redis, backend, and frontend services
- Initialize the database schema automatically
- Start the backend API on port 3001
- Start the frontend on port 3000

### 3. Verify Services

```bash
npm run docker:ps
```

Expected output:
```
NAME                  SERVICE    STATUS    PORTS
options-postgres      postgres   Up        5432
options-redis         redis      Up        6379
options-backend       backend    Up        0.0.0.0:3001->3001/tcp
options-frontend      frontend   Up        0.0.0.0:3000->3000/tcp
```

### 4. Check Logs

```bash
npm run docker:logs
```

Or for a specific service:
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 5. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Health check: http://localhost:3001/api/health

## Available NPM Scripts

### Core Docker Commands

```bash
npm run docker:build      # Build all Docker images
npm run docker:up         # Start all services in detached mode
npm run docker:down       # Stop all services
npm run docker:dev        # Start all services with logs (foreground)
npm run docker:restart    # Restart all services
npm run docker:ps         # List running containers
npm run docker:logs       # View logs from all services
npm run docker:clean      # Stop and remove containers + volumes
```

### Database Management

```bash
npm run docker:db:init    # Initialize/reset database schema
npm run docker:db:shell   # Open PostgreSQL shell
npm run docker:redis:cli  # Open Redis CLI
```

## Architecture

### Service Communication

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ▼
┌─────────────────┐     ┌──────────────┐
│    Frontend     │────▶│   Backend    │
│   (Next.js)     │     │  (Express)   │
│   Port 3000     │     │  Port 3001   │
└─────────────────┘     └───┬──────┬───┘
                            │      │
                  ┌─────────┘      └─────────┐
                  ▼                           ▼
           ┌──────────────┐          ┌──────────────┐
           │  PostgreSQL  │          │    Redis     │
           │   Port 5432  │          │  Port 6379   │
           └──────────────┘          └──────────────┘
```

### Data Flow

1. **Frontend** connects to **Backend** API via HTTP
2. **Backend** uses **PostgreSQL** for persistent storage
3. **Backend** uses **Redis** for caching and rate limiting
4. **Backend** connects to blockchain RPC endpoints

## Storage Configuration

### Using PostgreSQL (Production)

Set in `.env`:
```bash
USE_POSTGRES=true
DATABASE_URL=postgresql://protocol_user:protocol_password@postgres:5432/options_protocol
```

### Using In-Memory (Development/Testing)

Set in `.env`:
```bash
USE_POSTGRES=false
```

Note: In-memory storage is reset when the backend container restarts.

## Database Schema

The database schema is automatically initialized when PostgreSQL starts. The schema includes:

### Tables

- **offers** - Option offers with EIP-712 signatures
- **active_options** - Minted option NFTs
- **filled_amounts** - Tracking how much of each offer is filled
- **settlements** - CoW Protocol settlement tracking
- **transaction_logs** - Audit trail (optional)

### Indexes

- `idx_offers_underlying` - Fast lookup by underlying asset
- `idx_offers_writer` - Fast lookup by writer address
- `idx_active_options_writer` - Fast lookup by writer
- `idx_settlements_token_id` - Fast settlement lookup

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL=postgresql://protocol_user:protocol_password@postgres:5432/options_protocol

# Blockchain
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com

# Contract Addresses
SEPOLIA_PROTOCOL_ADDRESS=0xdF1AbDe2967F54E391b6d8FBC655F15847cf87ce
BASE_SEPOLIA_PROTOCOL_ADDRESS=0xD7AFfB2B3303e9Cb44C9d9aFA6bD938200b3C8F2
```

### Optional Variables

```bash
# Redis
REDIS_URL=redis://redis:6379

# API Configuration
PORT=3001
CORS_ORIGIN=http://localhost:3000

# Logging
LOG_LEVEL=info
```

## Development Workflow

### 1. Local Development with Hot Reload

```bash
npm run docker:dev
```

This runs containers in the foreground with logs visible. Both frontend and backend support hot reload.

### 2. Making Code Changes

Code changes are automatically reflected:
- **Frontend**: Next.js Fast Refresh
- **Backend**: nodemon restarts on file changes

### 3. Database Operations

#### View database contents:
```bash
npm run docker:db:shell

# Inside PostgreSQL shell:
\dt                                    # List tables
SELECT * FROM offers LIMIT 10;         # Query offers
SELECT * FROM active_options LIMIT 10; # Query options
\q                                     # Exit
```

#### Reset database:
```bash
npm run docker:db:init
```

#### Clear cache:
```bash
npm run docker:redis:cli

# Inside Redis CLI:
FLUSHALL    # Clear all cache
KEYS *      # List all keys
EXIT        # Exit
```

## Production Deployment

### 1. Build for Production

Update `docker-compose.yml` to use production target:
```yaml
backend:
  build:
    target: production  # Change from 'development'
```

Or set environment variable:
```bash
BUILD_TARGET=production npm run docker:build
```

### 2. Use Production Environment Variables

Create `.env.production`:
```bash
NODE_ENV=production
USE_POSTGRES=true
DATABASE_URL=postgresql://user:pass@production-db:5432/options_protocol
REDIS_URL=redis://production-redis:6379
```

### 3. Security Considerations

- Use strong database passwords
- Limit PostgreSQL to internal network only
- Enable Redis authentication
- Use HTTPS for frontend
- Set proper CORS origins
- Never commit private keys
- Use secrets management (Docker secrets, Vault, etc.)

### 4. Scaling

For production scale:
- Use managed PostgreSQL (AWS RDS, Google Cloud SQL)
- Use managed Redis (AWS ElastiCache, Redis Cloud)
- Deploy frontend to CDN (Vercel, Netlify)
- Run multiple backend instances behind load balancer

## Troubleshooting

### Container won't start

```bash
# Check logs
npm run docker:logs

# Check specific service
docker-compose logs backend
docker-compose logs postgres
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U protocol_user -d options_protocol -c "SELECT 1;"
```

### Redis connection errors

```bash
# Verify Redis is running
docker-compose ps redis

# Test connection
docker-compose exec redis redis-cli PING
```

### Port already in use

If ports 3000, 3001, 5432, or 6379 are already in use:

1. Stop conflicting services:
```bash
# Find what's using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process or stop the service
```

2. Or change ports in `docker-compose.yml`:
```yaml
ports:
  - "3002:3001"  # Map to different host port
```

### Clean slate restart

```bash
# Stop everything, remove volumes, and rebuild
npm run docker:clean
npm run docker:build
npm run docker:up
```

## Health Checks

All services include health checks:

### Backend
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": 1234567890,
  "database": "connected",
  "redis": "connected"
}
```

### Database
```bash
docker-compose exec postgres pg_isready -U protocol_user
```

### Redis
```bash
docker-compose exec redis redis-cli PING
```

## Backup and Restore

### Backup Database

```bash
docker-compose exec postgres pg_dump -U protocol_user options_protocol > backup.sql
```

### Restore Database

```bash
cat backup.sql | docker-compose exec -T postgres psql -U protocol_user options_protocol
```

### Backup Redis

```bash
docker-compose exec redis redis-cli SAVE
docker cp options-redis:/data/dump.rdb ./redis-backup.rdb
```

## Monitoring

### Resource Usage

```bash
docker stats
```

Shows CPU, memory, network I/O for each container.

### Logs

```bash
# All logs
npm run docker:logs

# Specific service
docker-compose logs -f backend

# Last 100 lines
docker-compose logs --tail=100 backend

# Since specific time
docker-compose logs --since 2h backend
```

## Advanced Configuration

### Custom docker-compose override

Create `docker-compose.override.yml` for local customizations:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - LOG_LEVEL=debug
    ports:
      - "9229:9229"  # Debug port
```

### Using external databases

To use external PostgreSQL/Redis instead of containers:

1. Update `.env`:
```bash
DATABASE_URL=postgresql://user:pass@external-db.com:5432/dbname
REDIS_URL=redis://external-redis.com:6379
```

2. Comment out postgres and redis services in `docker-compose.yml`

## Next Steps

1. Set up CI/CD pipeline (GitHub Actions, GitLab CI)
2. Configure monitoring (Prometheus, Grafana)
3. Set up alerting (PagerDuty, Opsgenie)
4. Implement backup automation
5. Configure log aggregation (ELK stack, Datadog)

## Support

For issues and questions:
- Check logs: `npm run docker:logs`
- Review this guide
- Check Docker documentation
- Create an issue in the repository

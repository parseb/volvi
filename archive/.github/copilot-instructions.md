# Copilot Instructions for Options Protocol

## Project Overview
- **Options Protocol** is a decentralized options trading platform with:
  - Gasless transactions (users pay only USDC)
  - Signature-based orderbook (EIP-712)
  - CoW Protocol integration for MEV-protected settlement
  - Multi-oracle pricing (Pyth + Uniswap fallback)
  - Multi-auth (wallet, passkey, email, social via Reown)

## Architecture
- **Smart Contracts** (`src/`):
  - `OptionsProtocol.sol`, `OptionsProtocolGasless.sol` (main deployed contract)
  - Optimized for size (see `foundry.toml`)
- **Backend** (`backend/`):
  - Express.js API (TypeScript)
  - Storage: in-memory (dev), PostgreSQL + Redis (prod)
  - Key files: `routes.ts`, `storage.ts`, `cow.ts`, `pyth.ts`
- **Frontend** (`frontend/`):
  - Next.js 14 (App Router)
  - Uses Reown AppKit for authentication
  - Key files: `app/`, `components/`, `lib/`
- **Deployment**:
  - Docker Compose for local/prod
  - Railway.app for cloud

## Developer Workflows
- **Start all services locally:**
  ```bash
  npm start
  ```
  (Runs fork, backend, frontend; see [QUICK_START.md])
- **Build contracts:**
  ```bash
  forge build
  ```
- **Run tests:**
  ```bash
  forge test -vv
  ```
- **Deploy contracts:**
  ```bash
  forge script script/DeploySepolia.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
  ```
- **Docker:**
  ```bash
  npm run docker:build && npm run docker:up
  ```
- **Frontend dev:**
  ```bash
  cd frontend && pnpm dev
  ```

## Patterns & Conventions
- **Orderbook:** Off-chain, signature-based, partial fills allowed
- **Gasless:** EIP-3009 for USDC, EIP-1271 for CoW Protocol
- **Environment:** Use `.env` for backend, `.env.local` for frontend
- **Testing:** All contract tests in `test/` (Foundry)
- **API:** See backend `routes.ts` for endpoints
- **Storage:** Use `USE_POSTGRES` env var to switch storage mode
- **Contract size:** Keep under 24KB (see README for optimization)

## Integration Points
- **CoW Protocol:** Automated settlement via backend (`cow.ts`)
- **Pyth Oracle:** Price feeds via backend (`pyth.ts`)
- **Reown:** Auth in frontend (`NEXT_PUBLIC_REOWN_PROJECT_ID`)

## Key References
- [README.md](../README.md) — full architecture, workflows, troubleshooting
- [COMPLETE_SPECIFICATION.md](../COMPLETE_SPECIFICATION.md) — technical spec
- [DOCKER_DEPLOYMENT.md](../DOCKER_DEPLOYMENT.md) — containerization
- [DEPLOYMENT_INFO.md](../DEPLOYMENT_INFO.md) — contract addresses/networks

---

**For new patterns or unclear workflows, check the main README and referenced docs.**

# Options Protocol Frontend

Next.js 14 frontend for the Options Protocol with Reown AppKit integration.

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your values
```

3. Run the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

- **Multi-auth**: Wallet, email, and social login via Reown AppKit
- **Orderbook**: Real-time orderbook with filtering
- **Write Options**: Create and sign offers with EIP-712
- **Take Options**: Execute options on-chain
- **Portfolio**: View active positions with real-time P&L

## Environment Variables

Required:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_REOWN_PROJECT_ID` - Reown project ID
- `NEXT_PUBLIC_PROTOCOL_ADDRESS` - OptionsProtocol contract address
- `NEXT_PUBLIC_CHAIN_ID` - Chain ID (8453 for Base)

## Pages

- `/` - Landing page with orderbook and taker/writer sidebars
- `/portfolio` - User's active option positions

## Components

- `Orderbook` - Display orderbook with filtering
- `TakerSidebar` - Take option interface
- `WriterSidebar` - Write option interface
- `PositionCard` - Display individual position with P&L

## Deployment

Deploy to Railway or Vercel:

```bash
pnpm build
pnpm start
```

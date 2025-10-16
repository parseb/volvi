

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for ES module scope: get __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function formatPrivateKey(key: string): string {
  if (!key) return '';
  // If it's a decimal number, convert to hex
  if (!/^0x/.test(key) && /^\d+$/.test(key)) {
    return '0x' + BigInt(key).toString(16).padStart(64, '0');
  }
  return key;
}


export const config = {
  port: process.env.API_PORT || 3001,
  // Use only .env RPC endpoints for all networks
  rpcUrl: (() => {
    const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID;
    if (chainId === '11155111') {
      if (!process.env.SEPOLIA_RPC_URL) throw new Error('SEPOLIA_RPC_URL must be set in .env');
      return process.env.SEPOLIA_RPC_URL;
    }
    if (chainId === '8453') {
      if (!process.env.BASE_RPC_URL) throw new Error('BASE_RPC_URL must be set in .env');
      return process.env.BASE_RPC_URL;
    }
    if (chainId === '84532') {
      if (!process.env.BASE_SEPOLIA_RPC_URL) throw new Error('BASE_SEPOLIA_RPC_URL must be set in .env');
      return process.env.BASE_SEPOLIA_RPC_URL;
    }
    if (chainId === '123999') {
      if (!process.env.FORK_RPC_URL) throw new Error('FORK_RPC_URL must be set in .env');
      return process.env.FORK_RPC_URL;
    }
    throw new Error('Unsupported or missing CHAIN_ID/NEXT_PUBLIC_CHAIN_ID');
  })(),
  protocolAddress: process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS || '',
  broadcasterPrivateKey: formatPrivateKey(process.env.BROADCASTER_PRIVATE_KEY || ''),
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || process.env.CHAIN_ID || '8453'),

  // Token addresses
  weth: process.env.WETH_ADDRESS || '0x4200000000000000000000000000000000000006',
  wbtc: process.env.WBTC_ADDRESS || '',
  usdc: process.env.USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

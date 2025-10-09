import dotenv from 'dotenv';

dotenv.config({ path: '../.env.local' });

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
  rpcUrl: process.env.RPC_URL || process.env.BASE_RPC_URL || 'http://127.0.0.1:8545',
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

import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

export const config = {
  port: process.env.API_PORT || 3001,
  rpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  protocolAddress: process.env.NEXT_PUBLIC_PROTOCOL_ADDRESS || '',
  broadcasterPrivateKey: process.env.BROADCASTER_PRIVATE_KEY || '',
  chainId: parseInt(process.env.CHAIN_ID || '8453'),

  // Token addresses
  weth: process.env.WETH_ADDRESS || '0x4200000000000000000000000000000000000006',
  wbtc: process.env.WBTC_ADDRESS || '',
  usdc: process.env.USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000'
};

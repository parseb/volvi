import { z } from 'zod';

const envSchema = z.object{
  VITE_VINCENT_APP_ID: z.string().min(1, 'VITE_VINCENT_APP_ID is required'),
  VITE_REDIRECT_URI: z.string().url('Invalid redirect URI'),
  VITE_BACKEND_URL: z.string().url('Invalid backend URL'),
  VITE_CHAIN_ID: z.string().transform(Number),
  VITE_RPC_URL: z.string().url('Invalid RPC URL'),
  VITE_OPTIONS_PROTOCOL_ADDRESS: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
  VITE_ENV: z.enum(['development', 'production']).default('development'),
});

export const env = envSchema.parse(import.meta.env);

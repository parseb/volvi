import { env } from './env';

/**
 * Vincent configuration for the frontend
 */
export const vincentConfig = {
  appId: env.VITE_VINCENT_APP_ID,
  redirectUri: env.VITE_REDIRECT_URI,
  network: env.VITE_ENV === 'production' ? 'datil' : 'datil-test',
};

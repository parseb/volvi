import { useCallback } from 'react';
import { useJwtContext, useVincentWebAuthClient } from '@lit-protocol/vincent-app-sdk/react';
import { env } from '@/config/env';

/**
 * Hook for Vincent authentication
 */
export function useVincent() {
  const { authInfo } = useJwtContext();
  const vincentWebAuthClient = useVincentWebAuthClient(env.VITE_VINCENT_APP_ID);

  const connect = useCallback(() => {
    vincentWebAuthClient.redirectToConnectPage({
      redirectUri: env.VITE_REDIRECT_URI,
    });
  }, [vincentWebAuthClient]);

  const disconnect = useCallback(() => {
    // TODO: Implement disconnect/logout
    window.location.href = '/';
  }, []);

  return {
    isAuthenticated: !!authInfo?.jwt,
    pkpInfo: authInfo?.pkpInfo,
    appInfo: authInfo?.appInfo,
    connect,
    disconnect,
  };
}

import { useCallback } from 'react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { env } from '@/config/env';

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface CreateProfileRequest {
  totalUSDC: string;
  maxLockDays: number;
  minUnit: string;
  minPremium: string;
  usdcAddress: string;
}

interface CreateProfileResponse {
  profileId: string;
  txHash: string;
}

/**
 * Hook for making authenticated API calls to the backend
 */
export function useBackend() {
  const { authInfo } = useJwtContext();

  const sendRequest = useCallback(
    async <T>(endpoint: string, method: HTTPMethod, body?: unknown): Promise<T> => {
      if (!authInfo?.jwt) {
        throw new Error('Not authenticated. Please connect with Vincent.');
      }

      const headers: HeadersInit = {
        Authorization: `Bearer ${authInfo.jwt}`,
      };

      if (body != null) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(`${env.VITE_BACKEND_URL}${endpoint}`, {
        method,
        headers,
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const json = (await response.json()) as { data: T; success: boolean; error?: string };

      if (!json.success) {
        throw new Error(json.error || 'Request failed');
      }

      return json.data;
    },
    [authInfo]
  );

  return {
    // Create profile
    createProfile: useCallback(
      (params: CreateProfileRequest) =>
        sendRequest<CreateProfileResponse>('/profiles', 'POST', params),
      [sendRequest]
    ),

    // TODO: Add more endpoints as they are implemented
    // createOffer: (params) => sendRequest('/offers', 'POST', params),
    // getOrderbook: () => sendRequest('/orderbook', 'GET'),
    // takeOption: (params) => sendRequest('/take', 'POST', params),
    // getPositions: () => sendRequest('/positions', 'GET'),
    // settleOption: (tokenId) => sendRequest('/settle', 'POST', { tokenId }),
  };
}

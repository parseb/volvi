import { useCallback } from 'react';
import { useJwtContext } from '@lit-protocol/vincent-app-sdk/react';
import { env } from '@/config/env';

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// Request/Response types
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

interface OptionOffer {
  writer: string;
  profileId: string;
  underlying: string;
  collateralAmount: string;
  stablecoin: string;
  isCall: boolean;
  premiumPerDay: string;
  minDuration: number;
  maxDuration: number;
  minFillAmount: string;
  deadline: number;
  configHash: string;
}

interface CreateOfferRequest {
  profileId: string;
  underlying: string;
  collateralAmount: string;
  stablecoin: string;
  isCall: boolean;
  premiumPerDay: string;
  minDuration: number;
  maxDuration: number;
  minFillAmount: string;
  deadline: number;
  configHash: string;
}

interface CreateOfferResponse {
  offerHash: string;
  signature: string;
  offer: OptionOffer;
}

interface OrderbookResponse {
  offers: Array<{
    offerHash: string;
    offer: OptionOffer;
    signature: string;
    filledAmount?: string;
  }>;
  count: number;
}

interface EIP3009Auth {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
  v: number;
  r: string;
  s: string;
}

interface TakeOptionRequest {
  offer: OptionOffer;
  offerSignature: string;
  fillAmount: string;
  duration: number;
  paymentAuth: EIP3009Auth;
}

interface TakeOptionResponse {
  tokenId: string;
  txHash: string;
}

interface SettleOptionRequest {
  tokenId: string;
}

interface SettleOptionResponse {
  txHash: string;
  profit: string;
}

interface Position {
  tokenId: string;
  holder: string;
  writer: string;
  underlying: string;
  collateralLocked: string;
  isCall: boolean;
  strikePrice: string;
  startTime: number;
  expiryTime: number;
  settled: boolean;
}

interface PositionsResponse {
  positions: Position[];
  count: number;
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

    // Create offer
    createOffer: useCallback(
      (params: CreateOfferRequest) =>
        sendRequest<CreateOfferResponse>('/offers', 'POST', params),
      [sendRequest]
    ),

    // Get orderbook
    getOrderbook: useCallback(
      () => sendRequest<OrderbookResponse>('/orderbook', 'GET'),
      [sendRequest]
    ),

    // Take option
    takeOption: useCallback(
      (params: TakeOptionRequest) =>
        sendRequest<TakeOptionResponse>('/take', 'POST', params),
      [sendRequest]
    ),

    // Get positions
    getPositions: useCallback(
      () => sendRequest<PositionsResponse>('/positions', 'GET'),
      [sendRequest]
    ),

    // Settle option
    settleOption: useCallback(
      (params: SettleOptionRequest) =>
        sendRequest<SettleOptionResponse>('/settle', 'POST', params),
      [sendRequest]
    ),
  };
}

// Export types
export type {
  CreateProfileRequest,
  CreateOfferRequest,
  TakeOptionRequest,
  SettleOptionRequest,
  OptionOffer,
  EIP3009Auth,
  Position,
};

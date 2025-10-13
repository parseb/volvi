import { ethers } from 'ethers';

/**
 * CoW Protocol helper functions for settlement
 */

// CoW Protocol EIP-712 Domain
export function getCowDomain(chainId: number): ethers.TypedDataDomain {
  const settlements: Record<number, string> = {
    1: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', // Mainnet
    11155111: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', // Sepolia
    84532: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', // Base Sepolia
    8453: '0x9008D19f58AAbD9eD0D60971565AA8510560ab41', // Base
  };

  return {
    name: 'Gnosis Protocol',
    version: 'v2',
    chainId,
    verifyingContract: settlements[chainId] || settlements[84532],
  };
}

// CoW Order TypedData structure
export const COW_ORDER_TYPE = {
  Order: [
    { name: 'sellToken', type: 'address' },
    { name: 'buyToken', type: 'address' },
    { name: 'receiver', type: 'address' },
    { name: 'sellAmount', type: 'uint256' },
    { name: 'buyAmount', type: 'uint256' },
    { name: 'validTo', type: 'uint32' },
    { name: 'appData', type: 'bytes32' },
    { name: 'feeAmount', type: 'uint256' },
    { name: 'kind', type: 'string' },
    { name: 'partiallyFillable', type: 'bool' },
    { name: 'sellTokenBalance', type: 'string' },
    { name: 'buyTokenBalance', type: 'string' }
  ]
};

/**
 * Hash a CoW Protocol order using EIP-712
 */
export function hashCowOrder(order: any, chainId: number): string {
  const domain = getCowDomain(chainId);
  return ethers.TypedDataEncoder.hash(domain, COW_ORDER_TYPE, order);
}

/**
 * Create AppData for CoW Protocol with hooks
 * Note: For now, returns a simple hash. Full hooks implementation requires
 * the AppData document to be uploaded to IPFS and the hash referenced.
 */
export function createAppData(tokenId: string, protocolAddress: string): string {
  // Simplified version: just hash the tokenId
  // In production, this should be a full AppData document with hooks
  const appDataDoc = {
    version: '0.1.0',
    metadata: {
      orderType: 'options-settlement',
      tokenId,
    }
  };

  const appDataJson = JSON.stringify(appDataDoc);
  return ethers.keccak256(ethers.toUtf8Bytes(appDataJson));
}

/**
 * Get CoW API URL for a given chain
 */
export function getCowApiUrl(chainId: number): string {
  const urls: Record<number, string> = {
    1: 'https://api.cow.fi/mainnet/api/v1',
    11155111: 'https://api.cow.fi/sepolia/api/v1',
    84532: 'https://api.cow.fi/basesepolia/api/v1',
    8453: 'https://api.cow.fi/base/api/v1',
  };

  return urls[chainId] || urls[84532];
}

/**
 * Create EIP-1271 signature for CoW Protocol
 * Encodes tokenId (32 bytes) + taker signature
 */
export function createEIP1271Signature(tokenId: string, takerSignature: string): string {
  return ethers.AbiCoder.defaultAbiCoder().encode(
    ['uint256', 'bytes'],
    [tokenId, takerSignature]
  );
}

/**
 * Create a CoW Protocol order
 */
export interface CowOrderParams {
  sellToken: string;
  buyToken: string;
  receiver: string;
  sellAmount: string;
  buyAmount: string;
  validTo: number;
  appData: string;
}

export function createCowOrder(params: CowOrderParams) {
  return {
    sellToken: params.sellToken,
    buyToken: params.buyToken,
    receiver: params.receiver,
    sellAmount: params.sellAmount,
    buyAmount: params.buyAmount,
    validTo: params.validTo,
    appData: params.appData,
    feeAmount: '0',
    kind: 'sell',
    partiallyFillable: false,
    sellTokenBalance: 'erc20',
    buyTokenBalance: 'erc20',
  };
}

/**
 * Submit order to CoW Protocol API
 */
export async function submitCowOrder(
  order: any,
  signature: string,
  from: string,
  chainId: number
): Promise<string> {
  const apiUrl = getCowApiUrl(chainId);

  const orderPayload = {
    ...order,
    signingScheme: 'eip1271',
    signature,
    from,
  };

  console.log('Submitting order to CoW API:', apiUrl);
  console.log('Order payload:', JSON.stringify(orderPayload, null, 2));

  const response = await fetch(`${apiUrl}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('CoW API error:', errorText);
    throw new Error(`CoW API error: ${response.status} ${errorText}`);
  }

  // CoW API returns the order UID as a plain string
  const orderUid = await response.text();
  return orderUid.replace(/"/g, ''); // Remove quotes if present
}

/**
 * Get order status from CoW Protocol API
 */
export async function getCowOrderStatus(orderUid: string, chainId: number): Promise<any> {
  const apiUrl = getCowApiUrl(chainId);

  const response = await fetch(`${apiUrl}/orders/${orderUid}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch order status: ${response.status}`);
  }

  return response.json();
}

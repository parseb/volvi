'use client';

import React, { type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { createAppKit } from '@reown/appkit/react';
import { config, queryClient, wagmiAdapter, projectId, networks, metadata } from '@/lib/config';

// Create AppKit instance
createAppKit({
  adapters: [wagmiAdapter],
  networks: [networks[0], networks[1]],
  projectId,
  features: {
    analytics: true,
  },
  metadata,
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}

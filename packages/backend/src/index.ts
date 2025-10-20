import express from 'express';
import { registerRoutes } from './lib/express';
import { env } from './lib/env';
import { serviceLogger } from './lib/logger';

const app = express();

// Register all routes
registerRoutes(app);

// Start server
app.listen(env.PORT, () => {
  serviceLogger.info({
    port: env.PORT,
    environment: env.NODE_ENV,
    vincentAppId: env.VINCENT_APP_ID,
    chainId: env.CHAIN_ID,
    optionsProtocolAddress: env.OPTIONS_PROTOCOL_ADDRESS,
  }, 'Volvi Options Protocol backend started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  serviceLogger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  serviceLogger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

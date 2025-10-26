import express from 'express';
import { registerRoutes } from './lib/express/index.ts';
import { env } from './lib/env.ts';
import { serviceLogger } from './lib/logger.ts';
import { connectToDatabase, disconnectFromDatabase } from './db/index.ts';

const app = express();

// Register all routes
registerRoutes(app);

/**
 * Initialize database connection if MongoDB is enabled
 */
async function initializeDatabase() {
  if (env.USE_MONGODB && env.MONGODB_URI) {
    try {
      await connectToDatabase(env.MONGODB_URI);
      serviceLogger.info('Database initialized successfully');
    } catch (error) {
      serviceLogger.error({ error }, 'Failed to connect to database');
      if (env.NODE_ENV === 'production') {
        // In production, fail fast if database is required but unavailable
        process.exit(1);
      } else {
        // In development, continue without database
        serviceLogger.warn('Continuing without database in development mode');
      }
    }
  } else {
    serviceLogger.info('MongoDB is disabled (USE_MONGODB=false or no MONGODB_URI)');
  }
}

/**
 * Start the server
 */
async function startServer() {
  // Initialize database first
  await initializeDatabase();

  // Start server
  app.listen(env.PORT, () => {
    serviceLogger.info({
      port: env.PORT,
      environment: env.NODE_ENV,
      vincentAppId: env.VINCENT_APP_ID,
      chainId: env.CHAIN_ID,
      optionsProtocolAddress: env.OPTIONS_PROTOCOL_ADDRESS,
      mongodbEnabled: env.USE_MONGODB,
    }, 'Volvi Options Protocol backend started');
  });
}

// Graceful shutdown
async function shutdown() {
  serviceLogger.info('Shutdown signal received, closing connections...');

  // Disconnect from database
  if (env.USE_MONGODB && env.MONGODB_URI) {
    await disconnectFromDatabase();
  }

  serviceLogger.info('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the application
startServer().catch((error) => {
  serviceLogger.error({ error }, 'Failed to start server');
  process.exit(1);
});

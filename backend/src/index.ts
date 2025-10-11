import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import routes from './routes.js';
import gaslessRoutes from './routes/gasless.js';
import settlementRoutes from './routes/settlement.js';
import { protocolContract } from './contract.js';
import { storage } from './storage.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api', routes);
app.use('/api/gasless', gaslessRoutes);
app.use('/api/settlement', settlementRoutes);

// Event listeners for real-time updates
function setupEventListeners() {
  console.log('Setting up event listeners...');

  protocolContract.onOptionTaken((tokenId, offerHash, taker, fillAmount) => {
    console.log(`Option taken: ${tokenId}, Offer: ${offerHash}`);

    // Update filled amount
    storage.updateFilledAmount(offerHash, fillAmount);

    // Store active option (will be enriched with more data from contract)
    storage.addActiveOption({
      tokenId,
      offerHash,
      writer: '', // Will be filled when we query contract
      taker,
      underlying: '',
      collateralLocked: '',
      isCall: false,
      strikePrice: '',
      startTime: Math.floor(Date.now() / 1000),
      expiryTime: 0,
      settled: false,
      configHash: ''
    });
  });

  protocolContract.onOptionSettled((tokenId, profit) => {
    console.log(`Option settled: ${tokenId}, Profit: ${profit}`);
    storage.settleOption(tokenId);
  });
}

// Start server
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`✅ Options Protocol Backend running on port ${PORT}`);
  console.log(`📊 RPC: ${config.rpcUrl}`);
  console.log(`📝 Protocol: ${config.protocolAddress || 'NOT CONFIGURED'}`);
  console.log(`🌐 CORS Origin: ${config.corsOrigin}`);

  // Setup event listeners if protocol address is configured
  if (config.protocolAddress) {
    setupEventListeners();
  } else {
    console.warn('⚠️  Protocol address not configured - event listeners disabled');
  }
});

export default app;

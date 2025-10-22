#!/usr/bin/env node

/**
 * Test script to discover real IPFS CID from Vincent Dashboard
 *
 * Usage:
 * 1. Set your VINCENT_APP_ID environment variable
 * 2. Run: node test-vincent-ability.js
 *
 * This will attempt to list abilities registered in your Vincent App
 * and show their actual IPFS CIDs.
 */

import { VincentAppClient } from '@lit-protocol/vincent-app-sdk';

async function testVincentAbilities() {
  const appId = process.env.VINCENT_APP_ID || process.env.VITE_VINCENT_APP_ID;

  if (!appId) {
    console.error('❌ Error: VINCENT_APP_ID not set');
    console.log('\nUsage:');
    console.log('  VINCENT_APP_ID=your_app_id node test-vincent-ability.js');
    process.exit(1);
  }

  console.log('🔍 Testing Vincent Abilities...\n');
  console.log(`App ID: ${appId}\n`);

  try {
    // Try to initialize Vincent App Client
    const client = new VincentAppClient({ appId });

    console.log('✅ Vincent App Client initialized');
    console.log('\nAttempting to fetch app configuration...\n');

    // Try to get app details
    // Note: This is exploratory - the exact API might differ
    const appInfo = await client.getAppInfo?.() || {};

    console.log('📋 App Info:', JSON.stringify(appInfo, null, 2));

    // Try to get registered abilities
    if (client.getAbilities) {
      const abilities = await client.getAbilities();
      console.log('\n📦 Registered Abilities:');
      console.log(JSON.stringify(abilities, null, 2));
    }

    // Try alternative methods to discover abilities
    if (client.listAbilities) {
      const abilities = await client.listAbilities();
      console.log('\n📦 Listed Abilities:');
      console.log(JSON.stringify(abilities, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  }
}

// Run the test
testVincentAbilities().catch(console.error);

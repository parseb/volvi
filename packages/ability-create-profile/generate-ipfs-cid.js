import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import IpfsHash from 'ipfs-only-hash';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Generate IPFS CID for the bundled ability
 * This creates a deterministic CID from the ability code
 */
async function generateIPFSCID() {
  try {
    console.log('📦 Generating IPFS CID for ability...\n');

    // Read the built ability file
    const abilityPath = join(__dirname, 'dist', 'index.js');
    const abilityCode = readFileSync(abilityPath, 'utf-8');

    console.log(`📄 Read ability code: ${abilityCode.length} bytes`);

    // Generate IPFS CID using ipfs-only-hash
    const cid = await IpfsHash.of(abilityCode);

    console.log(`\n✅ Generated IPFS CID: ${cid}`);

    // Update metadata file
    const metadata = {
      ipfsCid: cid
    };

    const metadataPath = join(__dirname, 'dist', 'src', 'generated', 'vincent-ability-metadata.json');
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    console.log(`✅ Updated metadata file: ${metadataPath}`);
    console.log(`\n📋 Metadata content:`);
    console.log(JSON.stringify(metadata, null, 2));

    return cid;
  } catch (error) {
    console.error('❌ Error generating IPFS CID:', error);
    throw error;
  }
}

generateIPFSCID().catch(console.error);

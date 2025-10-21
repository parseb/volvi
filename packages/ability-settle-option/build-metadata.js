import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create metadata file with placeholder IPFS CID
// Vincent Dashboard will replace this with actual IPFS CID when ability is registered
const metadata = {
  ipfsCid: 'QmPLACEHOLDER'
};

// Vincent expects: dist/src/generated/vincent-ability-metadata.json
const metadataPath = join(__dirname, 'dist', 'src', 'generated', 'vincent-ability-metadata.json');

// Ensure directory exists
mkdirSync(join(__dirname, 'dist', 'src', 'generated'), { recursive: true });

// Write metadata
writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

console.log('✅ Created vincent-ability-metadata.json at dist/src/generated/');

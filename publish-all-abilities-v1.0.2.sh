#!/usr/bin/env bash
set -e

echo "🚀 Publishing all Vincent abilities v1.0.2 with real IPFS CIDs"
echo "=============================================================="
echo ""

# Array of abilities
abilities=("create-profile" "create-offer" "take-option" "settle-option")

for ability in "${abilities[@]}"; do
  echo "📦 Processing ability-$ability..."
  cd "packages/ability-$ability"

  # Generate IPFS CID
  echo "  ├─ Generating IPFS CID..."
  node generate-ipfs-cid.js

  # Update version to 1.0.2
  echo "  ├─ Bumping version to 1.0.2..."
  sed -i 's/"version": "1.0.1"/"version": "1.0.2"/' package.json

  # Fix repository URL
  echo "  ├─ Updating repository URL..."
  sed -i 's|"url": "https://github.com/parseb/volvi.git"|"url": "git+https://github.com/parseb/volvi.git"|' package.json

  # Rebuild with new CID
  echo "  ├─ Building..."
  pnpm build > /dev/null 2>&1

  # Publish
  echo "  ├─ Publishing to npm..."
  npm publish --access public

  echo "  └─ ✅ Published @parseb/volvi-$ability@1.0.2"
  echo ""

  cd ../..
done

echo "🎉 All abilities published successfully!"
echo ""
echo "Next steps:"
echo "1. Update Vincent Dashboard with version 1.0.2"
echo "2. The real IPFS CIDs are now in the packages"

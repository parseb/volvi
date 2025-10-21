# Publishing Volvi Abilities to npm

**Status:** ✅ PUBLISHED SUCCESSFULLY

**Package:** `@parseb/volvi-abilities@1.0.0`
**npm Registry:** https://www.npmjs.com/package/@parseb/volvi-abilities
**Published:** 2025-10-21

---

## Prerequisites

Before publishing, ensure you have:

1. **npm Account**: Create at account at [npmjs.com](https://www.npmjs.com)
2. **npm CLI Login**: Run `npm login` and enter your credentials
3. **Scoped Package Access**: You'll need to create the `@volvi` scope or use your own npm username

---

## Package Information

**Package Name:** `@volvi/abilities@1.0.0`

**Subpath Exports (for Vincent Dashboard):**
- `@volvi/abilities/create-profile`
- `@volvi/abilities/create-offer`
- `@volvi/abilities/take-option`
- `@volvi/abilities/settle-option`

---

## Publishing Steps

### 1. Login to npm

```bash
npm login
# Enter your npm username, password, and email
```

### 2. Build the Package (Already Done)

```bash
cd packages/abilities
pnpm build
```

### 3. Publish to npm

**For First-Time Publishing:**

```bash
cd packages/abilities
npm publish --access public
```

**Notes:**
- Scoped packages (`@volvi/abilities`) are private by default, so use `--access public`
- If `@volvi` scope doesn't exist, you can either:
  - Create an npm organization named "volvi"
  - OR change package name to use your npm username: `@yourusername/volvi-abilities`

### 4. Verify Publication

After publishing, verify at: https://www.npmjs.com/package/@volvi/abilities

Check that all subpath exports work:
```bash
npm view @volvi/abilities
```

---

## Alternative: Use Your npm Username

If you don't want to create the `@volvi` organization, update the package name:

### Edit `packages/abilities/package.json`:

```json
{
  "name": "@your-npm-username/volvi-abilities",
  "version": "1.0.0",
  ...
}
```

Then publish:
```bash
npm publish --access public
```

Then in Vincent Dashboard, use:
- `@your-npm-username/volvi-abilities/create-profile@1.0.0`
- `@your-npm-username/volvi-abilities/create-offer@1.0.0`
- etc.

---

## Vincent Dashboard Registration

Once published to npm, register each ability in Vincent Dashboard:

### Go to: https://dashboard.heyvincent.ai/

### For Each Ability:

1. **Create Profile Ability**
   - Package Name: `@volvi/abilities/create-profile@1.0.0`
   - Title: `create-profile`
   - Description: `Create USDC liquidity profiles for writing options`
   - Active Version: `1.0.0`
   - Deployment Status: `Development`

2. **Create Offer Ability**
   - Package Name: `@volvi/abilities/create-offer@1.0.0`
   - Title: `create-offer`
   - Description: `Create signed option offers for orderbook`
   - Active Version: `1.0.0`
   - Deployment Status: `Development`

3. **Take Option Ability**
   - Package Name: `@volvi/abilities/take-option@1.0.0`
   - Title: `take-option`
   - Description: `Take options gaslessly with USDC payment`
   - Active Version: `1.0.0`
   - Deployment Status: `Development`

4. **Settle Option Ability**
   - Package Name: `@volvi/abilities/settle-option@1.0.0`
   - Title: `settle-option`
   - Description: `Settle expired options and claim profits`
   - Active Version: `1.0.0`
   - Deployment Status: `Development`

---

## Files Included in npm Package

The published package will include:

```
@volvi/abilities@1.0.0/
├── dist/
│   ├── create-profile/
│   │   ├── index.js
│   │   ├── index.d.ts
│   │   └── schema.js
│   ├── create-offer/
│   ├── take-option/
│   ├── settle-option/
│   └── index.js
├── package.json
└── README.md (if you create one)
```

---

## Updating the Package

When you make changes to abilities:

1. **Update version** in `package.json`:
   ```json
   {
     "version": "1.0.1"
   }
   ```

2. **Rebuild**:
   ```bash
   pnpm build
   ```

3. **Publish update**:
   ```bash
   npm publish
   ```

4. **Update Vincent Dashboard** with new version numbers

---

## Troubleshooting

### Error: Package name already exists
- Someone else owns `@volvi` scope
- Solution: Use your npm username instead

### Error: 403 Forbidden
- You don't have permission to publish to `@volvi` scope
- Solution: Create `@volvi` organization or use your username

### Error: Need to login
```bash
npm logout
npm login
```

### Check what will be published
```bash
npm pack --dry-run
```

This shows exactly what files will be included in the npm package.

---

## Next Steps After Publishing

1. ✅ Publish package to npm
2. ✅ Register all 4 abilities in Vincent Dashboard
3. ✅ Set up environment variables (`.env` files)
4. ✅ Test abilities locally with backend/frontend
5. ✅ Deploy smart contracts (if not already deployed)
6. ✅ Test end-to-end flow on testnet
7. ✅ Deploy to production

---

## Repository Field

**IMPORTANT:** Update the repository URL in `package.json` to your actual GitHub repository:

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/YOUR_GITHUB_USERNAME/volvi.git",
    "directory": "packages/abilities"
  }
}
```

Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username.

---

**Ready to publish!** 🚀

Run `npm login` then `npm publish --access public` from the `packages/abilities` directory.

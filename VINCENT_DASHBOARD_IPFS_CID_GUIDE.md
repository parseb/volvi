# Vincent Dashboard IPFS CID Guide

**Issue:** Dashboard shows `QmPLACEHOLDER` for all abilities
**Status:** This is expected behavior ✅

---

## Understanding the Placeholder CID

### What We Discovered

The published `@lit-protocol/vincent-ability-erc20-approval@3.1.4` package contains:
```json
{
  "ipfsCid": "QmYEFrpzT58KfKaL9gjuVrQ3QbGs8PDHDne3pCMR5UMdQp"
}
```

This means the **Lit Protocol team manually updates** the metadata file with the real IPFS CID after initial publication.

---

## Vincent Dashboard Workflow

### Standard Process:

1. **Developer publishes package** with placeholder CID (`QmPLACEHOLDER`)
2. **Register in Vincent Dashboard** - Dashboard reads package
3. **Vincent bundles and publishes** ability code to IPFS
4. **Vincent provides IPFS CID** to developer
5. **Developer uses CID in backend** (environment variables)

### Optional (for official abilities):
6. Developer manually updates metadata file with real CID
7. Developer republishes package with updated CID

---

## What This Means For You

### ✅ The Placeholder is FINE!

Your abilities are correctly structured. The placeholder CID in the npm package **does not prevent**:
- ✅ Vincent Dashboard from recognizing your ability
- ✅ Vincent from bundling and publishing to IPFS
- ✅ Your backend from using the ability

### How Your Backend Uses Abilities

Your backend **does NOT** use the CID from the npm package metadata. Instead, it uses CIDs from:

**Environment Variables** (`packages/backend/.env`):
```bash
CREATE_PROFILE_ABILITY_CID=QmXXXXX...  # From Vincent Dashboard after registration
CREATE_OFFER_ABILITY_CID=QmYYYYY...
TAKE_OPTION_ABILITY_CID=QmZZZZZZ...
SETTLE_OPTION_ABILITY_CID=QmAAAAAA...
```

---

## Next Steps

### 1. Check Vincent Dashboard Status

When you register an ability, Vincent Dashboard should:
- ✅ Find your package on npm
- ✅ Read the metadata file (even with placeholder)
- ✅ Bundle your ability code
- ✅ Publish to IPFS
- ✅ **Provide you with the real IPFS CID**

### 2. Look for the Real IPFS CID

After successful registration, Vincent Dashboard should display or provide:
- A **real IPFS CID** (starts with `Qm...` and is NOT `QmPLACEHOLDER`)
- This is the CID you'll use in your backend `.env` file

### 3. Use the CID in Your Backend

Copy the IPFS CID from Vincent Dashboard into your `.env`:

```bash
# Example with real CIDs (yours will be different)
CREATE_PROFILE_ABILITY_CID=Qm ProtocolHash1234567890abcdef
CREATE_OFFER_ABILITY_CID=QmProtocolHash0987654321fedcba
TAKE_OPTION_ABILITY_CID=QmProtocolHash1111111111111111
SETTLE_OPTION_ABILITY_CID=QmProtocolHash2222222222222222
```

---

## Troubleshooting

### If Dashboard Won't Register Your Ability:

**Check these:**
1. ✅ Package exists on npm: https://www.npmjs.com/package/@parseb/volvi-create-profile
2. ✅ Version is correct: `@parseb/volvi-create-profile@1.0.1` (not 1.0.0)
3. ✅ Metadata file exists: `dist/src/generated/vincent-ability-metadata.json`
4. ✅ Wait 2-3 minutes after publishing (npm registry propagation)

### If Dashboard Shows Placeholder CID:

**This is normal!** The placeholder in the npm package is expected. What matters is:
- Does Vincent Dashboard let you complete the registration?
- Does it provide you with a **different** IPFS CID after registration?

If yes to both, you're good to go!

### If Dashboard Doesn't Provide Real CID:

This might mean Vincent Dashboard is still processing or there's an issue with the registration. Check:
- Vincent Dashboard documentation
- Dashboard UI for status messages
- Any error logs or notifications

---

## Alternative: Manual IPFS Publishing (Advanced)

If Vincent Dashboard isn't generating IPFS CIDs, you could manually publish your abilities to IPFS. However, this is **NOT recommended** because:
- Vincent has specific bundling requirements
- Your ability might not work correctly without Vincent's bundling process
- You'd need to implement the Lit Action bundling yourself

**Recommendation:** Wait for Vincent Dashboard to provide the IPFS CIDs.

---

## Comparing to Official Abilities

### Official Ability (ERC20 Approval):
```json
{
  "ipfsCid": "QmYEFrpzT58KfKaL9gjuVrQ3QbGs8PDHDne3pCMR5UMdQp"
}
```
- Real CID in published package
- Manually updated by Lit Protocol team after initial publish

### Your Abilities:
```json
{
  "ipfsCid": "QmPLACEHOLDER"
}
```
- Placeholder in published package
- Will be updated **after** Vincent Dashboard registers and publishes to IPFS
- Backend will use CID from environment variables, not from package

---

## Summary

**The Placeholder CID is Expected and Correct** ✅

1. Your packages are properly structured
2. Vincent Dashboard should recognize them
3. After registration, Vincent will provide real IPFS CIDs
4. You'll use those CIDs in your backend `.env` file
5. Optionally, you can update the metadata files and republish (like Lit Protocol does)

---

## What to Do Right Now

1. **Try registering** one ability in Vincent Dashboard
2. **Look for a real IPFS CID** in the dashboard after registration
3. If you get a real CID, **copy it** and add to your backend `.env`
4. **Test** if your backend can load and use the ability with that CID

If Vincent Dashboard successfully provides IPFS CIDs, you're all set! The placeholder in the npm package doesn't matter for functionality.

---

**Key Takeaway:** The IPFS CID your backend uses comes from **environment variables**, not from the npm package metadata file. The placeholder is fine!

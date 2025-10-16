# Alpha Limits - Frontend Implementation

**Status:** ✅ Ready to Use
**Enforcement:** Frontend only (no contract changes needed)
**Mode:** Easily toggle with `ALPHA_MODE` flag

---

## 📋 Alpha Limits Summary

### Individual Position Limits
- **Collateral:** 0.0001 - 0.01 ETH ($0.30 - $30)
- **Premium:** Minimum 0.01 USDC per day (1 cent/day)
- **Duration:** 1 - 30 days
- **Gas Reimbursement:** Maximum 0.05 USDC (5 cents)

### Per-User Limits
- **Max Positions:** 10 active options
- **Max Collateral (writer):** 0.1 ETH total (~$300)
- **Max Exposure (taker):** 0.1 ETH total (~$300)

### Protocol-Wide Limits
- **Total TVL Cap:** 1 ETH (~$3,000)
- **Offer Validity:** Maximum 7 days

### Settlement Limits
- **Min Delay After Expiry:** 1 hour
- **Max Delay After Expiry:** 7 days

---

## 🏗️ Implementation

### Files Created

**1. [frontend/lib/alphaLimits.ts](frontend/lib/alphaLimits.ts)**
- Core limits configuration
- Validation functions
- Error messages
- Can toggle `ALPHA_MODE` to disable all limits

**2. [frontend/components/AlphaNotice.tsx](frontend/components/AlphaNotice.tsx)**
- `<AlphaNotice />` - Full warning banner
- `<AlphaNoticeCompact />` - Compact inline notice
- `<AlphaBadge />` - Small alpha badge

**3. [frontend/lib/hooks/useAlphaValidation.ts](frontend/lib/hooks/useAlphaValidation.ts)**
- `useAlphaValidation()` - Main validation hook
- `useFieldValidation()` - Real-time field validation
- `useUserLimits()` - Track user position/collateral limits
- `useProtocolLimits()` - Track protocol TVL limits
- `useCollateralInput()` - Validated collateral input
- `useDurationInput()` - Validated duration slider
- `usePremiumInput()` - Validated premium input

---

## 🎨 Usage Examples

### 1. Add Alpha Notice to Landing Page

```tsx
// app/page.tsx
import { AlphaNotice } from '@/components/AlphaNotice';

export default function Home() {
  return (
    <main>
      <AlphaNotice />
      {/* Rest of page */}
    </main>
  );
}
```

### 2. Validate Writer Creating Offer

```tsx
// components/WriterSidebar.tsx
import { useAlphaValidation } from '@/lib/hooks/useAlphaValidation';
import { AlphaNoticeCompact } from '@/components/AlphaNotice';

export function WriterSidebar() {
  const { validateCreateOffer, limits } = useAlphaValidation();
  const [collateral, setCollateral] = useState('0.001');
  const [premium, setPremium] = useState('0.1');
  const [minDuration, setMinDuration] = useState(7);
  const [maxDuration, setMaxDuration] = useState(30);

  const handleCreate = async () => {
    // Validate before signing
    const validation = validateCreateOffer({
      collateral: parseFloat(collateral),
      premiumPerDay: parseFloat(premium),
      minDuration,
      maxDuration,
      offerExpiry: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
    });

    if (!validation.valid) {
      // Show errors
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Proceed with creating offer
    // ...
  };

  return (
    <div>
      <AlphaNoticeCompact />

      <input
        type="number"
        value={collateral}
        onChange={(e) => setCollateral(e.target.value)}
        min={limits.collateral.min}
        max={limits.collateral.max}
        step="0.0001"
      />

      {/* Rest of form */}
    </div>
  );
}
```

### 3. Validate Taker Taking Option

```tsx
// components/TakerSidebar.tsx
import { useAlphaValidation } from '@/lib/hooks/useAlphaValidation';
import { useCollateralInput, useDurationInput } from '@/lib/hooks/useAlphaValidation';

export function TakerSidebar({ offer }: { offer: OptionOffer }) {
  const { validateTakeOffer } = useAlphaValidation();

  // Use specialized input hooks with automatic validation
  const collateralInput = useCollateralInput(0.001);
  const durationInput = useDurationInput(7);

  const handleTake = async () => {
    // Validate before taking
    const validation = validateTakeOffer({
      fillAmount: collateralInput.value,
      duration: durationInput.value,
      gasReimbursement: 0.02, // Estimated gas cost
    });

    if (!validation.valid) {
      validation.errors.forEach(error => toast.error(error));
      return;
    }

    // Proceed with taking option
    // ...
  };

  return (
    <div>
      <div>
        <label>Fill Amount</label>
        <input
          type="number"
          value={collateralInput.displayValue}
          onChange={(e) => collateralInput.setValue(e.target.value)}
          min={collateralInput.min}
          max={collateralInput.max}
          step="0.0001"
        />
        {collateralInput.error && (
          <p className="text-red-600 text-sm">{collateralInput.error}</p>
        )}
      </div>

      <div>
        <label>Duration: {durationInput.value} days</label>
        <input
          type="range"
          value={durationInput.value}
          onChange={(e) => durationInput.setValue(parseInt(e.target.value))}
          min={durationInput.min}
          max={durationInput.max}
        />
        {durationInput.error && (
          <p className="text-red-600 text-sm">{durationInput.error}</p>
        )}
      </div>

      {/* Rest of form */}
    </div>
  );
}
```

### 4. Check User Limits

```tsx
// components/PositionCard.tsx or WriterSidebar.tsx
import { useUserLimits } from '@/lib/hooks/useAlphaValidation';
import { useAccount } from 'wagmi';

export function UserLimitsDisplay() {
  const { address } = useAccount();
  const userLimits = useUserLimits(address);

  return (
    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
      <h4 className="font-medium text-blue-900 mb-2">Your Alpha Limits</h4>
      <ul className="space-y-1 text-blue-800">
        <li>
          Positions: {userLimits.positionCount} / {userLimits.maxPositions}
          {!userLimits.canCreatePosition && (
            <span className="text-red-600 ml-2">⚠️ Limit reached</span>
          )}
        </li>
        <li>
          Collateral: {userLimits.totalCollateral.toFixed(4)} / {userLimits.maxCollateral} ETH
          {!userLimits.canWriteMore && (
            <span className="text-red-600 ml-2">⚠️ Limit reached</span>
          )}
        </li>
      </ul>
    </div>
  );
}
```

### 5. Check Protocol TVL

```tsx
// components/ProtocolStats.tsx
import { useProtocolLimits } from '@/lib/hooks/useAlphaValidation';

export function ProtocolStats() {
  const protocol = useProtocolLimits();

  return (
    <div className="stats">
      <div className="stat">
        <div className="stat-title">Protocol TVL</div>
        <div className="stat-value">
          {protocol.tvl.toFixed(4)} ETH
        </div>
        <div className="stat-desc">
          {protocol.utilizationPercent.toFixed(1)}% of {protocol.maxTvl} ETH cap
          {protocol.isNearCap && (
            <span className="text-warning ml-2">⚠️ Near capacity</span>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 6. Add Alpha Badge to Nav

```tsx
// components/Header.tsx
import { AlphaBadge } from '@/components/AlphaNotice';

export function Header() {
  return (
    <header>
      <div className="logo-area">
        <h1>Options Protocol</h1>
        <AlphaBadge />
      </div>
      {/* Rest of header */}
    </header>
  );
}
```

---

## 🎛️ Toggling Alpha Mode

### Disable All Limits (After Graduation)

Simply change one line in `frontend/lib/alphaLimits.ts`:

```typescript
// Before (Alpha mode ON)
export const ALPHA_MODE = true;

// After (Alpha mode OFF - all limits disabled)
export const ALPHA_MODE = false;
```

All validation functions will automatically return `{ valid: true }` when `ALPHA_MODE = false`.

### Environment-Based Toggle (Recommended)

Update `alphaLimits.ts`:

```typescript
export const ALPHA_MODE = process.env.NEXT_PUBLIC_ALPHA_MODE === 'true';
```

Then use `.env`:

```bash
# .env.local (local development - alpha ON)
NEXT_PUBLIC_ALPHA_MODE=true

# .env.production (mainnet - alpha OFF)
NEXT_PUBLIC_ALPHA_MODE=false
```

---

## 📊 Backend API Extensions (Optional)

While frontend validation is sufficient, you can optionally add backend endpoints for centralized tracking:

### GET /api/protocol/stats

```typescript
// Returns protocol-wide statistics
{
  tvl: "0.5",  // ETH
  tvlUsd: "1500",  // USD
  totalPositions: 25,
  totalOffers: 50,
  utilizationPercent: 50,
  nearCap: false
}
```

### GET /api/users/:address/limits

```typescript
// Returns user-specific limits
{
  address: "0x123...",
  positionCount: 3,
  totalCollateral: "0.03",  // ETH
  canCreatePosition: true,
  canWriteMore: true,
  maxPositions: 10,
  maxCollateral: "0.1"
}
```

These endpoints would pull from the existing storage layer (no new tables needed).

---

## ⚡ Adjusting Limits

### Increase Limits Gradually

As the protocol proves stable, you can adjust limits in `alphaLimits.ts`:

```typescript
// Week 1: Conservative
collateral: { min: 0.0001, max: 0.01 },
duration: { min: 1, max: 30 },
protocol: { maxTvl: 1.0 },

// Week 4: Moderate (if stable)
collateral: { min: 0.0001, max: 0.05 },  // Increase max to 0.05 ETH
duration: { min: 1, max: 60 },           // Increase to 60 days
protocol: { maxTvl: 5.0 },               // Increase to 5 ETH

// Week 8: Beta
collateral: { min: 0.0001, max: 0.1 },   // Increase max to 0.1 ETH
duration: { min: 1, max: 90 },           // Increase to 90 days
protocol: { maxTvl: 10.0 },              // Increase to 10 ETH

// Week 12+: Mainnet (remove limits)
ALPHA_MODE = false  // Disable all limits
```

---

## ✅ Benefits of Frontend-Only Enforcement

**1. Flexibility**
- Adjust limits instantly without contract upgrades
- A/B test different limit configurations
- Gradual rollout to different user segments

**2. No Gas Costs**
- No need to redeploy contracts
- No transaction costs to update limits

**3. User Experience**
- Real-time validation before signing
- Clear error messages
- Better UX than on-chain reverts

**4. Easy Graduation**
- Single flag flip to disable all limits
- Can keep alpha mode for new features
- Smooth transition to full protocol

**5. Existing Contract Limits Sufficient**
- Writer sets min/max duration per offer ✅
- Writer sets minFillAmount ✅
- Token configs have minUnit ✅
- No need to change tested contracts

---

## 🎓 Testing Checklist

Before deploying to production:

- [ ] Add `<AlphaNotice />` to landing page
- [ ] Add `<AlphaBadge />` to header
- [ ] Integrate validation in WriterSidebar
- [ ] Integrate validation in TakerSidebar
- [ ] Test with values at boundaries (0.0001, 0.01, 1 day, 30 days)
- [ ] Test with values outside limits (should show errors)
- [ ] Test toggling `ALPHA_MODE` flag
- [ ] Update documentation with alpha limits
- [ ] Add limits to frontend FAQ
- [ ] Monitor first 24 hours closely

---

## 📖 User Communication

### In-App Messages

**Landing Page Banner:**
> 🧪 **Alpha Launch** - Options Protocol is in alpha testing. Limits apply to manage risk: 0.0001-0.01 ETH per option, 1-30 days duration, max 10 positions per user. [Learn More]

**Create Offer Form:**
> ⚠️ **Alpha Limits**: Collateral between 0.0001 and 0.01 ETH, premium minimum 1¢/day, offer valid up to 7 days

**Take Option Form:**
> ⚠️ **Alpha Limits**: Fill amount 0.0001-0.01 ETH, duration 1-30 days

### FAQ Entry

**Q: Why are there limits during alpha?**
> A: We're launching conservatively on Base mainnet to ensure system stability. Limits keep individual risk low ($0.30-$30 per option) while we test all features. These limits will increase as the protocol proves reliable.

---

## 🚀 Graduation Path

**Alpha → Beta (After 100+ successful options)**
1. Increase max collateral to 0.1 ETH
2. Increase max duration to 90 days
3. Increase TVL cap to 10 ETH
4. Keep position limits

**Beta → Mainnet (After security audit + 500+ options)**
1. Set `ALPHA_MODE = false`
2. Remove all frontend limits
3. Full protocol launch

---

**Summary:**
- ✅ Limits enforced in frontend only
- ✅ No contract changes needed
- ✅ Easy to toggle and adjust
- ✅ Better UX than on-chain validation
- ✅ Ready to implement immediately

**Next Step:** Integrate alpha validation into WriterSidebar and TakerSidebar components.

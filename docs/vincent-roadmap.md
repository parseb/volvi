## Vincent Implementation Roadmap

This document outlines a phased roadmap to implement the Vincent-based options protocol described in the main specification. It focuses on the changes required to make liquidity LPs deposit USDC-only, simplify PUT handling (collateralize in USDC), expose a simple UX for selling/pricing volatility, and keep the take flow gasless.

Phases
------

1) Design & Spec Finalization (1-2 days)
  - Finalize data shapes (LiquidityProfile, VincentOffer, SettlementTerms)
  - Confirm rounding rules for minUnit (0.001 scaled by token decimals) and premium floor (0.01 USDC)
  - Confirm out-of-range fee: 1 USDC flat

2) Contract Plumbing (3-5 days)
  - Add `LiquidityProfile` struct and storage
  - Implement `createLiquidityProfile`, `depositToProfile`, `withdrawFromProfile` (USDC-only)
  - Add `checkProfileCoverage` view function
  - Add events for profile lifecycle

3) Offer & Take Refactor (4-7 days)
  - Reference `profileId` in `OptionOffer`
  - Update EIP-712 typehashes and signing helpers
  - Refactor `takeOptionGasless` to reserve USDC from profile and only perform swaps for CALLs. PUTs keep USDC collateralized.
  - Enforce minPremium and minUnit
  - Implement out-of-range fee handling

4) Backend & Relayer Changes (3-5 days)
  - New endpoints for profiles and enhanced orderbook
  - Relayer changes for new take flow and EIP-3009 deposit/premium handling
  - Pyth price helper for UI and backend

5) Frontend Changes (4-8 days)
  - Liquidity profile creation UI (token selector with tokenlist)
  - Monolithic liquidity chart visualization
  - Take flow with out-of-range fee UI and settlement condition inputs

6) Tests, Audit Prep & Launch (2-3 weeks)
  - Unit and integration tests (Foundry) for all new flows
  - Audit remediation and final testing
  - Monitoring and deployment pipeline

Low-risk extras
----------------
- Add `checkProfileCoverage` view immediately (easy and highly useful for frontend)
- Add Storybook components for token selector and liquidity chart
- Write a single end-to-end foundry test for LP deposit → take → settle (happy path)

Notes
-----
- PUTs: per your instruction, PUTs will be collateralized in USDC and we will not pre-buy the underlying. Settlement for PUTs will be done by comparing price at expiry and transferring profits in USDC.
- CALLs: we will swap USDC → underlying at take-time to produce collateral when required.

Contact
-------
If you'd like, I can start implementing Phase 2 now (contract plumbing) and add the Foundry test template.

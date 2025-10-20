/**
 * Lit Action for creating an option offer
 *
 * This action signs an EIP-712 typed data structure representing an option offer.
 * The signed offer can then be submitted to the backend orderbook.
 *
 * The signature proves that the writer (PKP owner) agrees to the offer terms.
 */

export const createOfferLitAction = `
(async () => {
  try {
    const {
      contractAddress,
      profileId,
      underlying,
      collateralAmount,
      stablecoin,
      isCall,
      premiumPerDay,
      minDuration,
      maxDuration,
      minFillAmount,
      deadline,
      configHash,
      chainId,
      pkpAddress,
    } = Lit.Actions.getParams();

    // EIP-712 Domain
    const domain = {
      name: 'OptionsProtocol',
      version: '1',
      chainId: chainId,
      verifyingContract: contractAddress,
    };

    // EIP-712 Types
    const types = {
      OptionOffer: [
        { name: 'writer', type: 'address' },
        { name: 'profileId', type: 'bytes32' },
        { name: 'underlying', type: 'address' },
        { name: 'collateralAmount', type: 'uint256' },
        { name: 'stablecoin', type: 'address' },
        { name: 'isCall', type: 'bool' },
        { name: 'premiumPerDay', type: 'uint256' },
        { name: 'minDuration', type: 'uint16' },
        { name: 'maxDuration', type: 'uint16' },
        { name: 'minFillAmount', type: 'uint256' },
        { name: 'deadline', type: 'uint64' },
        { name: 'configHash', type: 'bytes32' },
      ],
    };

    // Value (the offer data)
    const value = {
      writer: pkpAddress,
      profileId: profileId,
      underlying: underlying,
      collateralAmount: collateralAmount,
      stablecoin: stablecoin,
      isCall: isCall,
      premiumPerDay: premiumPerDay,
      minDuration: minDuration,
      maxDuration: maxDuration,
      minFillAmount: minFillAmount,
      deadline: deadline,
      configHash: configHash,
    };

    // Sign the EIP-712 typed data
    const signature = await Lit.Actions.signEip712({
      domain,
      types,
      primaryType: 'OptionOffer',
      message: value,
    });

    // Calculate offer hash (for identification)
    const offerHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        [
          'address',
          'bytes32',
          'address',
          'uint256',
          'address',
          'bool',
          'uint256',
          'uint16',
          'uint16',
          'uint256',
          'uint64',
          'bytes32',
        ],
        [
          pkpAddress,
          profileId,
          underlying,
          collateralAmount,
          stablecoin,
          isCall,
          premiumPerDay,
          minDuration,
          maxDuration,
          minFillAmount,
          deadline,
          configHash,
        ]
      )
    );

    // Return the signature and offer data
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        signature: signature.signature,
        offer: value,
        offerHash,
      })
    });
  } catch (error) {
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: false,
        error: error.message || 'Unknown error in Lit Action'
      })
    });
  }
})();
`;

export default createOfferLitAction;

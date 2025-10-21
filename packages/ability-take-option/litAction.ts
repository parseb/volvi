/**
 * Lit Action for taking an option gaslessly
 *
 * This action calls the OptionsProtocolGasless.takeOptionGasless function
 * which uses EIP-3009 for gasless USDC payment.
 *
 * The flow:
 * 1. User signs EIP-3009 authorization for premium + gas payment
 * 2. This Lit Action calls takeOptionGasless with the authorization
 * 3. Contract validates authorization and transfers USDC
 * 4. Option NFT is minted to the user's PKP
 */

export const takeOptionLitAction = `
(async () => {
  try {
    const {
      contractAddress,
      offer,
      offerSignature,
      fillAmount,
      duration,
      paymentAuth,
      chainId,
    } = Lit.Actions.getParams();

    // ABI for takeOptionGasless function
    const takeOptionAbi = [
      \`function takeOptionGasless(
        (address writer, bytes32 profileId, address underlying, uint256 collateralAmount, address stablecoin, bool isCall, uint256 premiumPerDay, uint16 minDuration, uint16 maxDuration, uint256 minFillAmount, uint64 deadline, bytes32 configHash) offer,
        bytes offerSignature,
        uint256 fillAmount,
        uint16 duration,
        (address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s) paymentAuth
      ) external returns (uint256 tokenId)\`
    ];

    // Encode function call
    const iface = new ethers.utils.Interface(takeOptionAbi);
    const data = iface.encodeFunctionData('takeOptionGasless', [
      [
        offer.writer,
        offer.profileId,
        offer.underlying,
        offer.collateralAmount,
        offer.stablecoin,
        offer.isCall,
        offer.premiumPerDay,
        offer.minDuration,
        offer.maxDuration,
        offer.minFillAmount,
        offer.deadline,
        offer.configHash,
      ],
      offerSignature,
      fillAmount,
      duration,
      [
        paymentAuth.from,
        paymentAuth.to,
        paymentAuth.value,
        paymentAuth.validAfter,
        paymentAuth.validBefore,
        paymentAuth.nonce,
        paymentAuth.v,
        paymentAuth.r,
        paymentAuth.s,
      ],
    ]);

    // Determine chain name
    let chain;
    if (chainId === 8453) {
      chain = 'base';
    } else if (chainId === 84532) {
      chain = 'baseSepolia';
    } else if (chainId === 11155111) {
      chain = 'sepolia';
    } else {
      throw new Error(\`Unsupported chain ID: \${chainId}\`);
    }

    // Call contract
    const txn = await Lit.Actions.callContract({
      chain,
      txn: {
        to: contractAddress,
        data,
        value: '0',
      },
    });

    // Parse logs to extract token ID
    // Event: OptionTakenGasless(uint256 indexed tokenId, bytes32 indexed offerHash, address indexed taker, ...)
    const eventSignature = ethers.utils.id('OptionTakenGasless(uint256,bytes32,address,uint256,uint256,uint256)');
    let tokenId = null;

    if (txn.logs && txn.logs.length > 0) {
      for (const log of txn.logs) {
        if (log.topics && log.topics[0] === eventSignature) {
          tokenId = ethers.utils.defaultAbiCoder.decode(['uint256'], log.topics[1])[0];
          break;
        }
      }
    }

    // Return result
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        txHash: txn.hash,
        tokenId: tokenId ? tokenId.toString() : null,
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

export default takeOptionLitAction;

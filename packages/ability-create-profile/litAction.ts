/**
 * Lit Action for creating a liquidity profile
 * This code runs in the Lit Protocol network
 *
 * The Lit Action will:
 * 1. Receive parameters from the ability client
 * 2. Call the OptionsProtocol.createLiquidityProfile function
 * 3. Return the transaction hash and profile ID
 */

export const createProfileLitAction = `
(async () => {
  try {
    const {
      contractAddress,
      totalUSDC,
      maxLockDays,
      minUnit,
      minPremium,
      chainId,
    } = Lit.Actions.getParams();

    // ABI for createLiquidityProfile function
    const createProfileAbi = [
      'function createLiquidityProfile(uint256 totalUSDC, uint16 maxLockDays, uint256 minUnit, uint256 minPremium) external returns (bytes32 profileId)'
    ];

    // Encode function call
    const iface = new ethers.utils.Interface(createProfileAbi);
    const data = iface.encodeFunctionData('createLiquidityProfile', [
      totalUSDC,
      maxLockDays,
      minUnit,
      minPremium
    ]);

    // Determine chain name for Lit Protocol
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

    // Call contract via Lit Protocol
    const txn = await Lit.Actions.callContract({
      chain,
      txn: {
        to: contractAddress,
        data,
        value: '0',
      },
    });

    // Parse logs to extract profile ID
    // Event: LiquidityProfileCreated(bytes32 indexed profileId, address indexed owner, uint256 totalUSDC)
    const eventSignature = ethers.utils.id('LiquidityProfileCreated(bytes32,address,uint256)');
    let profileId = null;

    if (txn.logs && txn.logs.length > 0) {
      for (const log of txn.logs) {
        if (log.topics && log.topics[0] === eventSignature) {
          profileId = log.topics[1]; // profileId is the first indexed parameter
          break;
        }
      }
    }

    // Return result
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        txHash: txn.hash,
        profileId,
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

// Export as string for IPFS publishing
export default createProfileLitAction;

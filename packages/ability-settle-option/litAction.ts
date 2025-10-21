/**
 * Lit Action for settling an option
 *
 * This action calls the OptionsProtocol.settleOption function
 * which:
 * 1. Checks if option is expired
 * 2. Gets current price from Pyth oracle
 * 3. Calculates profit (if any)
 * 4. Distributes proceeds to option holder and writer
 * 5. Burns the option NFT
 */

export const settleOptionLitAction = `
(async () => {
  try {
    const {
      contractAddress,
      tokenId,
      chainId,
    } = Lit.Actions.getParams();

    // ABI for settleOption function
    const settleOptionAbi = [
      'function settleOption(uint256 tokenId) external'
    ];

    // Encode function call
    const iface = new ethers.utils.Interface(settleOptionAbi);
    const data = iface.encodeFunctionData('settleOption', [tokenId]);

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

    // Parse logs to extract profit amount
    // Event: OptionSettled(uint256 indexed tokenId, uint256 profit, address settler)
    const eventSignature = ethers.utils.id('OptionSettled(uint256,uint256,address)');
    let profit = null;

    if (txn.logs && txn.logs.length > 0) {
      for (const log of txn.logs) {
        if (log.topics && log.topics[0] === eventSignature) {
          // Decode the data field which contains profit
          const decoded = ethers.utils.defaultAbiCoder.decode(['uint256', 'address'], log.data);
          profit = decoded[0].toString();
          break;
        }
      }
    }

    // Return result
    Lit.Actions.setResponse({
      response: JSON.stringify({
        success: true,
        txHash: txn.hash,
        profit,
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

export default settleOptionLitAction;

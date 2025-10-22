// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptionsProtocol.sol";

contract DeployBaseMainnetScript is Script {
    // Base Mainnet production addresses
    address constant PYTH = 0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a; // Pyth on Base Mainnet
    address constant UNISWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481; // SwapRouter02 on Base Mainnet
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913; // USDC on Base Mainnet
    address constant WETH = 0x4200000000000000000000000000000000000006; // WETH on Base Mainnet

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================================");
        console.log("!!!    DEPLOYING TO BASE MAINNET    !!!");
        console.log("!!!    THIS USES REAL MONEY         !!!");
        console.log("=================================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("=================================================\n");

        // Safety checks
        require(deployer.balance > 0.0001 ether, "Insufficient ETH balance (need >= 0.01 ETH)");

        console.log("WARNING: You are about to deploy to BASE MAINNET");
        console.log("WARNING: This will spend REAL ETH");
        console.log("WARNING: Contracts are IMMUTABLE once deployed");
        console.log("WARNING: Press Ctrl+C within 10 seconds to cancel...\n");

        // Give user time to cancel
        vm.sleep(10000);

        console.log("\nStarting deployment to Base Mainnet...\n");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy OptionsProtocol
        console.log("Deploying OptionsProtocol...");
        OptionsProtocol protocol = new OptionsProtocol(
            PYTH,
            UNISWAP_ROUTER,
            USDC
        );

        vm.stopBroadcast();

        console.log("\n=================================================");
        console.log("MAINNET DEPLOYMENT COMPLETE!");
        console.log("=================================================");
        console.log("OptionsProtocol:", address(protocol));
        console.log("Network: Base Mainnet (Chain ID: 8453)");
        console.log("=================================================\n");

        console.log("Next Steps:");
        console.log("1. Verify contract on BaseScan");
        console.log("2. Update backend .env with contract address");
        console.log("3. Update frontend .env with contract address");
        console.log("4. Test with small amounts first!");
        console.log("\n");

        console.log("To verify the contract, run:");
        console.log("forge verify-contract", vm.toString(address(protocol)));
        console.log("  src/OptionsProtocol.sol:OptionsProtocol");
        console.log("  --chain base --watch");
        console.log("\n");

        // Write deployment addresses to file
        string memory deploymentInfo = string(abi.encodePacked(
            "# Base Mainnet Deployment\n",
            "# Deployed: ", vm.toString(block.timestamp), "\n",
            "# Block: ", vm.toString(block.number), "\n",
            "\n",
            "BASE_MAINNET_PROTOCOL_ADDRESS=", vm.toString(address(protocol)), "\n",
            "BASE_MAINNET_PYTH=", vm.toString(PYTH), "\n",
            "BASE_MAINNET_UNISWAP_ROUTER=", vm.toString(UNISWAP_ROUTER), "\n",
            "BASE_MAINNET_USDC=", vm.toString(USDC), "\n",
            "BASE_MAINNET_WETH=", vm.toString(WETH), "\n",
            "DEPLOYER=", vm.toString(deployer), "\n"
        ));

        vm.writeFile("deployments/base-mainnet.txt", deploymentInfo);
        console.log("Deployment info written to deployments/base-mainnet.txt");

        console.log("\nIMPORTANT SECURITY REMINDERS:");
        console.log("- Verify contract on BaseScan immediately");
        console.log("- Test with small amounts first");
        console.log("- Set up monitoring (Tenderly, Defender)");
        console.log("- Keep deployment info secure");
        console.log("- Consider transferring ownership if needed");
    }
}

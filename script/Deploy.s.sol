// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptionsProtocol.sol";

contract DeployScript is Script {
    function run() external {
        // Read deployment parameters from environment
        address pyth = vm.envAddress("PYTH_ADDRESS");
        address uniswapRouter = vm.envAddress("UNISWAP_V3_ROUTER");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address weth = vm.envAddress("WETH_ADDRESS");
        bytes32 pythEthUsdFeed = vm.envBytes32("PYTH_ETH_USD_FEED");

        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address broadcasterAddress = vm.envAddress("BROADCASTER_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy Options Protocol
        OptionsProtocol protocol = new OptionsProtocol(
            pyth,
            uniswapRouter,
            usdc
        );

        console.log("OptionsProtocol deployed at:", address(protocol));

        // Configure WETH
        bytes32 wethConfigHash = protocol.setTokenConfig(
            weth,
            usdc,
            0.01 ether,  // Min 0.01 ETH
            uniswapRouter,
            3000,  // 0.3% pool fee
            pythEthUsdFeed,
            address(0),  // No Uniswap fallback for now
            address(0),  // No pre-hook
            address(0),  // No post-hook
            address(0)   // No settlement hook
        );

        console.log("WETH config hash:", vm.toString(wethConfigHash));

        // Grant broadcaster role
        protocol.grantBroadcasterRole(broadcasterAddress);
        console.log("Broadcaster role granted to:", broadcasterAddress);

        vm.stopBroadcast();

        // Save deployment addresses
        string memory deploymentInfo = string.concat(
            "PROTOCOL_ADDRESS=", vm.toString(address(protocol)), "\n",
            "WETH_CONFIG_HASH=", vm.toString(wethConfigHash), "\n"
        );

        vm.writeFile("./deployment.txt", deploymentInfo);
        console.log("\nDeployment info saved to deployment.txt");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptionsProtocolGasless.sol";

contract DeployBaseSepoliaGaslessScript is Script {
    // Base Sepolia addresses
    address constant PYTH = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729;
    address constant UNISWAP_ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4;
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    address constant COW_SETTLEMENT = 0x9008D19f58AAbD9eD0D60971565AA8510560ab41; // CoW Protocol GPv2Settlement on Base Sepolia

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying OptionsProtocolGasless to Base Sepolia...");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy gasless protocol
        // Gas vault initially set to deployer, can be updated later
        OptionsProtocolGasless protocol = new OptionsProtocolGasless(
            PYTH,
            UNISWAP_ROUTER,
            USDC,
            deployer, // Gas vault (temporary)
            COW_SETTLEMENT
        );

        console.log("OptionsProtocolGasless deployed at:", address(protocol));

        // Add WETH configuration
        bytes32 configHash = protocol.setTokenConfig(
            WETH,                                                                           // token
            USDC,                                                                          // stablecoin
            1e15,                                                                          // minUnit (0.001 ETH)
            UNISWAP_ROUTER,                                                                // swapVenue
            500,                                                                           // poolFee (0.05%)
            0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace,           // pythPriceFeedId (ETH/USD)
            address(0),                                                                    // uniswapFallback (none)
            address(0),                                                                    // preHook (none)
            address(0),                                                                    // postHook (none)
            address(0)                                                                     // settlementHook (none)
        );

        console.log("WETH configuration added with hash:", vm.toString(configHash));

        vm.stopBroadcast();

        // Save deployment info
        string memory deploymentInfo = string(abi.encodePacked(
            "# Base Sepolia Gasless Deployment\n",
            "BASE_SEPOLIA_PROTOCOL_GASLESS=", vm.toString(address(protocol)), "\n",
            "BASE_SEPOLIA_PYTH=", vm.toString(PYTH), "\n",
            "BASE_SEPOLIA_UNISWAP_ROUTER=", vm.toString(UNISWAP_ROUTER), "\n",
            "BASE_SEPOLIA_USDC=", vm.toString(USDC), "\n",
            "BASE_SEPOLIA_WETH=", vm.toString(WETH), "\n",
            "BASE_SEPOLIA_COW_SETTLEMENT=", vm.toString(COW_SETTLEMENT), "\n"
        ));

        vm.writeFile("./deployments/base-sepolia-gasless.txt", deploymentInfo);
        console.log("Deployment info saved to deployments/base-sepolia-gasless.txt");
    }
}

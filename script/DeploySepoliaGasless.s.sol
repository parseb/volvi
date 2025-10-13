// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptionsProtocolGasless.sol";

contract DeploySepoliaGaslessScript is Script {
    // Sepolia testnet addresses
    address constant PYTH = 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21; // Pyth on Sepolia
    address constant UNISWAP_ROUTER = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E; // SwapRouter02 on Sepolia
    address constant USDC = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8; // USDC on Sepolia (Circle)
    address constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // WETH on Sepolia
    address constant COW_SETTLEMENT = 0x9008D19f58AAbD9eD0D60971565AA8510560ab41; // CoW Protocol GPv2Settlement on Sepolia

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================================");
        console.log("Deploying OptionsProtocolGasless to Sepolia Testnet");
        console.log("=================================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("=================================================\n");

        require(deployer.balance > 0.1 ether, "Insufficient ETH balance for deployment");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy OptionsProtocolGasless
        console.log("Deploying OptionsProtocolGasless...");
        OptionsProtocolGasless protocol = new OptionsProtocolGasless(
            PYTH,
            UNISWAP_ROUTER,
            USDC,
            deployer, // Gas vault (initially deployer, can be updated later)
            COW_SETTLEMENT
        );

        console.log("OptionsProtocolGasless deployed at:", address(protocol));

        // Add WETH configuration
        console.log("\nConfiguring WETH token...");
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

        console.log("\n=================================================");
        console.log("Deployment Complete!");
        console.log("=================================================");
        console.log("OptionsProtocolGasless:", address(protocol));
        console.log("WETH Config Hash:", vm.toString(configHash));
        console.log("=================================================\n");

        console.log("To verify the contract, run:");
        console.log("forge verify-contract", address(protocol), "src/OptionsProtocolGasless.sol:OptionsProtocolGasless");
        console.log("  --chain sepolia --watch");
        console.log("\n");

        // Write deployment addresses to file
        string memory deploymentInfo = string(abi.encodePacked(
            "# Sepolia Gasless Deployment\n",
            "SEPOLIA_PROTOCOL_GASLESS=", vm.toString(address(protocol)), "\n",
            "SEPOLIA_PYTH=", vm.toString(PYTH), "\n",
            "SEPOLIA_UNISWAP_ROUTER=", vm.toString(UNISWAP_ROUTER), "\n",
            "SEPOLIA_USDC=", vm.toString(USDC), "\n",
            "SEPOLIA_WETH=", vm.toString(WETH), "\n",
            "SEPOLIA_COW_SETTLEMENT=", vm.toString(COW_SETTLEMENT), "\n",
            "SEPOLIA_WETH_CONFIG_HASH=", vm.toString(configHash), "\n"
        ));

        vm.writeFile("deployments/sepolia-gasless.txt", deploymentInfo);
        console.log("Deployment info written to deployments/sepolia-gasless.txt");
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptionsProtocol.sol";

contract DeploySepoliaScript is Script {
    // Sepolia testnet addresses
    address constant PYTH = 0xDd24F84d36BF92C65F92307595335bdFab5Bbd21; // Pyth on Sepolia
    address constant UNISWAP_ROUTER = 0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E; // SwapRouter02 on Sepolia
    address constant USDC = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8; // USDC on Sepolia (Circle)
    address constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9; // WETH on Sepolia

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================================");
        console.log("Deploying to Sepolia Testnet");
        console.log("=================================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("=================================================\n");

        require(deployer.balance > 0.1 ether, "Insufficient ETH balance for deployment");

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
        console.log("Deployment Complete!");
        console.log("=================================================");
        console.log("OptionsProtocol:", address(protocol));
        console.log("=================================================\n");

        console.log("To verify the contract, run:");
        console.log("forge verify-contract <address> src/OptionsProtocol.sol:OptionsProtocol");
        console.log("  --chain sepolia --watch");
        console.log("\n");

        // Write deployment addresses to file
        string memory deploymentInfo = string(abi.encodePacked(
            "# Sepolia Deployment\n",
            "SEPOLIA_PROTOCOL_ADDRESS=", vm.toString(address(protocol)), "\n",
            "SEPOLIA_PYTH=", vm.toString(PYTH), "\n",
            "SEPOLIA_UNISWAP_ROUTER=", vm.toString(UNISWAP_ROUTER), "\n",
            "SEPOLIA_USDC=", vm.toString(USDC), "\n",
            "SEPOLIA_WETH=", vm.toString(WETH), "\n"
        ));

        vm.writeFile("deployments/sepolia.txt", deploymentInfo);
        console.log("Deployment info written to deployments/sepolia.txt");
    }
}

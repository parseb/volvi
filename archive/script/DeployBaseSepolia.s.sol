// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/OptionsProtocol.sol";

contract DeployBaseSepoliaScript is Script {
    // Base Sepolia testnet addresses
    address constant PYTH = 0xA2aa501b19aff244D90cc15a4Cf739D2725B5729; // Pyth on Base Sepolia
    address constant UNISWAP_ROUTER = 0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4; // SwapRouter02 on Base Sepolia
    address constant USDC = 0x036CbD53842c5426634e7929541eC2318f3dCF7e; // USDC on Base Sepolia
    address constant WETH = 0x4200000000000000000000000000000000000006; // WETH on Base Sepolia (same as Base)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================================");
        console.log("Deploying to Base Sepolia Testnet");
        console.log("=================================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("=================================================\n");

        require(deployer.balance > 0.01 ether, "Insufficient ETH balance for deployment");

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
        console.log("  --chain base-sepolia --watch");
        console.log("\n");

        // Write deployment addresses to file
        string memory deploymentInfo = string(abi.encodePacked(
            "# Base Sepolia Deployment\n",
            "BASE_SEPOLIA_PROTOCOL_ADDRESS=", vm.toString(address(protocol)), "\n",
            "BASE_SEPOLIA_PYTH=", vm.toString(PYTH), "\n",
            "BASE_SEPOLIA_UNISWAP_ROUTER=", vm.toString(UNISWAP_ROUTER), "\n",
            "BASE_SEPOLIA_USDC=", vm.toString(USDC), "\n",
            "BASE_SEPOLIA_WETH=", vm.toString(WETH), "\n"
        ));

        vm.writeFile("deployments/base-sepolia.txt", deploymentInfo);
        console.log("Deployment info written to deployments/base-sepolia.txt");
    }
}

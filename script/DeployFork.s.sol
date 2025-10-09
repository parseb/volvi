// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/StdCheats.sol";
import "../src/OptionsProtocolGasless.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract DeployForkScript is Script, StdCheats {
    // Base Mainnet addresses (forked)
    address constant PYTH = 0x8250f4aF4B972684F7b336503E2D6dFeDeB1487a;
    address constant UNISWAP_ROUTER = 0x2626664c2603336E57B271c5C0b26F421741e481;
    address constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant WETH = 0x4200000000000000000000000000000000000006;
    bytes32 constant PYTH_ETH_USD_FEED = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    // Anvil test accounts
    uint256 constant DEPLOYER_KEY = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint256 constant WRITER_KEY = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    uint256 constant TAKER_KEY = 0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a;

    address DEPLOYER;
    address WRITER;
    address TAKER;

    function run() external {
        // Derive addresses
        DEPLOYER = vm.addr(DEPLOYER_KEY);
        WRITER = vm.addr(WRITER_KEY);
        TAKER = vm.addr(TAKER_KEY);

        console.log("=================================================");
        console.log("Deploying to Base Fork");
        console.log("=================================================");
        console.log("Deployer:", DEPLOYER);
        console.log("Writer (LP):", WRITER);
        console.log("Taker:", TAKER);
        console.log("=================================================\n");

        // Step 1: Fund accounts with ETH
        console.log("Step 1: Funding accounts with ETH...");
        vm.deal(DEPLOYER, 100 ether);
        vm.deal(WRITER, 100 ether);
        vm.deal(TAKER, 100 ether);
        console.log("  Deployer ETH:", DEPLOYER.balance / 1e18, "ETH");
        console.log("  Writer ETH:", WRITER.balance / 1e18, "ETH");
        console.log("  Taker ETH:", TAKER.balance / 1e18, "ETH\n");

        // Step 2: Deal USDC to test accounts
        console.log("Step 2: Dealing USDC to test accounts...");
        dealUSDC(DEPLOYER, 100_000e6);  // 100k USDC
        dealUSDC(WRITER, 50_000e6);     // 50k USDC
        dealUSDC(TAKER, 50_000e6);      // 50k USDC
        console.log("  Deployer USDC:", IERC20(USDC).balanceOf(DEPLOYER) / 1e6, "USDC");
        console.log("  Writer USDC:", IERC20(USDC).balanceOf(WRITER) / 1e6, "USDC");
        console.log("  Taker USDC:", IERC20(USDC).balanceOf(TAKER) / 1e6, "USDC\n");

        // Step 3: Deal WETH to writer (for collateral)
        console.log("Step 3: Dealing WETH to Writer...");
        dealWETH(WRITER, 10 ether);  // 10 WETH
        console.log("  Writer WETH:", IERC20(WETH).balanceOf(WRITER) / 1e18, "WETH\n");

        // Step 4: Deploy protocol
        console.log("Step 4: Deploying OptionsProtocolGasless...");
        vm.startBroadcast(DEPLOYER_KEY);

        OptionsProtocolGasless protocol = new OptionsProtocolGasless(
            PYTH,
            UNISWAP_ROUTER,
            USDC,
            DEPLOYER,  // Gas vault = deployer for testing
            address(0) // CowSwap settlement (not needed for basic testing)
        );

        console.log("  Protocol deployed at:", address(protocol));
        console.log("  Gas vault:", DEPLOYER);
        console.log("  Protocol fee:", protocol.fee() / 1e6, "USDC\n");

        // Step 5: Configure WETH
        console.log("Step 5: Configuring WETH...");
        bytes32 wethConfigHash = protocol.setTokenConfig(
            WETH,
            USDC,
            0.01 ether,  // Min 0.01 ETH
            UNISWAP_ROUTER,
            3000,  // 0.3% pool fee
            PYTH_ETH_USD_FEED,
            address(0),  // No Uniswap fallback
            address(0),  // No pre-hook
            address(0),  // No post-hook
            address(0)   // No settlement hook
        );
        console.log("  WETH config hash:", vm.toString(wethConfigHash), "\n");

        // Step 6: Grant roles
        console.log("Step 6: Granting roles...");
        protocol.grantBroadcasterRole(DEPLOYER);
        console.log("  Broadcaster role granted to:", DEPLOYER, "\n");

        vm.stopBroadcast();

        // Step 7: Approve protocol for test accounts
        console.log("Step 7: Pre-approving tokens for convenience...");

        // Writer approves WETH (for collateral)
        vm.startBroadcast(WRITER_KEY);
        IERC20(WETH).approve(address(protocol), type(uint256).max);
        console.log("  Writer approved WETH");
        vm.stopBroadcast();

        // Taker approves USDC (for premiums)
        vm.startBroadcast(TAKER_KEY);
        IERC20(USDC).approve(address(protocol), type(uint256).max);
        console.log("  Taker approved USDC\n");
        vm.stopBroadcast();

        // Step 8: Save deployment info
        console.log("Step 8: Saving deployment info...");
        string memory deploymentInfo = string.concat(
            "# Auto-generated by DeployFork.s.sol\n",
            "NEXT_PUBLIC_PROTOCOL_ADDRESS=", vm.toString(address(protocol)), "\n",
            "PROTOCOL_ADDRESS=", vm.toString(address(protocol)), "\n",
            "WETH_CONFIG_HASH=", vm.toString(wethConfigHash), "\n",
            "GAS_VAULT_ADDRESS=", vm.toString(DEPLOYER), "\n\n",
            "# Test Account Keys (DO NOT USE IN PRODUCTION)\n",
            "DEPLOYER_PRIVATE_KEY=", vm.toString(DEPLOYER_KEY), "\n",
            "BROADCASTER_PRIVATE_KEY=", vm.toString(DEPLOYER_KEY), "\n",
            "WRITER_PRIVATE_KEY=", vm.toString(WRITER_KEY), "\n",
            "TAKER_PRIVATE_KEY=", vm.toString(TAKER_KEY), "\n\n",
            "# Test Account Addresses\n",
            "DEPLOYER_ADDRESS=", vm.toString(DEPLOYER), "\n",
            "WRITER_ADDRESS=", vm.toString(WRITER), "\n",
            "TAKER_ADDRESS=", vm.toString(TAKER), "\n\n",
            "# Frontend Environment\n",
            "NEXT_PUBLIC_REOWN_PROJECT_ID=5f41ed38362e4afb280d4c63bbf14146\n",
            "NEXT_PUBLIC_CHAIN_ID=8453\n",
            "NEXT_PUBLIC_API_URL=http://localhost:3001\n"
        );

        vm.writeFile("./.env.local", deploymentInfo);
        console.log("  Saved to .env.local\n");

        // Summary
        console.log("=================================================");
        console.log("DEPLOYMENT COMPLETE!");
        console.log("=================================================");
        console.log("Protocol Address:", address(protocol));
        console.log("Chain ID: 8453 (Base Fork)");
        console.log("RPC URL: http://127.0.0.1:8545");
        console.log("\nTest Accounts:");
        console.log("  Deployer:", DEPLOYER, "(100 ETH, 100k USDC)");
        console.log("  Writer:", WRITER, "(100 ETH, 50k USDC, 10 WETH)");
        console.log("  Taker:", TAKER, "(100 ETH, 50k USDC)");
        console.log("\nNext Steps:");
        console.log("  1. source .env.local");
        console.log("  2. npm run dev:backend");
        console.log("  3. npm run dev:frontend");
        console.log("=================================================\n");
    }

    // Cheatcode to deal USDC - use Foundry's deal with proper slot
    function dealUSDC(address to, uint256 amount) internal {
        // Use hoax/deal cheatcode with token
        deal(USDC, to, amount);
    }

    // Cheatcode to deal WETH - use Foundry's deal with proper slot
    function dealWETH(address to, uint256 amount) internal {
        // Use hoax/deal cheatcode with token
        deal(WETH, to, amount);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract MockSwapRouter is ISwapRouter {
    // Simplified mock: 1:1 swap rate for testing
    uint256 public swapRate = 1e18; // 1:1 default

    function setSwapRate(uint256 rate) external {
        swapRate = rate;
    }

    function exactInputSingle(ExactInputSingleParams calldata params)
        external
        payable
        override
        returns (uint256 amountOut)
    {
        // Transfer tokens in
        IERC20(params.tokenIn).transferFrom(msg.sender, address(this), params.amountIn);

        // Calculate amount out based on swap rate
        amountOut = (params.amountIn * swapRate) / 1e18;

        // Mint or transfer tokens out (simplified - assumes we have infinite liquidity)
        // In real test, we'd transfer from a pool
        IMockERC20(params.tokenOut).mint(params.recipient, amountOut);

        return amountOut;
    }

    function exactInput(ExactInputParams calldata) external payable override returns (uint256) {
        revert("Not implemented");
    }

    function exactOutputSingle(ExactOutputSingleParams calldata) external payable override returns (uint256) {
        revert("Not implemented");
    }

    function exactOutput(ExactOutputParams calldata) external payable override returns (uint256) {
        revert("Not implemented");
    }

    function uniswapV3SwapCallback(int256, int256, bytes calldata) external pure override {
        revert("Not implemented");
    }
}

// Helper to make MockERC20 mintable
interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

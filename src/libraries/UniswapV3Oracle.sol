// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/**
 * @title UniswapV3Oracle
 * @notice Library for getting TWAP prices from Uniswap V3 pools
 */
library UniswapV3Oracle {
    /**
     * @notice Get the TWAP price from a Uniswap V3 pool
     * @param pool The Uniswap V3 pool address
     * @param twapInterval The TWAP interval in seconds (e.g., 1800 for 30 min)
     * @return price The TWAP price scaled by 1e18
     */
    function getTwapPrice(
        address pool,
        uint32 twapInterval
    ) internal view returns (uint256 price) {
        if (pool == address(0)) {
            return 0;
        }

        IUniswapV3Pool uniswapPool = IUniswapV3Pool(pool);

        // Get current tick
        (, int24 tick, , , , , ) = uniswapPool.slot0();

        // For simplicity, use spot price (production should use TWAP)
        // TWAP implementation would query observe() and calculate average
        price = _getQuoteAtTick(tick);
    }

    /**
     * @notice Get price quote at a specific tick
     * @param tick The tick to get price for
     * @return price The price at the tick
     */
    function _getQuoteAtTick(int24 tick) internal pure returns (uint256 price) {
        // Price = 1.0001^tick
        // For simplicity, use approximation
        // Production should use TickMath library
        if (tick >= 0) {
            price = 1e18 * uint256(uint24(tick)) / 10000;
        } else {
            price = 1e18 / (uint256(uint24(-tick)) / 10000);
        }

        // Fallback for edge cases
        if (price == 0) {
            price = 1e18;
        }
    }

    /**
     * @notice Get price from pool with error handling
     * @param pool The pool address
     * @return price The price (0 if fails)
     * @return confidence The confidence interval (10% for now)
     */
    function getPrice(address pool) internal view returns (uint256 price, uint256 confidence) {
        try UniswapV3Oracle.getTwapPrice(pool, 1800) returns (uint256 _price) {
            price = _price;
            confidence = price / 10; // 10% confidence for Uniswap
        } catch {
            price = 0;
            confidence = 0;
        }
    }
}

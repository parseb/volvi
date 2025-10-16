// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPriceOracle
 * @notice Interface for price oracle integration
 */
interface IPriceOracle {
    /**
     * @notice Get the current price for a token
     * @param token The token address
     * @return price The price in USD (scaled by 1e8)
     * @return confidence The confidence interval
     */
    function getPrice(address token) external view returns (uint256 price, uint256 confidence);
}

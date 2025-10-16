// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ITokenHook
 * @notice Interface for token-specific hooks that can be executed before/after option creation and settlement
 */
interface ITokenHook {
    /**
     * @notice Called before an option is created
     * @param underlying The underlying token address
     * @param amount The amount of collateral
     * @param isCall Whether this is a call option
     */
    function beforeOptionCreation(
        address underlying,
        uint256 amount,
        bool isCall
    ) external;

    /**
     * @notice Called after an option is created
     * @param tokenId The NFT token ID of the option
     * @param underlying The underlying token address
     * @param amount The amount of collateral
     * @param isCall Whether this is a call option
     */
    function afterOptionCreation(
        uint256 tokenId,
        address underlying,
        uint256 amount,
        bool isCall
    ) external;

    /**
     * @notice Called during option settlement
     * @param tokenId The NFT token ID of the option
     * @param underlying The underlying token address
     * @param profit The profit amount (if any)
     * @param isCall Whether this is a call option
     */
    function onSettlement(
        uint256 tokenId,
        address underlying,
        uint256 profit,
        bool isCall
    ) external;
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IERC3009
 * @notice Interface for EIP-3009: Transfer With Authorization
 * @dev Allows gasless token transfers via signed authorizations
 * USDC on Base (and other chains) implements this standard
 */
interface IERC3009 {
    /**
     * @notice Execute a transfer with a signed authorization
     * @param from Payer's address (Authorizer)
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param validAfter The time after which this is valid (unix time)
     * @param validBefore The time before which this is valid (unix time)
     * @param nonce Unique nonce
     * @param v ECDSA signature parameter v
     * @param r ECDSA signature parameter r
     * @param s ECDSA signature parameter s
     */
    function transferWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /**
     * @notice Execute a transfer with a signed authorization from the caller
     * @dev This has an additional check to ensure that the payee's address matches
     * the caller of this function to prevent front-running attacks.
     * @param from Payer's address (Authorizer)
     * @param to Payee's address
     * @param value Amount to be transferred
     * @param validAfter The time after which this is valid (unix time)
     * @param validBefore The time before which this is valid (unix time)
     * @param nonce Unique nonce
     * @param v ECDSA signature parameter v
     * @param r ECDSA signature parameter r
     * @param s ECDSA signature parameter s
     */
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;

    /**
     * @notice Check if a nonce has been used for the given address
     * @param authorizer Token holder's address
     * @param nonce The nonce to check
     * @return True if the nonce has been used
     */
    function authorizationState(
        address authorizer,
        bytes32 nonce
    ) external view returns (bool);

    /**
     * @notice Emitted when an authorization is used
     */
    event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce);

    /**
     * @notice Emitted when an authorization is canceled
     */
    event AuthorizationCanceled(
        address indexed authorizer,
        bytes32 indexed nonce
    );
}

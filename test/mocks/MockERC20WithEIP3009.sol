// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../../src/interfaces/IERC3009.sol";

/**
 * @title MockERC20WithEIP3009
 * @notice Mock ERC20 with EIP-3009 support for testing
 * @dev Implements transferWithAuthorization and receiveWithAuthorization
 */
contract MockERC20WithEIP3009 is ERC20, EIP712, IERC3009 {
    uint8 private _decimals;

    bytes32 private constant TRANSFER_WITH_AUTHORIZATION_TYPEHASH = keccak256(
        "TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

    mapping(address => mapping(bytes32 => bool)) private _authorizationStates;

    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) EIP712(name, "2") {
        _decimals = decimals_;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Execute a transfer with a signed authorization
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
    ) external override {
        _requireValidAuthorization(from, nonce, validAfter, validBefore);

        bytes32 structHash = keccak256(abi.encode(
            TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == from, "Invalid signature");

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Receive a transfer with a signed authorization
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
    ) external override {
        require(to == msg.sender, "Caller must be the payee");
        _requireValidAuthorization(from, nonce, validAfter, validBefore);

        bytes32 structHash = keccak256(abi.encode(
            TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, v, r, s);
        require(signer == from, "Invalid signature");

        _authorizationStates[from][nonce] = true;
        emit AuthorizationUsed(from, nonce);

        _transfer(from, to, value);
    }

    /**
     * @notice Check if an authorization has been used
     */
    function authorizationState(
        address authorizer,
        bytes32 nonce
    ) external view override returns (bool) {
        return _authorizationStates[authorizer][nonce];
    }

    /**
     * @notice Require that an authorization is valid
     */
    function _requireValidAuthorization(
        address authorizer,
        bytes32 nonce,
        uint256 validAfter,
        uint256 validBefore
    ) private view {
        require(block.timestamp > validAfter, "Authorization not yet valid");
        require(block.timestamp < validBefore, "Authorization expired");
        require(!_authorizationStates[authorizer][nonce], "Authorization already used");
    }

    /**
     * @notice Get the EIP-712 domain separator
     * @dev Exposed for testing
     */
    function DOMAIN_SEPARATOR() external view returns (bytes32) {
        return _domainSeparatorV4();
    }
}

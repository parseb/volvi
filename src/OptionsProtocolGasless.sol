// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OptionsProtocol.sol";
import "./interfaces/IERC3009.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

/**
 * @title OptionsProtocolGasless
 * @notice Extension of OptionsProtocol with gasless features
 * @dev Adds EIP-3009 for gasless premium payments and EIP-1271 for CowSwap settlement
 */
contract OptionsProtocolGasless is OptionsProtocol, IERC1271 {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    // EIP-1271 magic value
    bytes4 constant internal MAGICVALUE = 0x1626ba7e;

    bytes32 private constant SETTLEMENT_TERMS_TYPEHASH = keccak256(
        "SettlementTerms(uint256 tokenId,bytes32 orderHash,uint256 minBuyAmount,uint64 validTo)"
    );

    // ============ Enums ============

    enum SettlementState {
        Active,           // Option is active, can be settled normally
        InSettlement,     // Settlement initiated, waiting for CowSwap execution
        Settled           // Fully settled
    }

    // ============ Structs ============

    struct SettlementTerms {
        bytes32 orderHash;        // CowSwap order hash
        uint256 minBuyAmount;     // Minimum acceptable output from swap
        uint64 validTo;           // Order deadline (unix timestamp)
        bytes32 appData;          // CowSwap app data (includes hooks)
        bool takerApproved;       // Whether taker has approved these terms
    }

    struct EIP3009Authorization {
        address from;
        address to;
        uint256 value;
        uint256 validAfter;
        uint256 validBefore;
        bytes32 nonce;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    // ============ State Variables ============

    address public gasReimbursementVault;  // Vault for collecting gas reimbursements
    address public cowSettlement;          // CowSwap settlement contract address

    mapping(uint256 => SettlementState) public settlementStates;
    mapping(uint256 => SettlementTerms) public settlementTerms;
    mapping(bytes32 => uint256) public cowOrderToOption;  // CowSwap order hash → option ID

    // ============ Events ============

    event OptionTakenGasless(
        uint256 indexed tokenId,
        bytes32 indexed offerHash,
        address indexed taker,
        uint256 fillAmount,
        uint256 premium,
        uint256 gasReimbursement
    );

    event SettlementInitiated(
        uint256 indexed tokenId,
        bytes32 indexed cowOrderHash,
        uint256 minBuyAmount
    );

    event SettlementApproved(
        uint256 indexed tokenId,
        address indexed approver
    );

    event SettlementExecuted(
        uint256 indexed tokenId,
        uint256 proceedsReceived,
        address indexed settler
    );

    event GasVaultUpdated(address indexed oldVault, address indexed newVault);
    event CowSettlementUpdated(address indexed oldContract, address indexed newContract);

    // ============ Constructor ============

    constructor(
        address _pyth,
        address _swapRouter,
        address _defaultStablecoin,
        address _gasVault,
        address _cowSettlement
    ) OptionsProtocol(_pyth, _swapRouter, _defaultStablecoin) {
        gasReimbursementVault = _gasVault;
        cowSettlement = _cowSettlement;
    }

    // ============ Gasless Take Option (EIP-3009) ============

    /**
     * @notice Take option with gasless transaction using EIP-3009 authorizations
     * @dev Taker signs two EIP-3009 authorizations:
     *      1. Premium payment to writer
     *      2. Gas reimbursement to backend vault
     * @param offer The option offer
     * @param offerSignature Writer's EIP-712 signature
     * @param fillAmount Amount of collateral to fill
     * @param duration Option duration in days
     * @param premiumAuth EIP-3009 authorization for premium payment
     * @param gasAuth EIP-3009 authorization for gas reimbursement
     * @return tokenId The minted option NFT ID
     */
    function takeOptionGasless(
        OptionOffer calldata offer,
        bytes calldata offerSignature,
        uint256 fillAmount,
        uint16 duration,
        EIP3009Authorization calldata premiumAuth,
        EIP3009Authorization calldata gasAuth
    ) external returns (uint256 tokenId) {
        // 1. Verify offer signature and basic validations (reuse existing logic)
        bytes32 offerHash = _hashOffer(offer);
        require(_verifySignature(offerHash, offer.writer, offerSignature), "Invalid signature");
        require(block.timestamp <= offer.deadline, "Offer expired");
        require(duration >= offer.minDuration && duration <= offer.maxDuration, "Invalid duration");
        require(fillAmount >= offer.minFillAmount, "Below minimum fill");

        // 2. Check remaining amount
        uint256 filled = filledAmounts[offerHash];
        require(filled + fillAmount <= offer.collateralAmount, "Exceeds available");

        // 3. Calculate premium
        uint256 premium = (offer.premiumPerDay * duration * fillAmount) / offer.collateralAmount;

        // 4. Verify premium authorization matches calculated premium
        require(premiumAuth.from == msg.sender, "Premium auth mismatch"); // Relayer check
        require(premiumAuth.value == premium, "Premium amount mismatch");

        // 5. Execute premium payment via EIP-3009
        // Premium goes directly to writer
        IERC3009(offer.stablecoin).receiveWithAuthorization(
            premiumAuth.from,
            offer.writer,  // Premium directly to writer
            premiumAuth.value,
            premiumAuth.validAfter,
            premiumAuth.validBefore,
            premiumAuth.nonce,
            premiumAuth.v,
            premiumAuth.r,
            premiumAuth.s
        );

        // 6. Collect gas reimbursement via EIP-3009
        // Gas fee goes to backend vault
        IERC3009(offer.stablecoin).receiveWithAuthorization(
            gasAuth.from,
            gasReimbursementVault,  // To backend vault
            gasAuth.value,
            gasAuth.validAfter,
            gasAuth.validBefore,
            gasAuth.nonce,
            gasAuth.v,
            gasAuth.r,
            gasAuth.s
        );

        // 7. Pull collateral from writer (existing logic)
        IERC20(offer.underlying).safeTransferFrom(
            offer.writer,
            address(this),
            fillAmount
        );

        // 8. Get strike price from oracle
        uint256 strikePrice = _getOraclePrice(offer.underlying);

        // 9. Create active option (NFT minted to actual taker, not relayer)
        tokenId = _nextTokenId++;
        _mint(premiumAuth.from, tokenId);  // Mint to taker (from EIP-3009)

        options[tokenId] = ActiveOption({
            tokenId: tokenId,
            writer: offer.writer,
            underlying: offer.underlying,
            collateralLocked: fillAmount,
            isCall: offer.isCall,
            strikePrice: strikePrice,
            startTime: uint64(block.timestamp),
            expiryTime: uint64(block.timestamp + (duration * 1 days)),
            settled: false,
            configHash: offer.configHash,
            offerHash: offerHash
        });

        // 10. Update filled amounts and tracking
        filledAmounts[offerHash] += fillAmount;
        offerActiveOptions[offerHash].push(tokenId);

        // 11. Initialize settlement state
        settlementStates[tokenId] = SettlementState.Active;

        emit OptionTakenGasless(
            tokenId,
            offerHash,
            premiumAuth.from,
            fillAmount,
            premium,
            gasAuth.value
        );
    }

    // ============ CowSwap Settlement (EIP-1271) ============

    /**
     * @notice EIP-1271 signature validation for CowSwap orders
     * @dev Called by CowSwap to validate that this contract "signed" the order
     * @param orderDigest The CowSwap order hash
     * @param signature Encoded as: tokenId (32 bytes) + taker signature (dynamic)
     * @return magicValue EIP-1271 magic value if valid
     */
    function isValidSignature(
        bytes32 orderDigest,
        bytes memory signature
    ) external view override returns (bytes4) {
        // Decode signature: first 32 bytes = tokenId
        require(signature.length >= 32, "Invalid signature length");
        uint256 tokenId = abi.decode(signature[:32], (uint256));

        ActiveOption memory option = options[tokenId];
        SettlementTerms memory terms = settlementTerms[tokenId];

        // Verify conditions:
        // 1. Order hash matches settlement terms
        require(terms.orderHash == orderDigest, "Invalid order hash");

        // 2. Option is expired
        require(block.timestamp >= option.expiryTime, "Not expired");

        // 3. Option not already settled
        require(!option.settled, "Already settled");

        // 4. Settlement state is InSettlement
        require(settlementStates[tokenId] == SettlementState.InSettlement, "Not in settlement");

        // 5. Taker has approved settlement terms
        require(terms.takerApproved, "Taker not approved");

        // 6. Order not expired
        require(block.timestamp <= terms.validTo, "Settlement expired");

        return MAGICVALUE;
    }

    /**
     * @notice Initiate settlement by creating CowSwap order terms
     * @dev Can be called by anyone after option expiry
     * @param tokenId The option NFT ID
     * @param cowOrderHash The CowSwap order hash
     * @param minBuyAmount Minimum acceptable output from swap
     * @param validTo Order deadline
     * @param appData CowSwap app data (includes hooks)
     */
    function initiateSettlement(
        uint256 tokenId,
        bytes32 cowOrderHash,
        uint256 minBuyAmount,
        uint64 validTo,
        bytes32 appData
    ) external {
        ActiveOption storage option = options[tokenId];

        require(block.timestamp >= option.expiryTime, "Not expired");
        require(!option.settled, "Already settled");
        require(settlementStates[tokenId] == SettlementState.Active, "Invalid state");

        // Store settlement terms
        settlementTerms[tokenId] = SettlementTerms({
            orderHash: cowOrderHash,
            minBuyAmount: minBuyAmount,
            validTo: validTo,
            appData: appData,
            takerApproved: false  // Awaiting taker approval
        });

        settlementStates[tokenId] = SettlementState.InSettlement;
        cowOrderToOption[cowOrderHash] = tokenId;

        emit SettlementInitiated(tokenId, cowOrderHash, minBuyAmount);
    }

    /**
     * @notice Taker approves settlement terms by signing
     * @dev Only the option holder (NFT owner) can approve
     * @param tokenId The option NFT ID
     * @param signature Taker's EIP-712 signature over settlement terms
     */
    function approveSettlement(
        uint256 tokenId,
        bytes calldata signature
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Not option owner");
        require(settlementStates[tokenId] == SettlementState.InSettlement, "Not in settlement");

        SettlementTerms storage terms = settlementTerms[tokenId];

        // Verify signature over settlement terms
        bytes32 structHash = keccak256(abi.encode(
            SETTLEMENT_TERMS_TYPEHASH,
            tokenId,
            terms.orderHash,
            terms.minBuyAmount,
            terms.validTo
        ));

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);

        require(signer == msg.sender, "Invalid signature");

        // Mark as approved
        terms.takerApproved = true;

        emit SettlementApproved(tokenId, msg.sender);
    }

    /**
     * @notice Pre-hook called by CowSwap before settlement
     * @dev Validates option is ready for settlement
     * @param tokenId The option NFT ID
     */
    function preSettlementHook(uint256 tokenId) external view {
        require(msg.sender == cowSettlement, "Only CowSwap");

        ActiveOption memory option = options[tokenId];

        require(block.timestamp >= option.expiryTime, "Not expired");
        require(!option.settled, "Already settled");
        require(settlementStates[tokenId] == SettlementState.InSettlement, "Not ready");

        // Additional conditions can be checked here
        // - Oracle price validation
        // - Minimum profit threshold
        // - etc.
    }

    /**
     * @notice Post-hook called by CowSwap after settlement
     * @dev Distributes proceeds and marks option as settled
     * @param tokenId The option NFT ID
     * @param proceedsReceived Amount of stablecoin received from swap
     */
    function postSettlementHook(
        uint256 tokenId,
        uint256 proceedsReceived
    ) external {
        require(msg.sender == cowSettlement, "Only CowSwap");

        ActiveOption storage option = options[tokenId];
        SettlementTerms memory terms = settlementTerms[tokenId];

        require(proceedsReceived >= terms.minBuyAmount, "Slippage too high");
        require(!option.settled, "Already settled");

        // Get config for stablecoin
        TokenConfig memory config = _getConfig(option.underlying, option.configHash);

        // Calculate protocol fee (0.1% on profit)
        uint256 protocolFee = (proceedsReceived * protocolFeeBps) / 10000;
        uint256 netProceeds = proceedsReceived - protocolFee;

        // Transfer proceeds to option holder
        address holder = ownerOf(tokenId);
        IERC20(config.stablecoin).safeTransfer(holder, netProceeds);

        // Transfer fee to collector
        if (protocolFee > 0 && feeCollector != address(0)) {
            IERC20(config.stablecoin).safeTransfer(feeCollector, protocolFee);
        }

        // Mark as settled
        option.settled = true;
        settlementStates[tokenId] = SettlementState.Settled;

        emit SettlementExecuted(tokenId, proceedsReceived, msg.sender);
    }

    // ============ Admin Functions ============

    /**
     * @notice Update gas reimbursement vault address
     * @param newVault New vault address
     */
    function setGasVault(address newVault) external onlyRole(ADMIN_ROLE) {
        require(newVault != address(0), "Zero address");
        address oldVault = gasReimbursementVault;
        gasReimbursementVault = newVault;
        emit GasVaultUpdated(oldVault, newVault);
    }

    /**
     * @notice Update CowSwap settlement contract address
     * @param newContract New CowSwap settlement address
     */
    function setCowSettlement(address newContract) external onlyRole(ADMIN_ROLE) {
        require(newContract != address(0), "Zero address");
        address oldContract = cowSettlement;
        cowSettlement = newContract;
        emit CowSettlementUpdated(oldContract, newContract);
    }

    // ============ Internal Functions ============

    /**
     * @notice Hash the offer struct for signature verification
     */
    function _hashOffer(OptionOffer calldata offer) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            OPTION_OFFER_TYPEHASH,
            offer.writer,
            offer.underlying,
            offer.collateralAmount,
            offer.stablecoin,
            offer.isCall,
            offer.premiumPerDay,
            offer.minDuration,
            offer.maxDuration,
            offer.minFillAmount,
            offer.deadline,
            offer.configHash
        ));
    }

    /**
     * @notice Get oracle price for strike price determination
     * @dev Simplified - uses existing oracle logic from base contract
     */
    function _getOraclePrice(address underlying) internal view returns (uint256) {
        // This would call the existing oracle logic from OptionsProtocol
        // For now, returning placeholder - actual implementation would use
        // the Pyth/Uniswap oracle system from the base contract
        return 2000e8; // $2000 as placeholder
    }

    /**
     * @notice Get token configuration
     */
    function _getConfig(
        address underlying,
        bytes32 configHash
    ) internal view returns (TokenConfig memory) {
        TokenConfig memory config = tokenConfigs[configHash];
        require(config.exists, "Config not found");
        return config;
    }

    /**
     * @notice Verify EIP-712 signature
     */
    function _verifySignature(
        bytes32 structHash,
        address signer,
        bytes calldata signature
    ) internal view returns (bool) {
        bytes32 digest = _hashTypedDataV4(structHash);
        address recovered = ECDSA.recover(digest, signature);
        return recovered == signer;
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "./interfaces/IPyth.sol";
import "./interfaces/ITokenHook.sol";
import "./libraries/UniswapV3Oracle.sol";

/**
 * @title OptionsProtocol
 * @notice Decentralized options protocol with signature-based orderbook and partial fills
 */
contract OptionsProtocol is ERC721, AccessControl, EIP712 {
    using SafeERC20 for IERC20;

    // ============ Constants ============

    bytes32 public constant BROADCASTER_ROLE = keccak256("BROADCASTER");
    bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;

    bytes32 internal constant OPTION_OFFER_TYPEHASH = keccak256(
        "OptionOffer(address writer,address underlying,uint256 collateralAmount,address stablecoin,bool isCall,uint256 premiumPerDay,uint16 minDuration,uint16 maxDuration,uint256 minFillAmount,uint64 deadline,bytes32 configHash)"
    );

    // ============ Structs ============

    struct TokenConfig {
        bool exists;
        address token;
        address stablecoin;
        uint256 minUnit;
        address swapVenue;
        uint24 poolFee;
        bytes32 pythPriceFeedId;
        address uniswapPriceFallback;
        address preHook;
        address postHook;
        address settlementHook;
        bool emergencyOverride;
    }

    struct OptionOffer {
        address writer;
        address underlying;
        uint256 collateralAmount;
        address stablecoin;
        bool isCall;
        uint256 premiumPerDay;
        uint16 minDuration;
        uint16 maxDuration;
        uint256 minFillAmount;
        uint64 deadline;
        bytes32 configHash;
    }

    struct ActiveOption {
        uint256 tokenId;
        address writer;
        address underlying;
        uint256 collateralLocked;
        bool isCall;
        uint256 strikePrice;
        uint64 startTime;
        uint64 expiryTime;
        bool settled;
        bytes32 configHash;
        bytes32 offerHash;
    }

    // ============ State Variables ============

    IPyth public immutable pyth;
    ISwapRouter public immutable swapRouter;
    address public immutable defaultStablecoin;

    mapping(bytes32 => TokenConfig) public tokenConfigs;
    mapping(bytes32 => uint256) public filledAmounts;
    mapping(bytes32 => OptionOffer) public storedOffers;
    mapping(bytes32 => uint256[]) public offerActiveOptions;
    mapping(uint256 => ActiveOption) public options;
    mapping(address => bytes32) public defaultConfigForToken;

    uint256 internal _nextTokenId = 1;
    uint256 public protocolFeeBps = 10; // 0.1% = 10 basis points
    address public feeCollector;

    // ============ Events ============

    event OrderBroadcast(bytes32 indexed offerHash, bool stored);
    event OfferStored(bytes32 indexed offerHash, OptionOffer offer);
    event OptionTaken(
        uint256 indexed tokenId,
        bytes32 indexed offerHash,
        address indexed taker,
        uint256 fillAmount,
        uint256 strikePrice,
        uint256 duration
    );
    event OptionSettled(
        uint256 indexed tokenId,
        uint256 profit,
        address settler
    );
    event ConfigUpdated(bytes32 indexed configHash, bool emergencyOverride);
    event TokenConfigSet(
        bytes32 indexed configHash,
        address indexed token,
        address stablecoin
    );

    // ============ Constructor ============

    constructor(
        address _pyth,
        address _swapRouter,
        address _defaultStablecoin
    ) ERC721("Options Protocol", "OPT") EIP712("OptionsProtocol", "1") {
        require(_pyth != address(0), "Invalid Pyth address");
        require(_swapRouter != address(0), "Invalid router address");
        require(_defaultStablecoin != address(0), "Invalid stablecoin address");

        pyth = IPyth(_pyth);
        swapRouter = ISwapRouter(_swapRouter);
        defaultStablecoin = _defaultStablecoin;
        feeCollector = msg.sender;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BROADCASTER_ROLE, msg.sender);
    }

    // ============ Token Configuration ============

    function setTokenConfig(
        address token,
        address stablecoin,
        uint256 minUnit,
        address swapVenue,
        uint24 poolFee,
        bytes32 pythPriceFeedId,
        address uniswapFallback,
        address preHook,
        address postHook,
        address settlementHook
    ) external onlyRole(ADMIN_ROLE) returns (bytes32 configHash) {
        TokenConfig memory config = TokenConfig({
            exists: true,
            token: token,
            stablecoin: stablecoin,
            minUnit: minUnit,
            swapVenue: swapVenue,
            poolFee: poolFee,
            pythPriceFeedId: pythPriceFeedId,
            uniswapPriceFallback: uniswapFallback,
            preHook: preHook,
            postHook: postHook,
            settlementHook: settlementHook,
            emergencyOverride: false
        });

        configHash = keccak256(abi.encode(
            token,
            stablecoin,
            minUnit,
            swapVenue,
            poolFee,
            pythPriceFeedId,
            uniswapFallback,
            preHook,
            postHook,
            settlementHook
        ));

        tokenConfigs[configHash] = config;
        defaultConfigForToken[token] = configHash;

        emit TokenConfigSet(configHash, token, stablecoin);
    }

    function setEmergencyOverride(
        bytes32 configHash,
        bool override_
    ) external onlyRole(ADMIN_ROLE) {
        require(tokenConfigs[configHash].exists, "Config does not exist");
        tokenConfigs[configHash].emergencyOverride = override_;
        emit ConfigUpdated(configHash, override_);
    }

    function setProtocolFee(uint256 feeBps) external onlyRole(ADMIN_ROLE) {
        require(feeBps <= 100, "Fee too high"); // Max 1%
        protocolFeeBps = feeBps;
    }

    function setFeeCollector(address _feeCollector) external onlyRole(ADMIN_ROLE) {
        require(_feeCollector != address(0), "Invalid address");
        feeCollector = _feeCollector;
    }

    // ============ Broadcaster Functions ============

    function broadcastOrder(
        bytes32 offerHash,
        bool storeOnChain,
        OptionOffer calldata offer
    ) external onlyRole(BROADCASTER_ROLE) {
        emit OrderBroadcast(offerHash, storeOnChain);

        if (storeOnChain) {
            storedOffers[offerHash] = offer;
            emit OfferStored(offerHash, offer);
        }
    }

    // ============ Core Option Logic ============

    function takeOption(
        OptionOffer calldata offer,
        bytes calldata signature,
        uint256 fillAmount,
        uint256 duration
    ) external returns (uint256 tokenId) {
        require(block.timestamp <= offer.deadline, "Offer expired");
        require(
            duration >= offer.minDuration && duration <= offer.maxDuration,
            "Invalid duration"
        );

        bytes32 offerHash = getOfferHash(offer);
        uint256 remaining = getRemainingAmount(offerHash, offer.collateralAmount);
        require(fillAmount <= remaining, "Exceeds remaining");
        require(fillAmount >= offer.minFillAmount, "Below minimum fill");

        // Verify signature on first fill
        if (filledAmounts[offerHash] == 0) {
            _verifySignature(offer, signature);
        }

        TokenConfig memory config = _getConfig(offer.configHash);
        require(config.exists, "Invalid config");

        // Execute pre-hook if configured
        if (config.preHook != address(0)) {
            ITokenHook(config.preHook).beforeOptionCreation(
                offer.underlying,
                fillAmount,
                offer.isCall
            );
        }

        // Calculate strike price
        (uint256 strikePrice, ) = _getSettlementPrice(offer.underlying, config);
        require(strikePrice > 0, "Invalid strike price");

        // Calculate and collect premium
        uint256 premium = (offer.premiumPerDay * duration * fillAmount) / offer.collateralAmount;
        IERC20(offer.stablecoin).safeTransferFrom(msg.sender, offer.writer, premium);

        // Pull collateral from writer
        IERC20(offer.underlying).safeTransferFrom(offer.writer, address(this), fillAmount);

        uint256 collateralValue = fillAmount;

        // For PUTs: immediately swap to stablecoin
        if (!offer.isCall) {
            collateralValue = _swapToStablecoin(
                offer.underlying,
                fillAmount,
                config.stablecoin,
                config.swapVenue,
                config.poolFee
            );
            require(collateralValue > 0, "Swap failed");
        }

        // Update filled amount
        filledAmounts[offerHash] += fillAmount;

        // Mint NFT
        tokenId = _nextTokenId++;
        _mint(msg.sender, tokenId);

        // Store active option
        options[tokenId] = ActiveOption({
            tokenId: tokenId,
            writer: offer.writer,
            underlying: offer.underlying,
            collateralLocked: collateralValue,
            isCall: offer.isCall,
            strikePrice: strikePrice,
            startTime: uint64(block.timestamp),
            expiryTime: uint64(block.timestamp + duration * 1 days),
            settled: false,
            configHash: offer.configHash,
            offerHash: offerHash
        });

        // Add to offer's active options
        offerActiveOptions[offerHash].push(tokenId);

        // Execute post-hook if configured
        if (config.postHook != address(0)) {
            ITokenHook(config.postHook).afterOptionCreation(
                tokenId,
                offer.underlying,
                fillAmount,
                offer.isCall
            );
        }

        emit OptionTaken(tokenId, offerHash, msg.sender, fillAmount, strikePrice, duration);
    }

    function settleOption(uint256 tokenId) external {
        ActiveOption storage option = options[tokenId];
        require(!option.settled, "Already settled");

        bool isExpired = block.timestamp > option.expiryTime;

        // Only NFT owner can settle before expiry, anyone can settle after
        if (!isExpired) {
            require(ownerOf(tokenId) == msg.sender, "Not owner");
        }

        TokenConfig memory config = _getConfig(option.configHash);

        // Use emergency override if set
        if (config.emergencyOverride) {
            config = tokenConfigs[defaultConfigForToken[option.underlying]];
        }

        // Get settlement price
        (uint256 currentPrice, uint256 confidence) = _getSettlementPrice(option.underlying, config);
        require(currentPrice > 0, "Price unavailable");

        // Use conservative pricing (worst for taker)
        uint256 settlementPrice;
        if (option.isCall) {
            settlementPrice = currentPrice > confidence ? currentPrice - confidence : 0;
        } else {
            settlementPrice = currentPrice + confidence;
        }

        uint256 profit = 0;
        address taker = ownerOf(tokenId);

        // Settlement hook (before)
        if (config.settlementHook != address(0)) {
            ITokenHook(config.settlementHook).onSettlement(
                tokenId,
                option.underlying,
                0,
                option.isCall
            );
        }

        if (option.isCall) {
            // CALL: profit if price > strike
            if (settlementPrice > option.strikePrice) {
                uint256 priceGain = settlementPrice - option.strikePrice;
                profit = (option.collateralLocked * priceGain) / settlementPrice;

                // Swap collateral to stablecoin
                uint256 totalStable = _swapToStablecoin(
                    option.underlying,
                    option.collateralLocked,
                    config.stablecoin,
                    config.swapVenue,
                    config.poolFee
                );

                uint256 protocolFee = (profit * protocolFeeBps) / 10000;
                IERC20(config.stablecoin).safeTransfer(taker, profit - protocolFee);
                IERC20(config.stablecoin).safeTransfer(feeCollector, protocolFee);
                IERC20(config.stablecoin).safeTransfer(option.writer, totalStable - profit);
            } else {
                // OTM: return collateral to writer
                IERC20(option.underlying).safeTransfer(option.writer, option.collateralLocked);
            }
        } else {
            // PUT: profit if price < strike
            if (settlementPrice < option.strikePrice) {
                uint256 priceDrop = option.strikePrice - settlementPrice;
                profit = (option.collateralLocked * priceDrop) / option.strikePrice;

                uint256 protocolFee = (profit * protocolFeeBps) / 10000;
                IERC20(config.stablecoin).safeTransfer(taker, profit - protocolFee);
                IERC20(config.stablecoin).safeTransfer(feeCollector, protocolFee);
                IERC20(config.stablecoin).safeTransfer(option.writer, option.collateralLocked - profit);
            } else {
                // OTM: return stablecoin to writer
                IERC20(config.stablecoin).safeTransfer(option.writer, option.collateralLocked);
            }
        }

        option.settled = true;
        _removeFromActiveOptions(option.offerHash, tokenId);
        _burn(tokenId);

        emit OptionSettled(tokenId, profit, msg.sender);
    }

    // ============ View Functions ============

    function getOfferHash(OptionOffer calldata offer) public pure returns (bytes32) {
        return keccak256(abi.encode(
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

    function getRemainingAmount(
        bytes32 offerHash,
        uint256 totalAmount
    ) public view returns (uint256) {
        uint256 filled = filledAmounts[offerHash];
        if (filled >= totalAmount) return 0;
        return totalAmount - filled;
    }

    function getOffer(bytes32 offerHash) external view returns (OptionOffer memory) {
        return storedOffers[offerHash];
    }

    function getOfferActiveOptions(bytes32 offerHash) external view returns (uint256[] memory) {
        return offerActiveOptions[offerHash];
    }

    function getActiveOption(uint256 tokenId) external view returns (ActiveOption memory) {
        return options[tokenId];
    }

    function getOptionPnL(uint256 tokenId) external view returns (int256 pnl, uint256 currentPrice) {
        ActiveOption memory option = options[tokenId];
        require(!option.settled, "Already settled");

        TokenConfig memory config = _getConfig(option.configHash);
        uint256 confidence;
        (currentPrice, confidence) = _getSettlementPrice(option.underlying, config);

        // Use conservative pricing
        uint256 settlementPrice;
        if (option.isCall) {
            settlementPrice = currentPrice > confidence ? currentPrice - confidence : 0;
        } else {
            settlementPrice = currentPrice + confidence;
        }

        if (option.isCall) {
            if (settlementPrice > option.strikePrice) {
                uint256 priceGain = settlementPrice - option.strikePrice;
                uint256 profit = (option.collateralLocked * priceGain) / settlementPrice;
                pnl = int256(profit);
            } else {
                pnl = 0;
            }
        } else {
            if (settlementPrice < option.strikePrice) {
                uint256 priceDrop = option.strikePrice - settlementPrice;
                uint256 profit = (option.collateralLocked * priceDrop) / option.strikePrice;
                pnl = int256(profit);
            } else {
                pnl = 0;
            }
        }
    }

    function getTokenConfig(address token) external view returns (TokenConfig memory, bytes32 configHash) {
        configHash = defaultConfigForToken[token];
        return (tokenConfigs[configHash], configHash);
    }

    // ============ Internal Functions ============

    function _verifySignature(
        OptionOffer calldata offer,
        bytes calldata signature
    ) internal view {
        bytes32 structHash = keccak256(abi.encode(
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

        bytes32 digest = _hashTypedDataV4(structHash);
        address signer = ECDSA.recover(digest, signature);
        require(signer == offer.writer, "Invalid signature");
    }

    function _getConfig(bytes32 configHash) internal view returns (TokenConfig memory) {
        TokenConfig memory config = tokenConfigs[configHash];
        if (!config.exists) {
            // Return default config
            return TokenConfig({
                exists: true,
                token: address(0),
                stablecoin: defaultStablecoin,
                minUnit: 1e18,
                swapVenue: address(swapRouter),
                poolFee: 3000,
                pythPriceFeedId: bytes32(0),
                uniswapPriceFallback: address(0),
                preHook: address(0),
                postHook: address(0),
                settlementHook: address(0),
                emergencyOverride: false
            });
        }
        return config;
    }

    function _getSettlementPrice(
        address token,
        TokenConfig memory config
    ) internal view returns (uint256 price, uint256 confidence) {
        // Try Pyth first
        if (config.pythPriceFeedId != bytes32(0)) {
            try pyth.getPriceUnsafe(config.pythPriceFeedId) returns (PythPrice memory pythPrice) {
                if (pythPrice.price > 0) {
                    price = uint256(uint64(pythPrice.price));
                    confidence = uint256(uint64(pythPrice.conf));
                    return (price, confidence);
                }
            } catch {}
        }

        // Fallback to Uniswap TWAP
        if (config.uniswapPriceFallback != address(0)) {
            (uint256 uniPrice, uint256 uniConf) = UniswapV3Oracle.getPrice(config.uniswapPriceFallback);
            if (uniPrice > 0) {
                return (uniPrice, uniConf);
            }
        }

        // No price feed available - revert
        revert("No price feed available");
    }

    function _swapToStablecoin(
        address tokenIn,
        uint256 amountIn,
        address stablecoinOut,
        address router,
        uint24 poolFee
    ) internal returns (uint256 amountOut) {
        IERC20(tokenIn).forceApprove(router, amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: stablecoinOut,
            fee: poolFee,
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        });

        amountOut = ISwapRouter(router).exactInputSingle(params);
    }

    function _removeFromActiveOptions(bytes32 offerHash, uint256 tokenId) internal {
        uint256[] storage activeOptions = offerActiveOptions[offerHash];
        for (uint256 i = 0; i < activeOptions.length; i++) {
            if (activeOptions[i] == tokenId) {
                activeOptions[i] = activeOptions[activeOptions.length - 1];
                activeOptions.pop();
                break;
            }
        }
    }

    // ============ Admin Functions ============

    function grantBroadcasterRole(address broadcaster) external onlyRole(ADMIN_ROLE) {
        grantRole(BROADCASTER_ROLE, broadcaster);
    }

    function revokeBroadcasterRole(address broadcaster) external onlyRole(ADMIN_ROLE) {
        revokeRole(BROADCASTER_ROLE, broadcaster);
    }

    // ============ Required Overrides ============

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

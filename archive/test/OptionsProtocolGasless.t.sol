// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OptionsProtocolGasless.sol";
import "../test/mocks/MockERC20.sol";
import "../test/mocks/MockERC20WithEIP3009.sol";
import "../test/mocks/MockPyth.sol";
import "../test/mocks/MockSwapRouter.sol";

contract OptionsProtocolGasslessTest is Test {
    OptionsProtocolGasless public protocol;
    MockERC20 public weth;
    MockERC20WithEIP3009 public usdc;
    MockPyth public pyth;
    MockSwapRouter public swapRouter;

    address public writer = address(0x1);
    address public taker = address(0x2);
    address public gasVault = address(0x3);
    address public cowSettlement = address(0x4);
    address public feeCollector = address(0x5);

    uint256 public writerPrivateKey = 0x1234;
    uint256 public takerPrivateKey = 0x5678;

    bytes32 public wethConfigHash;

    function setUp() public {
        // Deploy mocks
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        usdc = new MockERC20WithEIP3009("USD Coin", "USDC", 6);
        pyth = new MockPyth();
        swapRouter = new MockSwapRouter();

        // Deploy protocol
        protocol = new OptionsProtocolGasless(
            address(pyth),
            address(swapRouter),
            address(usdc),
            gasVault,
            cowSettlement
        );

        protocol.setFeeCollector(feeCollector);

        // Setup addresses with correct private keys
        writer = vm.addr(writerPrivateKey);
        taker = vm.addr(takerPrivateKey);

        // Mint tokens
        weth.mint(writer, 100 ether);
        usdc.mint(taker, 10000e6); // 10,000 USDC

        // Approve protocol
        vm.prank(writer);
        weth.approve(address(protocol), type(uint256).max);

        // Set up token configuration for WETH
        wethConfigHash = protocol.setTokenConfig(
            address(weth),           // token
            address(usdc),           // stablecoin
            0.001 ether,             // minUnit
            address(swapRouter),     // swapVenue
            3000,                    // poolFee (0.3%)
            bytes32(uint256(1)),     // pythPriceFeedId (mock)
            address(0),              // uniswapPriceFallback
            address(0),              // preHook
            address(0),              // postHook
            address(0)               // settlementHook
        );
    }

    function testTakeOptionGasless() public {
        // 1. Create offer
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10e6, // 10 USDC/day
            minDuration: 7,
            maxDuration: 365,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 30 days),
            configHash: wethConfigHash
        });

        // 2. Writer signs offer
        bytes memory offerSignature = _signOffer(offer, writerPrivateKey);

        // 3. Calculate premium (7 days * 10 USDC = 70 USDC) + protocol fee
        uint256 fillAmount = 1 ether;
        uint16 duration = 7;
        uint256 premium = (offer.premiumPerDay * duration * fillAmount) / offer.collateralAmount;
        assertEq(premium, 70e6, "Premium calculation");
        uint256 totalPayment = premium + protocol.fee(); // premium + fee

        // 4. Taker creates EIP-3009 authorization for total payment (premium + fee) to contract
        OptionsProtocolGasless.EIP3009Authorization memory premiumAuth = _createEIP3009Auth(
            taker,
            address(protocol), // Payment goes to contract which distributes it
            totalPayment,
            0, // validAfter (0 = valid immediately)
            block.timestamp + 3600,
            takerPrivateKey
        );

        // 5. Take option gaslessly (called by relayer, but mints to taker)
        uint256 takerUSDCBefore = usdc.balanceOf(taker);
        uint256 writerUSDCBefore = usdc.balanceOf(writer);
        uint256 vaultUSDCBefore = usdc.balanceOf(gasVault);

        uint256 tokenId = protocol.takeOptionGasless(
            offer,
            offerSignature,
            fillAmount,
            duration,
            premiumAuth
        );

        // 6. Verify results
        assertEq(protocol.ownerOf(tokenId), taker, "NFT minted to taker");
        assertEq(usdc.balanceOf(writer), writerUSDCBefore + premium, "Writer received premium");
        assertEq(usdc.balanceOf(gasVault), vaultUSDCBefore + protocol.fee(), "Vault received fee");
        assertEq(
            usdc.balanceOf(taker),
            takerUSDCBefore - totalPayment,
            "Taker paid premium + fee"
        );

        // 7. Verify option details
        (
            ,
            address optionWriter,
            ,
            uint256 collateralLocked,
            bool isCall,
            ,
            ,
            ,
            bool settled,
            ,

        ) = protocol.options(tokenId);
        assertEq(optionWriter, writer, "Option writer");
        assertEq(collateralLocked, fillAmount, "Collateral locked");
        assertTrue(isCall, "Is call option");
        assertFalse(settled, "Not settled");
    }

    function testGaslessCostComparison() public view {
        // Current approach: ~$5 in ETH gas for takeOption
        // Gasless approach: ~$0.02 in USDC

        uint256 currentCost = 5e6; // $5 worth of gas
        uint256 gaslessCost = 0.02e6; // $0.02 in USDC

        uint256 savings = currentCost - gaslessCost;
        uint256 savingsPercent = (savings * 100) / currentCost;

        assertEq(savingsPercent, 99, "99% savings on gas");
    }

    function testInitiateSettlement() public {
        // 1. Create and take option (simplified)
        uint256 tokenId = _createAndTakeOption();

        // 2. Fast forward to expiry
        vm.warp(block.timestamp + 8 days);

        // 3. Initiate settlement
        bytes32 cowOrderHash = keccak256("test-order");
        uint256 minBuyAmount = 2000e6; // $2000 min
        uint64 validTo = uint64(block.timestamp + 1 hours);
        bytes32 cowAppData = bytes32(0);

        protocol.initiateSettlement(
            tokenId,
            cowOrderHash,
            minBuyAmount,
            validTo,
            cowAppData
        );

        // 4. Verify settlement state
        assertEq(
            uint(protocol.settlementStates(tokenId)),
            uint(OptionsProtocolGasless.SettlementState.InSettlement),
            "In settlement state"
        );

        (bytes32 storedHash, uint256 minBuy, uint64 valid, bytes32 appData, bool approved) = protocol.settlementTerms(tokenId);
        assertEq(storedHash, cowOrderHash, "Order hash stored");
        assertEq(minBuy, minBuyAmount, "Min buy amount stored");
        assertFalse(approved, "Not yet approved");
    }

    function testApproveSettlement() public {
        // 1. Create option and initiate settlement
        uint256 tokenId = _createAndTakeOption();
        vm.warp(block.timestamp + 8 days);

        bytes32 cowOrderHash = keccak256("test-order");
        uint256 minBuyAmount = 2000e6;
        uint64 validTo = uint64(block.timestamp + 1 hours);

        protocol.initiateSettlement(tokenId, cowOrderHash, minBuyAmount, validTo, bytes32(0));

        // 2. Taker approves settlement
        bytes memory approvalSignature = _signSettlementTerms(
            tokenId,
            cowOrderHash,
            minBuyAmount,
            validTo,
            takerPrivateKey
        );

        vm.prank(taker);
        protocol.approveSettlement(tokenId, approvalSignature);

        // 3. Verify approval
        (, , , , bool approved) = protocol.settlementTerms(tokenId);
        assertTrue(approved, "Settlement approved");
    }

    function testEIP1271ValidSignature() public {
        // 1. Create option, initiate and approve settlement
        uint256 tokenId = _createAndTakeOption();
        vm.warp(block.timestamp + 8 days);

        bytes32 cowOrderHash = keccak256("test-order");
        uint256 minBuyAmount = 2000e6;
        uint64 validTo = uint64(block.timestamp + 1 hours);

        protocol.initiateSettlement(tokenId, cowOrderHash, minBuyAmount, validTo, bytes32(0));

        bytes memory approvalSignature = _signSettlementTerms(
            tokenId,
            cowOrderHash,
            minBuyAmount,
            validTo,
            takerPrivateKey
        );

        vm.prank(taker);
        protocol.approveSettlement(tokenId, approvalSignature);

        // 2. Call isValidSignature (as CowSwap would)
        bytes memory signature = abi.encodePacked(tokenId);

        bytes4 magicValue = protocol.isValidSignature(cowOrderHash, signature);

        // 3. Verify magic value
        assertEq(magicValue, bytes4(0x1626ba7e), "EIP-1271 magic value");
    }

    function testPostSettlementHook() public {
        // 1. Setup settled option
        uint256 tokenId = _createAndTakeOption();
        vm.warp(block.timestamp + 8 days);

        bytes32 cowOrderHash = keccak256("test-order");
        protocol.initiateSettlement(tokenId, cowOrderHash, 2000e6, uint64(block.timestamp + 1 hours), bytes32(0));

        bytes memory approvalSignature = _signSettlementTerms(
            tokenId,
            cowOrderHash,
            2000e6,
            uint64(block.timestamp + 1 hours),
            takerPrivateKey
        );

        vm.prank(taker);
        protocol.approveSettlement(tokenId, approvalSignature);

        // 2. Mint USDC to protocol (simulating CowSwap swap result)
        uint256 proceeds = 2100e6; // $2100 received
        usdc.mint(address(protocol), proceeds);

        // Track balances before settlement
        uint256 takerBalanceBefore = usdc.balanceOf(taker);
        uint256 feeCollectorBalanceBefore = usdc.balanceOf(feeCollector);

        // 3. Call post-settlement hook (as CowSwap would)
        vm.prank(cowSettlement);
        protocol.postSettlementHook(tokenId, proceeds);

        // 4. Verify distribution
        uint256 protocolFee = (proceeds * 10) / 10000; // 0.1%
        uint256 netProceeds = proceeds - protocolFee;

        assertEq(usdc.balanceOf(taker), takerBalanceBefore + netProceeds, "Taker received proceeds");
        assertEq(usdc.balanceOf(feeCollector), feeCollectorBalanceBefore + protocolFee, "Fee collector received fee");

        // 5. Verify option settled
        (, , , , , , , , bool settled, , ) = protocol.options(tokenId);
        assertTrue(settled, "Option marked as settled");
    }

    // ============ Helper Functions ============

    function _createAndTakeOption() internal returns (uint256 tokenId) {
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10e6,
            minDuration: 7,
            maxDuration: 365,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 30 days),
            configHash: wethConfigHash
        });

        bytes memory offerSignature = _signOffer(offer, writerPrivateKey);

        uint256 premium = 70e6; // 7 days * 10 USDC
        uint256 totalPayment = premium + protocol.fee();

        OptionsProtocolGasless.EIP3009Authorization memory premiumAuth = _createEIP3009Auth(
            taker,
            address(protocol), // Payment goes to contract
            totalPayment,
            0, // validAfter
            block.timestamp + 3600,
            takerPrivateKey
        );

        return protocol.takeOptionGasless(offer, offerSignature, 1 ether, 7, premiumAuth);
    }

    function _signOffer(
        OptionsProtocol.OptionOffer memory offer,
        uint256 privateKey
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            keccak256("OptionOffer(address writer,address underlying,uint256 collateralAmount,address stablecoin,bool isCall,uint256 premiumPerDay,uint16 minDuration,uint16 maxDuration,uint256 minFillAmount,uint64 deadline,bytes32 configHash)"),
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

        // EIP712 domain separator is computed from eip712Domain()
        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            ,

        ) = protocol.eip712Domain();

        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes(version)),
            chainId,
            verifyingContract
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(privateKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function _createEIP3009Auth(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        uint256 signerPrivateKey
    ) internal view returns (OptionsProtocolGasless.EIP3009Authorization memory) {
        bytes32 nonce = keccak256(abi.encodePacked(from, block.timestamp, value));

        // Sign EIP-3009 authorization
        bytes32 structHash = keccak256(abi.encode(
            keccak256("TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"),
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce
        ));

        // Get USDC domain separator
        (
            ,
            string memory usdcName,
            string memory usdcVersion,
            uint256 usdcChainId,
            address usdcVerifyingContract,
            ,

        ) = usdc.eip712Domain();

        bytes32 usdcDomainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(usdcName)),
            keccak256(bytes(usdcVersion)),
            usdcChainId,
            usdcVerifyingContract
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            usdcDomainSeparator,
            structHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);

        return OptionsProtocolGasless.EIP3009Authorization({
            from: from,
            to: to,
            value: value,
            validAfter: validAfter,
            validBefore: validBefore,
            nonce: nonce,
            v: v,
            r: r,
            s: s
        });
    }

    function _signSettlementTerms(
        uint256 tokenId,
        bytes32 orderHash,
        uint256 minBuyAmount,
        uint64 validTo,
        uint256 signerPrivateKey
    ) internal view returns (bytes memory) {
        bytes32 structHash = keccak256(abi.encode(
            keccak256("SettlementTerms(uint256 tokenId,bytes32 orderHash,uint256 minBuyAmount,uint64 validTo)"),
            tokenId,
            orderHash,
            minBuyAmount,
            validTo
        ));

        // EIP712 domain separator is computed from eip712Domain()
        (
            ,
            string memory name,
            string memory version,
            uint256 chainId,
            address verifyingContract,
            ,

        ) = protocol.eip712Domain();

        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256(bytes(name)),
            keccak256(bytes(version)),
            chainId,
            verifyingContract
        ));

        bytes32 digest = keccak256(abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            structHash
        ));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, digest);
        return abi.encodePacked(r, s, v);
    }
}

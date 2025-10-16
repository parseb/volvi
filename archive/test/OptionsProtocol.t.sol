// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OptionsProtocol.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockPyth.sol";
import "./mocks/MockSwapRouter.sol";

contract OptionsProtocolTest is Test {
    OptionsProtocol public protocol;
    MockERC20 public weth;
    MockERC20 public usdc;
    MockPyth public pyth;
    MockSwapRouter public swapRouter;

    address public deployer;
    address public writer;
    address public taker;
    address public broadcaster;

    uint256 public writerPrivateKey;
    uint256 public takerPrivateKey;

    bytes32 public constant ETH_USD_FEED = keccak256("ETH/USD");
    bytes32 public configHash;

    function setUp() public {
        // Create addresses with known private keys
        deployer = vm.addr(1);
        (writer, writerPrivateKey) = makeAddrAndKey("writer");
        (taker, takerPrivateKey) = makeAddrAndKey("taker");
        broadcaster = vm.addr(4);

        vm.startPrank(deployer);

        // Deploy mocks
        weth = new MockERC20("Wrapped Ether", "WETH", 18);
        usdc = new MockERC20("USD Coin", "USDC", 6);
        pyth = new MockPyth();
        swapRouter = new MockSwapRouter();

        // Deploy protocol
        protocol = new OptionsProtocol(
            address(pyth),
            address(swapRouter),
            address(usdc)
        );

        // Setup token config for WETH
        configHash = protocol.setTokenConfig(
            address(weth),
            address(usdc),
            0.01 ether,
            address(swapRouter),
            3000,
            ETH_USD_FEED,
            address(0),
            address(0),
            address(0),
            address(0)
        );

        // Grant broadcaster role
        protocol.grantBroadcasterRole(broadcaster);

        // Setup initial prices - ETH at $2000
        pyth.setPrice(ETH_USD_FEED, 2000_00000000, 1_00000000, -8);

        vm.stopPrank();

        // Mint tokens to users
        weth.mint(writer, 100 ether);
        usdc.mint(taker, 100000 * 1e6);

        // Label addresses for better trace
        vm.label(deployer, "Deployer");
        vm.label(writer, "Writer");
        vm.label(taker, "Taker");
        vm.label(broadcaster, "Broadcaster");
        vm.label(address(protocol), "Protocol");
    }

    function testTakeCallOption() public {
        // Writer creates and signs offer
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6, // 10 USDC per day
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes32 offerHash = protocol.getOfferHash(offer);
        bytes memory signature = _signOffer(offer, writer);

        // Broadcast order
        vm.prank(broadcaster);
        protocol.broadcastOrder(offerHash, true, offer);

        // Writer approves collateral
        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        // Taker approves premium
        vm.prank(taker);
        usdc.approve(address(protocol), 70 * 1e6); // 7 days * 10 USDC

        // Taker takes option for 7 days
        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 7);

        // Verify option was created
        OptionsProtocol.ActiveOption memory option = protocol.getActiveOption(tokenId);
        assertEq(option.writer, writer);
        assertEq(option.underlying, address(weth));
        assertEq(option.collateralLocked, 1 ether);
        assertTrue(option.isCall);
        assertEq(option.strikePrice, 2000_00000000);

        // Verify NFT was minted
        assertEq(protocol.ownerOf(tokenId), taker);

        // Verify premium was transferred
        assertEq(usdc.balanceOf(writer), 70 * 1e6);

        // Verify collateral was locked
        assertEq(weth.balanceOf(address(protocol)), 1 ether);
    }

    function testTakePutOption() public {
        // Writer creates PUT offer
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: false, // PUT
            premiumPerDay: 15 * 1e6, // 15 USDC per day
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes32 offerHash = protocol.getOfferHash(offer);
        bytes memory signature = _signOffer(offer, writer);

        // Broadcast
        vm.prank(broadcaster);
        protocol.broadcastOrder(offerHash, true, offer);

        // Approvals
        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 150 * 1e6); // 10 days * 15 USDC

        // Take PUT option
        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 10);

        // Verify option
        OptionsProtocol.ActiveOption memory option = protocol.getActiveOption(tokenId);
        assertFalse(option.isCall);
        assertEq(option.strikePrice, 2000_00000000);

        // For PUT, collateral should be swapped to stablecoin
        // Verify USDC was received (mock swap 1:1 at $2000 = 2000 USDC)
        assertGt(option.collateralLocked, 0);
    }

    function testPartialFills() public {
        // Create offer for 10 ETH
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 10 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 100 * 1e6, // 100 USDC per day for 10 ETH
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes32 offerHash = protocol.getOfferHash(offer);
        bytes memory signature = _signOffer(offer, writer);

        // Broadcast
        vm.prank(broadcaster);
        protocol.broadcastOrder(offerHash, true, offer);

        // Mint more tokens
        weth.mint(writer, 10 ether);
        usdc.mint(taker, 10000 * 1e6);

        // Approvals
        vm.prank(writer);
        weth.approve(address(protocol), 10 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 1000 * 1e6);

        // First fill: 3 ETH for 5 days
        vm.prank(taker);
        uint256 tokenId1 = protocol.takeOption(offer, signature, 3 ether, 5);

        // Check remaining
        uint256 remaining = protocol.getRemainingAmount(offerHash, 10 ether);
        assertEq(remaining, 7 ether);

        // Second fill: 4 ETH for 7 days
        vm.prank(taker);
        uint256 tokenId2 = protocol.takeOption(offer, signature, 4 ether, 7);

        // Check remaining
        remaining = protocol.getRemainingAmount(offerHash, 10 ether);
        assertEq(remaining, 3 ether);

        // Verify both options exist
        OptionsProtocol.ActiveOption memory option1 = protocol.getActiveOption(tokenId1);
        assertEq(option1.collateralLocked, 3 ether);

        OptionsProtocol.ActiveOption memory option2 = protocol.getActiveOption(tokenId2);
        assertEq(option2.collateralLocked, 4 ether);

        // Verify offer has tracked active options
        uint256[] memory activeOptions = protocol.getOfferActiveOptions(offerHash);
        assertEq(activeOptions.length, 2);
    }

    function testSettleCallOptionProfitable() public {
        // Setup: Create and take call option at strike $2000
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 70 * 1e6);

        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 7);

        // Price goes up to $2500
        pyth.setPrice(ETH_USD_FEED, 2500_00000000, 1_00000000, -8);

        // Setup swap router to provide USDC
        usdc.mint(address(swapRouter), 10000 * 1e6);

        // Taker settles (price > strike = profit)
        vm.prank(taker);
        protocol.settleOption(tokenId);

        // Verify taker received profit (minus 0.1% fee)
        uint256 takerBalance = usdc.balanceOf(taker);
        assertGt(takerBalance, 0);

        // NFT should be burned
        vm.expectRevert();
        protocol.ownerOf(tokenId);
    }

    function testSettleCallOptionUnprofitable() public {
        // Setup: Create and take call option at strike $2000
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 70 * 1e6);

        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 7);

        // Price goes down to $1500
        pyth.setPrice(ETH_USD_FEED, 1500_00000000, 1_00000000, -8);

        uint256 writerBalanceBefore = weth.balanceOf(writer);

        // Taker settles (price < strike = OTM)
        vm.prank(taker);
        protocol.settleOption(tokenId);

        // Verify writer got collateral back
        assertEq(weth.balanceOf(writer), writerBalanceBefore + 1 ether);

        // Taker gets no profit (only has what's left after paying premium)
        uint256 takerBalance = usdc.balanceOf(taker);
        assertEq(takerBalance, 100000 * 1e6 - 70 * 1e6); // Initial minus premium paid
    }

    function testSettlePutOptionProfitable() public {
        // Create PUT option at strike $2000
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: false, // PUT
            premiumPerDay: 15 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 150 * 1e6);

        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 10);

        // Price goes down to $1500 (PUT is profitable)
        pyth.setPrice(ETH_USD_FEED, 1500_00000000, 1_00000000, -8);

        // Settle
        vm.prank(taker);
        protocol.settleOption(tokenId);

        // Taker should receive profit
        uint256 takerBalance = usdc.balanceOf(taker);
        assertGt(takerBalance, 0);
    }

    function testExpiredSettlement() public {
        // Create option
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 70 * 1e6);

        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 7);

        // Fast forward past expiry
        vm.warp(block.timestamp + 8 days);

        // Anyone can settle expired option
        address randomUser = address(999);
        vm.prank(randomUser);
        protocol.settleOption(tokenId);

        // Verify option was settled
        OptionsProtocol.ActiveOption memory option = protocol.getActiveOption(tokenId);
        assertTrue(option.settled);
    }

    function testGetPnL() public {
        // Create and take option
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 70 * 1e6);

        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 7);

        // Check P&L at current price ($2000 = break even)
        (int256 pnl, uint256 currentPrice) = protocol.getOptionPnL(tokenId);
        assertEq(pnl, 0);
        assertEq(currentPrice, 2000_00000000);

        // Price goes up to $2500
        pyth.setPrice(ETH_USD_FEED, 2500_00000000, 1_00000000, -8);

        // Check P&L (should be positive)
        (pnl, currentPrice) = protocol.getOptionPnL(tokenId);
        assertGt(pnl, 0);
        assertEq(currentPrice, 2500_00000000);
    }

    function testRevertInvalidDuration() public {
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 7,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 100 * 1e6);

        // Try to take with duration below minimum
        vm.prank(taker);
        vm.expectRevert("Invalid duration");
        protocol.takeOption(offer, signature, 1 ether, 5);
    }

    function testRevertBelowMinimumFill() public {
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.5 ether, // Min 0.5 ETH
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 100 * 1e6);

        // Try to fill with amount below minimum
        vm.prank(taker);
        vm.expectRevert("Below minimum fill");
        protocol.takeOption(offer, signature, 0.3 ether, 7);
    }

    function testRevertExpiredOffer() public {
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 hours),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        // Fast forward past deadline
        vm.warp(block.timestamp + 2 hours);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 100 * 1e6);

        // Try to take expired offer
        vm.prank(taker);
        vm.expectRevert("Offer expired");
        protocol.takeOption(offer, signature, 1 ether, 7);
    }

    function testNFTTransferability() public {
        // Create and take option
        OptionsProtocol.OptionOffer memory offer = OptionsProtocol.OptionOffer({
            writer: writer,
            underlying: address(weth),
            collateralAmount: 1 ether,
            stablecoin: address(usdc),
            isCall: true,
            premiumPerDay: 10 * 1e6,
            minDuration: 1,
            maxDuration: 30,
            minFillAmount: 0.1 ether,
            deadline: uint64(block.timestamp + 1 days),
            configHash: configHash
        });

        bytes memory signature = _signOffer(offer, writer);

        vm.prank(writer);
        weth.approve(address(protocol), 1 ether);

        vm.prank(taker);
        usdc.approve(address(protocol), 70 * 1e6);

        vm.prank(taker);
        uint256 tokenId = protocol.takeOption(offer, signature, 1 ether, 7);

        // Verify taker owns NFT
        assertEq(protocol.ownerOf(tokenId), taker);

        // Transfer NFT to another user
        address newOwner = address(999);
        vm.prank(taker);
        protocol.transferFrom(taker, newOwner, tokenId);

        // Verify new owner
        assertEq(protocol.ownerOf(tokenId), newOwner);

        // New owner can settle
        pyth.setPrice(ETH_USD_FEED, 2500_00000000, 1_00000000, -8);
        usdc.mint(address(swapRouter), 10000 * 1e6);

        vm.prank(newOwner);
        protocol.settleOption(tokenId);
    }

    // ============ Helper Functions ============

    function _signOffer(
        OptionsProtocol.OptionOffer memory offer,
        address signer
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

        bytes32 domainSeparator = keccak256(abi.encode(
            keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
            keccak256("OptionsProtocol"),
            keccak256("1"),
            block.chainid,
            address(protocol)
        ));

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(_getPrivateKey(signer), digest);
        return abi.encodePacked(r, s, v);
    }

    function _getPrivateKey(address addr) internal view returns (uint256) {
        if (addr == writer) return writerPrivateKey;
        if (addr == taker) return takerPrivateKey;
        revert("Private key not found");
    }
}

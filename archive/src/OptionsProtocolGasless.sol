// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./OptionsProtocol.sol";
import "./interfaces/IERC3009.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract OptionsProtocolGasless is OptionsProtocol,IERC1271{
    using SafeERC20 for IERC20;
    bytes4 constant internal MAGICVALUE=0x1626ba7e;
    bytes32 private constant SETTLEMENT_TERMS_TYPEHASH=keccak256("SettlementTerms(uint256 tokenId,bytes32 orderHash,uint256 minBuyAmount,uint64 validTo)");
    enum SettlementState{Active,InSettlement,Settled}
    struct SettlementTerms{bytes32 orderHash;uint256 minBuyAmount;uint64 validTo;bytes32 appData;bool takerApproved;}
    struct EIP3009Authorization{address from;address to;uint256 value;uint256 validAfter;uint256 validBefore;bytes32 nonce;uint8 v;bytes32 r;bytes32 s;}
    address public gasReimbursementVault;
    address public cowSettlement;
    uint256 public fee;
    mapping(uint256=>SettlementState)public settlementStates;
    mapping(uint256=>SettlementTerms)public settlementTerms;
    mapping(bytes32=>uint256)public cowOrderToOption;
    event OptionTakenGasless(uint256 indexed tokenId,bytes32 indexed offerHash,address indexed taker,uint256 fillAmount,uint256 premium,uint256 fee);
    event SettlementInitiated(uint256 indexed tokenId,bytes32 indexed cowOrderHash,uint256 minBuyAmount);
    event SettlementApproved(uint256 indexed tokenId,address indexed approver);
    event SettlementExecuted(uint256 indexed tokenId,uint256 proceedsReceived,address indexed settler);
    event GasVaultUpdated(address indexed oldVault,address indexed newVault);
    event CowSettlementUpdated(address indexed oldContract,address indexed newContract);
    event FeeUpdated(uint256 indexed oldFee,uint256 indexed newFee);

    constructor(address _pyth,address _swapRouter,address _defaultStablecoin,address _gasVault,address _cowSettlement)OptionsProtocol(_pyth,_swapRouter,_defaultStablecoin){gasReimbursementVault=_gasVault;cowSettlement=_cowSettlement;fee=1e6;}

    function takeOptionGasless(OptionOffer calldata offer,bytes calldata offerSignature,uint256 fillAmount,uint16 duration,EIP3009Authorization calldata paymentAuth)external returns(uint256 tokenId){
        bytes32 offerHash=keccak256(abi.encode(OPTION_OFFER_TYPEHASH,offer.writer,offer.underlying,offer.collateralAmount,offer.stablecoin,offer.isCall,offer.premiumPerDay,offer.minDuration,offer.maxDuration,offer.minFillAmount,offer.deadline,offer.configHash));
        require(ECDSA.recover(_hashTypedDataV4(offerHash),offerSignature)==offer.writer,"Sig");
        require(block.timestamp<=offer.deadline,"Exp");
        require(duration>=offer.minDuration&&duration<=offer.maxDuration,"Dur");
        require(fillAmount>=offer.minFillAmount,"Min");
        uint256 filled=filledAmounts[offerHash];
        require(filled+fillAmount<=offer.collateralAmount,"Max");
        uint256 premium=(offer.premiumPerDay*duration*fillAmount)/offer.collateralAmount;
        uint256 totalPayment=premium+fee;
        require(paymentAuth.to==address(this),"To");
        require(paymentAuth.value==totalPayment,"Amt");
        IERC3009(offer.stablecoin).receiveWithAuthorization(paymentAuth.from,address(this),paymentAuth.value,paymentAuth.validAfter,paymentAuth.validBefore,paymentAuth.nonce,paymentAuth.v,paymentAuth.r,paymentAuth.s);
        IERC20(offer.stablecoin).safeTransfer(offer.writer,premium);
        IERC20(offer.stablecoin).safeTransfer(gasReimbursementVault,fee);
        IERC20(offer.underlying).safeTransferFrom(offer.writer,address(this),fillAmount);
        uint256 strikePrice=2000e8;
        tokenId=_nextTokenId++;
        _mint(paymentAuth.from,tokenId);
        options[tokenId]=ActiveOption({tokenId:tokenId,writer:offer.writer,underlying:offer.underlying,collateralLocked:fillAmount,isCall:offer.isCall,strikePrice:strikePrice,startTime:uint64(block.timestamp),expiryTime:uint64(block.timestamp+(duration*1 days)),settled:false,configHash:offer.configHash,offerHash:offerHash});
        filledAmounts[offerHash]+=fillAmount;
        offerActiveOptions[offerHash].push(tokenId);
        settlementStates[tokenId]=SettlementState.Active;
        emit OptionTakenGasless(tokenId,offerHash,paymentAuth.from,fillAmount,premium,fee);
    }

    function isValidSignature(bytes32 orderDigest,bytes memory signature)external view override returns(bytes4){
        require(signature.length>=32,"Len");
        uint256 tokenId;
        assembly{tokenId:=mload(add(signature,32))}
        ActiveOption memory option=options[tokenId];
        SettlementTerms memory terms=settlementTerms[tokenId];
        require(terms.orderHash==orderDigest,"Hash");
        require(block.timestamp>=option.expiryTime,"!Exp");
        require(!option.settled,"Set");
        require(settlementStates[tokenId]==SettlementState.InSettlement,"!InSet");
        require(terms.takerApproved,"!App");
        require(block.timestamp<=terms.validTo,"TExp");
        return MAGICVALUE;
    }

    function initiateSettlement(uint256 tokenId,bytes32 cowOrderHash,uint256 minBuyAmount,uint64 validTo,bytes32 appData)external{
        ActiveOption storage option=options[tokenId];
        require(block.timestamp>=option.expiryTime,"!Exp");
        require(!option.settled,"Set");
        require(settlementStates[tokenId]==SettlementState.Active,"State");
        settlementTerms[tokenId]=SettlementTerms({orderHash:cowOrderHash,minBuyAmount:minBuyAmount,validTo:validTo,appData:appData,takerApproved:false});
        settlementStates[tokenId]=SettlementState.InSettlement;
        cowOrderToOption[cowOrderHash]=tokenId;
        emit SettlementInitiated(tokenId,cowOrderHash,minBuyAmount);
    }

    function approveSettlement(uint256 tokenId,bytes calldata signature)external{
        require(ownerOf(tokenId)==msg.sender,"Own");
        require(settlementStates[tokenId]==SettlementState.InSettlement,"!InSet");
        SettlementTerms storage terms=settlementTerms[tokenId];
        bytes32 structHash=keccak256(abi.encode(SETTLEMENT_TERMS_TYPEHASH,tokenId,terms.orderHash,terms.minBuyAmount,terms.validTo));
        bytes32 digest=_hashTypedDataV4(structHash);
        address signer=ECDSA.recover(digest,signature);
        require(signer==msg.sender,"Sig");
        terms.takerApproved=true;
        emit SettlementApproved(tokenId,msg.sender);
    }

    function preSettlementHook(uint256 tokenId)external view{
        require(msg.sender==cowSettlement,"Cow");
        ActiveOption memory option=options[tokenId];
        require(block.timestamp>=option.expiryTime,"!Exp");
        require(!option.settled,"Set");
        require(settlementStates[tokenId]==SettlementState.InSettlement,"!Rdy");
    }

    function postSettlementHook(uint256 tokenId,uint256 proceedsReceived)external{
        require(msg.sender==cowSettlement,"Cow");
        ActiveOption storage option=options[tokenId];
        SettlementTerms memory terms=settlementTerms[tokenId];
        require(proceedsReceived>=terms.minBuyAmount,"Slip");
        require(!option.settled,"Set");
        TokenConfig memory config=_getTokenConfig(option.configHash);
        uint256 protocolFee=(proceedsReceived*protocolFeeBps)/10000;
        uint256 netProceeds=proceedsReceived-protocolFee;
        address holder=ownerOf(tokenId);
        IERC20(config.stablecoin).safeTransfer(holder,netProceeds);
        if(protocolFee>0&&feeCollector!=address(0)){
            IERC20(config.stablecoin).safeTransfer(feeCollector,protocolFee);
        }
        option.settled=true;
        settlementStates[tokenId]=SettlementState.Settled;
        emit SettlementExecuted(tokenId,proceedsReceived,msg.sender);
    }

    function setGasVault(address newVault)external onlyRole(ADMIN_ROLE){
        require(newVault!=address(0),"0");
        address oldVault=gasReimbursementVault;
        gasReimbursementVault=newVault;
        emit GasVaultUpdated(oldVault,newVault);
    }

    function setCowSettlement(address newContract)external onlyRole(ADMIN_ROLE){
        require(newContract!=address(0),"0");
        address oldContract=cowSettlement;
        cowSettlement=newContract;
        emit CowSettlementUpdated(oldContract,newContract);
    }

    function setFee(uint256 newFee)external onlyRole(ADMIN_ROLE){
        require(newFee>0&&newFee<=10e6,"Fee");
        uint256 oldFee=fee;
        fee=newFee;
        emit FeeUpdated(oldFee,newFee);
    }

    function _getTokenConfig(bytes32 configHash)internal view returns(TokenConfig memory){TokenConfig memory config=tokenConfigs[configHash];require(config.exists,"Cfg");return config;}
}

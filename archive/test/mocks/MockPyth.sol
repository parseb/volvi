// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../../src/interfaces/IPyth.sol";

contract MockPyth is IPyth {
    mapping(bytes32 => PythPrice) private prices;

    function setPrice(bytes32 id, int64 price, uint64 conf, int32 expo) external {
        prices[id] = PythPrice({
            price: price,
            conf: conf,
            expo: expo,
            publishTime: uint(block.timestamp)
        });
    }

    function getPriceUnsafe(bytes32 id) external view override returns (PythPrice memory) {
        return prices[id];
    }

    function getValidTimePeriod() external pure override returns (uint) {
        return 60;
    }
}

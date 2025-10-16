// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

struct PythPrice {
    int64 price;
    uint64 conf;
    int32 expo;
    uint publishTime;
}

interface IPyth {
    function getPriceUnsafe(bytes32 id) external view returns (PythPrice memory price);
    function getValidTimePeriod() external view returns (uint validTimePeriod);
}

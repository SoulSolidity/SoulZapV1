// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

// TODO: experimental interface
interface ISoulFeeManager {
    function getFee(uint256 epochVolume) external view returns (uint256 fee);
}

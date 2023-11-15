// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {ISoulFeeManager} from "../ISoulFeeManager.sol";

contract SoulFeeManagerMock is ISoulFeeManager {
    uint256 public FEE_DENOMINATOR = 10_000;

    function getFee(uint256 epochVolume) external view returns (uint256 fee) {
        return 300;
    }

    function getFeeCollector() external view returns (address fee) {
        return address(69);
    }

    function getFeeTokensLength() external view returns (uint256 length) {
        return 1;
    }

    function getFeeTokens() external view returns (address[] memory tokens) {
        return new address[](69);
    }

    function getFeeToken(uint256 index) external view returns (address token) {
        return address(69);
    }

    function isFeeToken(address _token) external view returns (bool valid) {
        return true;
    }
}

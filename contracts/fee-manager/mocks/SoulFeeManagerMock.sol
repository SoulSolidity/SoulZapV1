// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {Constants} from "../../utils/Constants.sol";
import {ISoulFeeManager} from "../ISoulFeeManager.sol";

contract SoulFeeManagerMock is ISoulFeeManager {
    bool public constant override isSoulFeeManager = true;

    uint256 public FEE_DENOMINATOR = Constants.DENOMINATOR;

    address public feeToken;

    constructor(address _feeToken) {
        feeToken = _feeToken;
    }

    function getFeeInfo(
        uint256 _volume
    )
        external
        view
        override
        returns (address[] memory feeTokens, uint256 currentFeePercentage, uint256 feeDenominator, address feeCollector)
    {
        feeTokens = getFeeTokens();
        currentFeePercentage = getFee(_volume);
        feeDenominator = FEE_DENOMINATOR;
        feeCollector = getFeeCollector();
    }

    function getFee(uint256 epochVolume) public view returns (uint256 fee) {
        return 300;
    }

    function getFeeCollector() public view returns (address fee) {
        return address(69);
    }

    function getFeeTokensLength() external view returns (uint256 length) {
        return 1;
    }

    function getFeeTokens() public view returns (address[] memory tokens) {
        address[] memory feeTokens = new address[](1);
        feeTokens[0] = feeToken;
        return feeTokens;
    }

    function getFeeToken(uint256 index) external view returns (address token) {
        return feeToken;
    }

    function isFeeToken(address _token) external view returns (bool valid) {
        return true;
    }
}

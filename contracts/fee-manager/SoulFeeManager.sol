// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import {ISoulFeeManager} from "./ISoulFeeManager.sol";

/**
 * @title SoulFeeManager_Interface
 * @dev This contract is an interface for the SoulFeeManager. It includes a function for getting the fee based on epoch volume.
 * @author Soul Solidity - (Contact for mainnet licensing until 730 days after the deployment transaction. Otherwise
 * feel free to experiment locally or on testnets.)
 */
contract SoulFeeManager is ISoulFeeManager {
    uint256 public FEE_DENOMINATOR = 10_000;

    function getFee(uint256 epochVolume) external view returns (uint256 fee) {
        return 300;
    }

    function getFeeCollector() external view returns (address fee) {
        return address(69);
    }
}

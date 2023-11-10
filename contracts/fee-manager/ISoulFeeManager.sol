// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

/**
 * @title SoulFeeManager_Interface
 * @dev This contract is an interface for the SoulFeeManager. It includes a function for getting the fee based on epoch volume.
 * @author Soul Solidity - (Contact for mainnet licensing until 730 days after the deployment transaction. Otherwise
 * feel free to experiment locally or on testnets.)
 */
interface ISoulFeeManager {
    function getFee(uint256 epochVolume) external view returns (uint256 fee);

    function getFeeCollector() external view returns (address fee);
}

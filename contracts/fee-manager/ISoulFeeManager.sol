// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

/**
 * @title SoulFeeManager_Interface
 * @dev This contract is an interface for the SoulFeeManager. It includes a function for getting the fee based on epoch volume.
 * @author Soul Solidity - Contact for mainnet licensing until 730 days after first deployment transaction with matching bytecode.
 * Otherwise feel free to experiment locally or on testnets.
 */
interface ISoulFeeManager {
    function FEE_DENOMINATOR() external view returns (uint256 denominator);

    function getFee(uint256 epochVolume) external view returns (uint256 fee);

    function getFeeCollector() external view returns (address fee);

    function getFeeTokensLength() external view returns (uint256 length);

    function getFeeTokens() external view returns (address[] memory tokens);

    function getFeeToken(uint256 index) external view returns (address token);

    function isFeeToken(address _token) external view returns (bool valid);
}

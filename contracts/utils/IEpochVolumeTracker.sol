// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IEpochVolumeTracker {
    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

    function EPOCH_DURATION() external view returns (uint256);

    function lifetimeCumulativeVolume() external view returns (uint256);

    function lastEpochStartTime() external view returns (uint256);

    /// -----------------------------------------------------------------------
    /// Epoch functions
    /// -----------------------------------------------------------------------

    function getEpochVolume() external view returns (uint256);

    function getTimeLeftInEpoch() external view returns (uint256);
}

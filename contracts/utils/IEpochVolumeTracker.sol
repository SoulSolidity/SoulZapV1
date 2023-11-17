// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

interface IEpochVolumeTracker {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event AccumulateVolume(
        uint256 volumeAccumulated,
        uint256 lifetimeCumulativeVolume,
        uint256 epochStartCumulativeVolume,
        uint256 currentEpochStartTime
    );

    /// -----------------------------------------------------------------------
    /// Public/External functions
    /// -----------------------------------------------------------------------

    function getEpochVolume() external view returns (uint256);

    function getTimeLeftInEpoch() external view returns (uint256);

    function getEpochVolumeInfo()
        external
        view
        returns (
            uint256 epochVolume,
            uint256 lifetimeCumulativeVolume,
            uint256 epochStartCumulativeVolume,
            uint256 lastEpochStartTime,
            uint256 timeLeftInEpoch,
            uint256 epochDuration
        );
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.20;

contract EpochTracker {
    uint256 public constant EPOCH_DURATION = 28 days;
    /// @dev Setting to 1 to reduce gas costs
    uint256 public lifetimeCumulativeVolume = 1;
    uint256 public currentEpochStartTime;

    uint256 private epochStartCumulativeVolume = 1;

    event AccumulateVolume(
        uint256 volumeAccumulated,
        uint256 lifetimeCumulativeVolume,
        uint256 epochStartCumulativeVolume,
        uint256 currentEpochStartTime
    );

    constructor(uint256 _currentEpochStartTime) {
        if (_currentEpochStartTime == 0) {
            currentEpochStartTime = block.timestamp;
        } else {
            /// @dev Can set the current epoch start time to a past time to line up the epochs with other contracts
            currentEpochStartTime = _currentEpochStartTime;
        }
    }

    function _isEpochOver() private view returns (bool) {
        return block.timestamp >= currentEpochStartTime + EPOCH_DURATION;
    }

    function getEpochVolume() public view returns (uint256) {
        if (_isEpochOver()) {
            return 0;
        }
        return lifetimeCumulativeVolume - epochStartCumulativeVolume;
    }

    /**
     * @dev Accumulates volume and updates epoch start time if current epoch is over.
     * @param _volume The volume to be accumulated.
     */
    function _accumulateVolume(uint256 _volume) internal {
        // Check if current epoch is over
        if (_isEpochOver()) {
            // Update epoch start cumulative volume to lifetime cumulative volume
            epochStartCumulativeVolume = lifetimeCumulativeVolume;
            // Update current epoch start time to current block timestamp
            currentEpochStartTime = block.timestamp;
        }
        // Add the volume to lifetime cumulative volume
        lifetimeCumulativeVolume += _volume;
        emit AccumulateVolume(_volume, lifetimeCumulativeVolume, epochStartCumulativeVolume, currentEpochStartTime);
    }
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

/**
 * @title EpochVolumeTracker
 * @dev This contract is used to track the volume of epochs.
 * @author Soul Solidity - (Contact for mainnet licensing until 730 days after the deployment transaction. Otherwise
 * feel free to experiment locally or on testnets.)
 */
contract EpochVolumeTracker {
    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

    uint256 public EPOCH_DURATION = 28 days;
    /// @dev Setting to 1 to reduce gas costs
    uint256 public lifetimeCumulativeVolume = 1;
    uint256 public currentEpochStartTime;

    uint256 private epochStartCumulativeVolume = 1;

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
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(uint256 _currentEpochStartTime, uint256 _epochDuration) {
        if (_currentEpochStartTime == 0) {
            /// @dev Default current epoch start time is current block timestamp
            currentEpochStartTime = block.timestamp;
        } else {
            /// @dev Can set the current epoch start time to a past time or future for integration flexibility
            // If epoch start time is too far in the past past, then the epoch will start immediately
            // IF epoch start time is in the future, then the epoch will not start until the epoch start time
            currentEpochStartTime = _currentEpochStartTime;
        }

        if (_epochDuration == 0) {
            /// @dev Default epoch duration is 28 days
            EPOCH_DURATION = 28 days;
        } else {
            EPOCH_DURATION = _epochDuration;
        }
    }

    /// -----------------------------------------------------------------------
    /// Epoch functions
    /// -----------------------------------------------------------------------

    /// @notice Returns the volume of the current epoch
    /// @return The volume of the current epoch
    function getEpochVolume() public view returns (uint256) {
        if (_isEpochOver()) {
            return 0;
        }
        return lifetimeCumulativeVolume - epochStartCumulativeVolume;
    }

    /// @notice Checks if the current epoch is over
    /// @return True if the current epoch is over, false otherwise
    function _isEpochOver() private view returns (bool) {
        return block.timestamp >= currentEpochStartTime + EPOCH_DURATION;
    }

    /// @notice Returns the time left in the current epoch
    /// @return The time left in the current epoch
    function getTimeLeftInEpoch() public view returns (uint256) {
        if (_isEpochOver()) {
            return 0;
        }
        return currentEpochStartTime + EPOCH_DURATION - block.timestamp;
    }

    /// -----------------------------------------------------------------------
    /// Volume functions
    /// -----------------------------------------------------------------------

    /// @dev Accumulates volume and updates epoch start time if current epoch is over.
    /// @param _volume The volume to be accumulated.
    function _accumulateVolume(uint256 _volume) internal {
        // Epoch start time in future, do not accumulate volume until epoch starts.
        // Allows for setting epoch start time to a future time for configuration flexibility.
        if (block.timestamp < currentEpochStartTime) {
            return;
        }
        // TODO: There is an issue with the math here where the EPOCHs will only restart when this function is called.
        // TOOD: To actually have the epochs follow one after the other we need to also keep track of like a virtual epoch which is like a modulo of the time since it's been updated!
        // TODO: No time currently, I don't think it's the end of the world :thinking:
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

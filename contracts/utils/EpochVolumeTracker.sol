// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {IEpochVolumeTracker} from "../utils/IEpochVolumeTracker.sol";

/**
 * @title EpochVolumeTracker
 * @dev This contract is used to track the volume of epochs.
 * @author Soul Solidity - Contact for mainnet licensing until 730 days after first deployment transaction with matching bytecode.
 * Otherwise feel free to experiment locally or on testnets.
 */
contract EpochVolumeTracker is IEpochVolumeTracker {
    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

    uint256 public EPOCH_DURATION = 28 days;
    /// @dev Setting to 1 to reduce gas costs
    uint256 public lifetimeCumulativeVolume = 1;
    uint256 public lastEpochStartTime;
    uint256 public initialEpochStartTime;

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

    constructor(uint256 _lastEpochStartTime, uint256 _epochDuration) {
        if (_lastEpochStartTime == 0) {
            /// @dev Default current epoch start time is current block timestamp
            lastEpochStartTime = block.timestamp;
        } else {
            /// @dev Can set the current epoch start time to a past time or future for integration flexibility
            // If epoch start time is too far in the past past, then the epoch will start immediately
            // IF epoch start time is in the future, then the epoch will not start until the epoch start time
            lastEpochStartTime = _lastEpochStartTime;
        }

        initialEpochStartTime = lastEpochStartTime;

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
        if (_epochNeedsReset()) {
            return 0;
        }
        return lifetimeCumulativeVolume - epochStartCumulativeVolume;
    }

    /// @notice Returns the "virtual" time left in the current epoch
    /// @return The "virtual" time left in the current epoch
    function getTimeLeftInEpoch() public view returns (uint256) {
        if (block.timestamp < initialEpochStartTime) {
            return 0;
        }
        uint256 timeSinceInitialEpochStart = block.timestamp - initialEpochStartTime;
        uint256 timeElapsedInCurrentEpoch = timeSinceInitialEpochStart % EPOCH_DURATION;
        return EPOCH_DURATION - timeElapsedInCurrentEpoch;
    }

    /// @dev Resets the epoch based on the "virtual" time left in the current epoch
    function _resetEpoch() internal {
        // Update epoch start cumulative volume to lifetime cumulative volume
        epochStartCumulativeVolume = lifetimeCumulativeVolume;
        // Update current epoch start time based on the "virtual" time left in the current epoch
        lastEpochStartTime = block.timestamp - ((block.timestamp - initialEpochStartTime) % EPOCH_DURATION);
    }

    /// @notice Checks if the current epoch is over
    /// @return True if the current epoch is over, false otherwise
    function _epochNeedsReset() private view returns (bool) {
        return block.timestamp >= lastEpochStartTime + EPOCH_DURATION;
    }

    /// -----------------------------------------------------------------------
    /// Volume functions
    /// -----------------------------------------------------------------------

    /// @dev Accumulates volume and updates epoch start time if current epoch is over.
    /// @param _volume The volume to be accumulated.
    function _accumulateVolume(uint256 _volume) internal {
        // Epoch start time in future, do not accumulate volume until epoch starts.
        // Allows for setting epoch start time to a future time for configuration flexibility.
        if (block.timestamp < initialEpochStartTime) {
            return;
        }

        if (_epochNeedsReset()) {
            _resetEpoch();
        }

        // Add the volume to lifetime cumulative volume
        lifetimeCumulativeVolume += _volume;
        emit AccumulateVolume(_volume, lifetimeCumulativeVolume, epochStartCumulativeVolume, lastEpochStartTime);
    }
}

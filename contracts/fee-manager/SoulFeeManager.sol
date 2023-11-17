// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";

import {ISoulFeeManager} from "./ISoulFeeManager.sol";

/**
 * @title SoulFeeManager_Interface
 * @dev This contract is an interface for the SoulFeeManager. It includes a function for getting the fee based on epoch volume.
 * @author Soul Solidity - Contact for mainnet licensing until 730 days after first deployment transaction with matching bytecode.
 * Otherwise feel free to experiment locally or on testnets.
 */
contract SoulFeeManager is ISoulFeeManager, AccessManaged {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _validFeeTokens;
    address private _feeCollector;

    /// @dev Represents the fee under the given volume threshold.
    struct VolumeFeeThreshold {
        uint256 volume;
        uint256 fee;
    }
    /// @dev Assumes the volume fee thresholds are in ascending order. Final element assumes infinite volume
    VolumeFeeThreshold[] public volumeFeeThresholds;

    uint256 public FEE_DENOMINATOR = 10_000;
    /// @dev The maximum fee is 3%
    uint256 public MAX_FEE = (FEE_DENOMINATOR * 3) / 100;

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event SoulFeeManager_FeeTokenAdded(address feeToken);
    event SoulFeeManager_FeeTokenRemoved(address feeToken);

    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    error SoulFeeManager_InvalidFeeToken();
    error SoulFeeManager_InvalidFeeCollector();
    error SoulFeeManager_NoFeeTokensAdded();

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(
        address[] memory _feeTokens,
        address __feeCollector,
        address _accessManager
    ) AccessManaged(_accessManager) {
        _addValidFeeTokens(_feeTokens);
        if (__feeCollector == address(0)) {
            revert SoulFeeManager_InvalidFeeCollector();
        }
        _feeCollector = __feeCollector;

        // FIXME: Placeholder for full implementation of fee thresholds
        VolumeFeeThreshold memory volumeFeeThreshold = VolumeFeeThreshold({volume: 0, fee: 300});
        volumeFeeThresholds.push(volumeFeeThreshold);
    }

    // TODO: In Zap it's measuring fee volume, so I'm thinking we should just switch to fee volume
    function getFee(uint256 epochFeeVolume) external view returns (uint256 fee) {
        // FIXME: Placeholder for full implementation of fee thresholds
        return volumeFeeThresholds[0].volume;
    }

    function getFeeCollector() external view returns (address feeCollector) {
        return _feeCollector;
    }

    /// -----------------------------------------------------------------------
    /// Fee Token Management
    /// -----------------------------------------------------------------------

    function getFeeToken(uint256 index) external view override returns (address token) {
        return _validFeeTokens.at(index);
    }

    /**
     * @notice This function returns the valid fee tokens.
     * @dev Warning: This function should not be used in state changing functions as it could be an unbounded length.
     * @return tokens An array of addresses representing the valid fee tokens.
     */
    function getFeeTokens() external view override returns (address[] memory tokens) {
        return _validFeeTokens.values();
    }

    function getFeeTokensLength() external view override returns (uint256 length) {
        return _validFeeTokens.length();
    }

    function isFeeToken(address _token) external view override returns (bool valid) {
        return _validFeeTokens.contains(_token);
    }

    function _addValidFeeTokens(address[] memory _newValidFeeTokens) internal {
        bool feeTokenAdded = false;
        for (uint256 i = 0; i < _newValidFeeTokens.length; i++) {
            address newFeeToken = _newValidFeeTokens[i];
            if (newFeeToken == address(0)) {
                revert SoulFeeManager_InvalidFeeToken();
            }
            bool currentTokenAdded = _validFeeTokens.add(newFeeToken);
            // Set feeTokenAdded to tokenAdded if false, otherwise leave it as true
            if (currentTokenAdded) {
                feeTokenAdded = true;
                emit SoulFeeManager_FeeTokenAdded(newFeeToken);
            }
        }
        if (!feeTokenAdded) {
            revert SoulFeeManager_NoFeeTokensAdded();
        }
    }
}

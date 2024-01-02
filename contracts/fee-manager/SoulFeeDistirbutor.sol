// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.19;

/// -----------------------------------------------------------------------
/// Package Imports
/// -----------------------------------------------------------------------
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// -----------------------------------------------------------------------
/// Local Imports
/// -----------------------------------------------------------------------
import {SoulAccessManagedUpgradeable} from "../access/SoulAccessManagedUpgradeable.sol";
import {Constants} from "../utils/Constants.sol";
import {IWETH} from "../lib/IWETH.sol";

/// @title SoulFeeDistributor
/// @notice Distributes earned fees to beneficiaries.
/// Important Registry Roles:
/// 1. FEE_MANAGER_ROLE: Can set beneficiary allocations.
/// 2. SOUL_DISTRIBUTOR_ROLE: Can distribute fees.
contract SoulFeeDistributor is SoulAccessManagedUpgradeable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

    address wrappedNative;
    uint256 public totalAllocationPoints;
    EnumerableSet.AddressSet private _beneficiaries;
    mapping(address => uint256) private _beneficiaryAllocationPoints;

    /// -----------------------------------------------------------------------
    /// Roles
    /// -----------------------------------------------------------------------

    bytes32 public FEE_MANAGER_ROLE = _getRoleHash("FEE_MANAGER_ROLE");

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event Distribution(address indexed beneficiary, address indexed token, uint256 amount);
    event DistributionNative(address indexed beneficiary, uint256 amount);
    event BeneficiaryAdded(address indexed beneficiary, uint256 allocationPoints, uint256 totalAllocationPoints);
    event BeneficiaryUpdated(address indexed beneficiary, uint256 allocationPoints, uint256 totalAllocationPoints);
    event BeneficiaryRemoved(address indexed beneficiary, uint256 totalAllocationPoints);

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor() {
        /// @dev Prevents implementation from being initialized.
        _disableInitializers();
    }

    function initialize(
        address _accessRegistry,
        address[] memory __beneficiaries,
        uint256[] memory _allocationPoints,
        address _wrappedNative
    ) external initializer {
        __SoulAccessManaged_init(_accessRegistry);
        /// @dev Initialize FEE_MANAGER_ROLE on proxy
        FEE_MANAGER_ROLE = _getRoleHash("FEE_MANAGER_ROLE");
        // Setup beneficiaries
        require(
            __beneficiaries.length == _allocationPoints.length,
            "beneficiaries and allocation points length mismatch"
        );
        for (uint256 i = 0; i < __beneficiaries.length; i++) {
            _setBeneficiaryAllocation(__beneficiaries[i], _allocationPoints[i]);
        }

        wrappedNative = _wrappedNative;
    }

    /// @notice Fallback function to allow the contract to receive native currency
    receive() external payable {}

    /// -----------------------------------------------------------------------
    /// Modifiers
    /// -----------------------------------------------------------------------

    modifier onlyDistributors() {
        require(
            _beneficiaries.contains(msg.sender) ||
                _hasAccessRegistryRole(FEE_MANAGER_ROLE, msg.sender) ||
                _hasAccessRegistryRoleName("ADMIN_ROLE", msg.sender) ||
                _hasAccessRegistryRoleName("SOUL_DISTRIBUTOR_ROLE", msg.sender),
            "Unauthorized"
        );
        _;
    }

    /// -----------------------------------------------------------------------
    /// Beneficiary functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Sets the allocation points for a beneficiary.
     * @param _beneficiary The address of the beneficiary.
     * @param _allocationPoints The allocation points for the beneficiary.
     * - Setting the allocation points to 0 will remove the beneficiary.
     * - Setting the allocation points to a non-zero value will add the beneficiary if they are not already added.
     */
    function setBeneficiaryAllocation(
        address _beneficiary,
        uint256 _allocationPoints
    ) external onlyAccessRegistryRole(FEE_MANAGER_ROLE) {
        _setBeneficiaryAllocation(_beneficiary, _allocationPoints);
    }

    function _setBeneficiaryAllocation(address _beneficiary, uint256 _allocationPoints) private {
        if (_allocationPoints > 0) {
            bool isNewBeneficiary = _beneficiaries.add(_beneficiary);
            // Adjust the total allocation points accordingly
            totalAllocationPoints =
                totalAllocationPoints +
                _allocationPoints -
                _beneficiaryAllocationPoints[_beneficiary];
            _beneficiaryAllocationPoints[_beneficiary] = _allocationPoints;
            if (isNewBeneficiary) {
                emit BeneficiaryAdded(_beneficiary, _allocationPoints, totalAllocationPoints);
            } else {
                emit BeneficiaryUpdated(_beneficiary, _allocationPoints, totalAllocationPoints);
            }
        } else {
            // Remove beneficiary
            require(_beneficiaries.remove(_beneficiary), "Beneficiary not whitelisted");
            totalAllocationPoints -= _beneficiaryAllocationPoints[_beneficiary];
            delete _beneficiaryAllocationPoints[_beneficiary];
            emit BeneficiaryRemoved(_beneficiary, totalAllocationPoints);
        }
    }

    /**
     * @notice Gets the beneficiary information at a specific index.
     * @param _index The index of the beneficiary in the list.
     * @return beneficiary The address of the beneficiary.
     * @return allocationPoints The number of allocation points for the beneficiary.
     * @return percentage The percentage of total allocation points owned by the beneficiary.
     */
    function getBeneficiaryAtIndex(
        uint256 _index
    ) public view returns (address beneficiary, uint256 allocationPoints, uint256 percentage) {
        require(_index < getTotalBeneficiaries(), "Index out of bounds");
        beneficiary = _beneficiaries.at(_index);
        allocationPoints = _beneficiaryAllocationPoints[beneficiary];
        percentage = (allocationPoints * 1e18) / totalAllocationPoints; // Percentage as a fraction of 1e18
        return (beneficiary, allocationPoints, percentage);
    }

    /**
     * @notice Gets the total number of beneficiaries.
     * @return The total number of beneficiaries.
     */
    function getTotalBeneficiaries() public view returns (uint256) {
        return _beneficiaries.length();
    }

    /// -----------------------------------------------------------------------
    /// Distribution functions
    /// -----------------------------------------------------------------------

    /**
     * @notice Distributes the balance of the tokens provided to all beneficiaries.
     * @param tokenAddresses The addresses of the tokens to distribute.
     */
    function distributeFees(address[] calldata tokenAddresses) external onlyDistributors nonReentrant {
        bool atLeastOneTransfer = false;

        for (uint256 i = 0; i < tokenAddresses.length; i++) {
            bool nativeTransfer = false;
            IERC20 token = IERC20(tokenAddresses[i]);
            uint256 balance = 0;
            if (address(token) == address(0) || address(token) == Constants.NATIVE_ADDRESS) {
                // Handle native currency
                balance = address(this).balance;
                nativeTransfer = true;
            } else {
                // Handle ERC20 tokens
                balance = token.balanceOf(address(this));
                if (address(token) == wrappedNative) {
                    // Handle wrapped native currency
                    IWETH(wrappedNative).withdraw(balance);
                    nativeTransfer = true;
                }
            }

            if (balance == 0) {
                continue;
            }

            uint256 totalBeneficiaries = getTotalBeneficiaries();
            for (uint256 j = 0; j < totalBeneficiaries; j++) {
                (address beneficiary, uint256 allocationPoints, ) = getBeneficiaryAtIndex(j);
                uint256 distributionAmount = (balance * allocationPoints) / totalAllocationPoints;
                if (distributionAmount > 0) {
                    if (nativeTransfer) {
                        (bool success, ) = beneficiary.call{value: distributionAmount, gas: 4899}("");
                        require(success, "native transfer error");
                        emit DistributionNative(beneficiary, distributionAmount);
                    } else {
                        token.safeTransfer(beneficiary, distributionAmount);
                        emit Distribution(beneficiary, address(token), distributionAmount);
                    }
                    atLeastOneTransfer = true;
                }
            }
        }

        require(atLeastOneTransfer, "No funds were distributed");
    }
}

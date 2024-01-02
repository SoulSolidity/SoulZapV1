// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.19;

/*
 ██████╗ █████╗ ██╗   ██╗██╗        ██████╗ █████╗ ██╗     ██╗██████╗ ██╗████████╗██╗   ██╗
██╔════╝██╔══██╗██║   ██║██║       ██╔════╝██╔══██╗██║     ██║██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝
╚█████╗ ██║  ██║██║   ██║██║       ╚█████╗ ██║  ██║██║     ██║██║  ██║██║   ██║    ╚████╔╝ 
 ╚═══██╗██║  ██║██║   ██║██║        ╚═══██╗██║  ██║██║     ██║██║  ██║██║   ██║     ╚██╔╝  
██████╔╝╚█████╔╝╚██████╔╝███████╗  ██████╔╝╚█████╔╝███████╗██║██████╔╝██║   ██║      ██║   
╚═════╝  ╚════╝  ╚═════╝ ╚══════╝  ╚═════╝  ╚════╝ ╚══════╝╚═╝╚═════╝ ╚═╝   ╚═╝      ╚═╝   

 * Twitter: https://twitter.com/SoulSolidity
 *  GitHub: https://github.com/SoulSolidity
 *     Web: https://SoulSolidity.com
 */

import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";
import {ISoulAccessManaged} from "./ISoulAccessManaged.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/// @title SoulAccessManaged
/// @notice Use this contract in place of Ownable if you want to use the SoulAccessRegistry to manage access permissions.
/// @custom:version 1.0.1
contract SoulAccessManagedUpgradeable is ISoulAccessManaged, Initializable {
    address public soulAccessRegistry;

    error SoulAccessUnauthorized();

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor() {
        /// @dev Prevent the implementation from being initialized.
        _disableInitializers();
    }

    function __SoulAccessManaged_init(address _accessRegistryAddress) public onlyInitializing {
        soulAccessRegistry = _accessRegistryAddress;
    }

    /// -----------------------------------------------------------------------
    /// Modifiers
    /// -----------------------------------------------------------------------

    /**
     * @dev Modifier to make a function callable only by accounts with a specific role in the SoulAccessRegistry.
     * @param roleName The name of the role to check.
     * Reverts with a SoulAccessUnauthorizedAccount error if the calling account does not have the role.
     */
    modifier onlyAccessRegistryRoleName(string memory roleName) {
        if (!_hasAccessRegistryRole(_getRoleHash(roleName), msg.sender)) {
            revert SoulAccessUnauthorized();
        }
        _;
    }

    /**
     * @dev Modifier to make a function callable only by accounts with a specific role in the SoulAccessRegistry.
     * @param role The hash of the role to check.
     * Reverts with a SoulAccessUnauthorizedAccount error if the calling account does not have the role.
     */
    modifier onlyAccessRegistryRole(bytes32 role) {
        if (!_hasAccessRegistryRole(role, msg.sender)) {
            revert SoulAccessUnauthorized();
        }
        _;
    }

    /// -----------------------------------------------------------------------
    /// Internal functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Generates a hash for a role name to be used within the SoulAccessRegistry.
     * @param role The name of the role.
     * @return bytes32 The hash of the role name.
     */
    function _getRoleHash(string memory role) internal pure returns (bytes32) {
        return keccak256(bytes(role));
    }

    /**
     * @dev Checks if an account has a specific role in the SoulAccessRegistry by role name.
     * @param roleName The name of the role to check.
     * @param account The address of the account to check.
     * @return bool True if the account has the role, false otherwise.
     */
    function _hasAccessRegistryRoleName(string memory roleName, address account) internal view returns (bool) {
        bytes32 roleHash = _getRoleHash(roleName);
        return _hasAccessRegistryRole(roleHash, account);
    }

    /**
     * @dev Checks if an account has a specific role in the SoulAccessRegistry.
     * @param role The hash of the role to check.
     * @param account The address of the account to check.
     * @return bool True if the account has the role, false otherwise.
     */
    function _hasAccessRegistryRole(bytes32 role, address account) internal view returns (bool) {
        return IAccessControl(soulAccessRegistry).hasRole(role, account);
    }
}

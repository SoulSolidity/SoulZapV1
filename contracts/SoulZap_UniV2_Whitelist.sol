// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

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

/// -----------------------------------------------------------------------
/// Package Imports
/// -----------------------------------------------------------------------
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

/// -----------------------------------------------------------------------
/// Local Imports
/// -----------------------------------------------------------------------
import {SoulAccessManaged} from "./access/SoulAccessManaged.sol";

/// @title SoulZap_UniV2_Whitelist
/// @notice This contract extension requires specific role setup to manage the whitelist of Bond NFTs.
/// The roles are managed through the SoulAccessManaged contract and are critical for the
/// security and proper administration of the whitelist functionality.
abstract contract SoulZap_UniV2_Whitelist is SoulAccessManaged {
    using EnumerableSet for EnumerableSet.AddressSet;

    EnumerableSet.AddressSet private _whitelistedRouters;

    event RouterWhitelisted(address indexed router, bool whitelisted);

    /// @notice Add or remove a router from the whitelist
    /// @dev This function allows adding or removing a router from the whitelist.
    /// @param _router The address of the router to be added or removed
    /// @param _isWhitelisted True to add the router to the whitelist, false to remove it
    function setRouterWhitelist(
        address _router,
        bool _isWhitelisted
    ) external onlyAccessRegistryRoleName("SOUL_ZAP_ADMIN_ROLE") {
        if (_isWhitelisted) {
            require(_whitelistedRouters.add(_router), "Router already whitelisted");
            emit RouterWhitelisted(_router, true);
        } else {
            require(_whitelistedRouters.remove(_router), "Router not whitelisted");
            emit RouterWhitelisted(_router, false);
        }
    }

    /// @notice Check if a router is whitelisted
    /// @dev This function checks if a router is whitelisted.
    /// @param _router The address of the router to check
    /// @return true if the router is whitelisted, false otherwise
    function isRouterWhitelisted(address _router) public view returns (bool) {
        return _whitelistedRouters.contains(_router);
    }

    /// @notice Get the count of whitelisted routers
    /// @dev This function returns the count of whitelisted routers.
    /// @return the count of whitelisted routers
    function getWhitelistedRouterCount() public view returns (uint256) {
        return _whitelistedRouters.length();
    }

    /// @notice Get the whitelisted router at a specific index
    /// @dev This function returns the whitelisted router at the specified index.
    /// @param _index The index of the whitelisted router to retrieve
    /// @return the address of the whitelisted router at the specified index
    function getWhitelistedRouterAtIndex(uint256 _index) public view returns (address) {
        require(_index < _whitelistedRouters.length(), "Index out of bounds");
        return _whitelistedRouters.at(_index);
    }
}

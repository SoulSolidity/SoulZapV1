// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.23;

import {AccessManager} from "@openzeppelin/contracts/access/manager/AccessManager.sol";

/**
 * @title SoulAccessManager
 * @notice A contract for managing protocol access from a single point.
 * @dev Managed contracts must implement AccessManaged to fully utilize this contract.
 * docs: https://docs.openzeppelin.com/contracts/5.x/api/access#AccessManager
 */
contract SoulAccessManager is AccessManager {
    constructor(address _initialAdmin) AccessManager(_initialAdmin) {}
}

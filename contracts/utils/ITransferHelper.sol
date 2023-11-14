// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

import {IWETH} from "../lib/IWETH.sol";

interface ITransferHelper {
    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------
    function WNATIVE() external view returns (IWETH);
}

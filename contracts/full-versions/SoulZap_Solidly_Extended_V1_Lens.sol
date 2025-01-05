// SPDX-License-Identifier: BUSL-1.1
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

// External package imports
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Internal route directory imports
import {IRouterV2} from "../lib/IRouterV2.sol";
import {ISoulFeeManager} from "../fee-manager/ISoulFeeManager.sol";
import {SoulZap_Solidly_Lens} from "../SoulZap_Solidly_Lens.sol";
import {SoulZap_Solidly} from "../SoulZap_Solidly.sol";
import {SoulZap_Ext_ApeBond_Lens_Solidly} from "../extensions/ApeBond/SoulZap_Ext_ApeBond_Lens_Solidly.sol";

/**
 * @title SoulZap_Solidly_Extended_V1
 * @dev This contract is an implementation of ISoulZap interface. It includes functionalities for zapping in and out of
 * UniswapV2 type liquidity pools.
 * @notice This contract has the following features:
 * 1. UniswapV2 Zap In
 * 2. Deposit into ApeBond, Bond contracts.
 * @author Soul Solidity - Contact for mainnet licensing until 730 days after first deployment transaction with matching bytecode.
 * Otherwise feel free to experiment locally or on testnets.
 */
contract SoulZap_Solidly_Extended_V1_Lens is SoulZap_Solidly_Lens, SoulZap_Ext_ApeBond_Lens_Solidly {
    constructor(
        SoulZap_Solidly _soulZap,
        IRouterV2 _router,
        address[] memory _hopTokens
    ) SoulZap_Solidly_Lens(_soulZap, _router, _hopTokens) SoulZap_Ext_ApeBond_Lens_Solidly() {}
}

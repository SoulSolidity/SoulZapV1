// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

/*
 ██████╗ █████╗ ██╗   ██╗██╗        ██████╗ █████╗ ██╗     ██╗██████╗ ██╗████████╗██╗   ██╗
██╔════╝██╔══██╗██║   ██║██║       ██╔════╝██╔══██╗██║     ██║██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝
╚█████╗ ██║  ██║██║   ██║██║       ╚█████╗ ██║  ██║██║     ██║██║  ██║██║   ██║    ╚████╔╝ 
 ╚═══██╗██║  ██║██║   ██║██║        ╚═══██╗██║  ██║██║     ██║██║  ██║██║   ██║     ╚██╔╝  
██████╔╝╚█████╔╝╚██████╔╝███████╗  ██████╔╝╚█████╔╝███████╗██║██████╔╝██║   ██║      ██║   
╚═════╝  ╚════╝  ╚═════╝ ╚══════╝  ╚═════╝  ╚════╝ ╚══════╝╚═╝╚═════╝ ╚═╝   ╚═╝      ╚═╝   

 * Twitter: https://twitter.com/SoulSolidity
 * GitHub: https://github.com/SoulSolidity
 */

import {IAccessManaged} from "@openzeppelin/contracts/access/manager/IAccessManaged.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ISoulFeeManager} from "./fee-manager/ISoulFeeManager.sol";

import {ITransferHelper} from "./utils/ITransferHelper.sol";
import {IEpochVolumeTracker} from "./utils/IEpochVolumeTracker.sol";

interface ISoulZap_UniV2 is IAccessManaged, ITransferHelper, IEpochVolumeTracker {
    /// -----------------------------------------------------------------------
    /// Swap Path
    /// -----------------------------------------------------------------------

    enum SwapType {
        V2
    }

    struct SwapPath {
        address swapRouter;
        SwapType swapType;
        address[] path;
        uint256 amountOutMin;
    }

    //// -----------------------------------------------------------------------
    /// Liquidity Path
    /// -----------------------------------------------------------------------

    enum LPType {
        V2
    }

    struct LiquidityPath {
        address lpRouter;
        LPType lpType;
        uint256 minAmountLP0;
        uint256 minAmountLP1;
    }

    /// -----------------------------------------------------------------------
    /// Swap Params
    /// -----------------------------------------------------------------------

    struct SwapParams {
        IERC20 inputToken;
        uint256 inputAmount;
        address token;
        SwapPath path;
        address to;
        uint256 deadline;
    }

    /// -----------------------------------------------------------------------
    /// Zap Params
    /// -----------------------------------------------------------------------

    struct ZapParams {
        IERC20 inputToken;
        uint256 inputAmount;
        address token0;
        address token1;
        SwapPath path0;
        SwapPath path1;
        LiquidityPath liquidityPath;
        address to;
        uint256 deadline;
    }

    /// -----------------------------------------------------------------------
    /// Storage Variables
    /// -----------------------------------------------------------------------

    function soulFeeManager() external view returns (ISoulFeeManager);

    function getFeePercentage() external view returns (uint256 fee);

    function getFeeToken(uint256 _index) external view returns (address feeToken);

    function getFeeTokensLength() external view returns (uint256 length);

    /// -----------------------------------------------------------------------
    /// Functions
    /// -----------------------------------------------------------------------

    function swap(SwapParams memory swapParams, SwapPath memory feeSwapPath) external payable;

    function zap(ZapParams memory zapParams, SwapPath memory feeSwapPath) external payable;
}

// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

/*
   ▄████████  ▄██████▄  ███    █▄   ▄█                                      
  ███    ███ ███    ███ ███    ███ ███                                      
  ███    █▀  ███    ███ ███    ███ ███                                      
  ███        ███    ███ ███    ███ ███                                      
  ██████████ ███    ███ ███    ███ ███                                      
         ███ ███    ███ ███    ███ ███                                      
   ▄█    ███ ███    ███ ███    ███ ███     ▄                                
 ▄████████▀   ▀██████▀  ████████▀  █████████                                
                                                                           
   ▄████████  ▄██████▄   ▄█        ▄█  ████████▄   ▄█      ███      ▄██   █▄  
  ███    ███ ███    ███ ███       ███  ███   ▀███ ███ ▀███████████▄ ███   ███
  ███    █▀  ███    ███ ███       ███  ███    ███ ███   ▀▀▀███▀▀▀▀▀ ███▄▄▄███
  ███        ███    ███ ███       ███  ███    ███ ███      ███      ▀▀▀▀▀▀███
  ██████████ ███    ███ ███       ███  ███    ███ ███      ███      ▄██   ███
         ███ ███    ███ ███       ███  ███    ███ ███      ███      ███   ███
   ▄█    ███ ███    ███ ███     ▄ ███  ███   ▄███ ███      ███      ███   ███
 ▄████████▀   ▀██████▀  █████████ █▀   ████████▀  █▀      ▄███       ▀█████▀    

 * App:             https:// TODO
 * Medium:          https:// TODO
 * Twitter:         https:// TODO
 * Discord:         https:// TODO
 * Telegram:        https:// TODO
 * Announcements:   https:// TODO
 * GitHub:          https:// TODO
 */

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./extensions/ApeBond/lib/ICustomBillRefillable.sol";

interface ISoulZap_UniV2 {
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
    /// Zap Params
    /// -----------------------------------------------------------------------

    struct ZapParams {
        IERC20 inputToken;
        uint256 inputAmount;
        /// @dev Common interface below between ZapParamsNative
        address token0;
        address token1;
        SwapPath path0;
        SwapPath path1;
        LiquidityPath liquidityPath;
        address to;
        uint256 deadline;
    }

    struct ZapParamsNative {
        address token0;
        address token1;
        SwapPath path0;
        SwapPath path1;
        LiquidityPath liquidityPath;
        address to;
        uint256 deadline;
    }

    /// -----------------------------------------------------------------------
    /// Functions
    /// -----------------------------------------------------------------------

    function zap(ZapParams memory zapParams, SwapPath memory feeSwapPath) external;

    function zapNative(ZapParamsNative memory zapParamsNative, SwapPath memory feeSwapPath) external payable;

    /// -----------------------------------------------------------------------
    /// Helper Structs
    /// -----------------------------------------------------------------------

    struct LocalVars {
        uint256 amount0In;
        uint256 amount1In;
        uint256 amount0Out;
        uint256 amount1Out;
        uint256 amount0Lp;
        uint256 amount1Lp;
    }
}

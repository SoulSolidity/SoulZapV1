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

// TODO: ISoulZap_UniV2
interface ISoulZap {
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

    // TODO: comments
    // struct MinAmountsParams {
    //     IERC20 inputToken;
    //     uint256 inputAmount;
    //     address token0;
    //     address token1;
    //     SwapPath path0;
    //     SwapPath path1;
    //     LiquidityPath liquidityPath;
    // }

    /// -----------------------------------------------------------------------
    /// Functions
    /// -----------------------------------------------------------------------

    function zap(ZapParams memory zapParams) external;

    function zapNative(ZapParamsNative memory zapParamsNative) external payable;

    // TODO: comments
    // function getMinAmounts(
    //     MinAmountsParams memory params
    // ) external view returns (uint256[2] memory minAmountsSwap, uint256[2] memory minAmountsLP);
}

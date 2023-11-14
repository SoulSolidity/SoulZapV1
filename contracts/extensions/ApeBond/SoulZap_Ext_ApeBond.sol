// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

/// -----------------------------------------------------------------------
/// Package Imports (alphabetical)
/// -----------------------------------------------------------------------
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

/// -----------------------------------------------------------------------
/// Local Imports (alphabetical)
/// -----------------------------------------------------------------------
import {ICustomBillRefillable} from "./lib/ICustomBillRefillable.sol";
import {ISoulFeeManager} from "../../fee-manager/ISoulFeeManager.sol";
import {SoulZap_UniV2} from "../../SoulZap_UniV2.sol";

/**
 * @title SoulZap_Ext_ApeBond
 * @dev This contract extends the SoulZap_UniV2 contract with additional functionality for ApeBond.
 * @author Soul Solidity - Contact for mainnet licensing until 730 days after first deployment transaction with matching bytecode.
 * Otherwise feel free to experiment locally or on testnets.
 * @notice Do not use this contract for any tokens that do not have a standard ERC20 implementation.
 */
abstract contract SoulZap_Ext_ApeBond is SoulZap_UniV2 {
    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event ZapBond(ZapParams zapParams, ICustomBillRefillable bill, uint256 maxPrice);
    event ZapBondNative(ZapParams zapParams, ICustomBillRefillable bill, uint256 maxPrice);

    constructor() {}

    /// -----------------------------------------------------------------------
    /// External Functions
    /// -----------------------------------------------------------------------

    /// @notice Zap single token to ApeBond
    /// @param zapParams ISoulZap.ZapParams
    /// @param bill Treasury bill address
    /// @param maxPrice Max price of treasury bill
    function zapBond(
        ZapParams memory zapParams,
        SwapPath memory feeSwapPath,
        // TODO: Rebrand to `IApeBond bond`?
        ICustomBillRefillable bill,
        uint256 maxPrice
    ) external nonReentrant whenNotPaused {
        _zapBond(zapParams, false, feeSwapPath, bill, maxPrice);
    }

    /// @notice Zap native token to Treasury Bill
    /// @param zapParamsNative ISoulZap.ZapParamsNative
    /// @param bill Treasury bill address
    /// @param maxPrice Max price of treasury bill
    function zapBondNative(
        ZapParamsNative memory zapParamsNative,
        SwapPath memory feeSwapPath,
        ICustomBillRefillable bill,
        uint256 maxPrice
    ) external payable nonReentrant whenNotPaused {
        (IERC20 wNative, uint256 inputAmount) = _wrapNative();

        ZapParams memory zapParams = ZapParams({
            inputToken: wNative,
            inputAmount: inputAmount,
            token0: zapParamsNative.token0,
            token1: zapParamsNative.token1,
            path0: zapParamsNative.path0,
            path1: zapParamsNative.path1,
            liquidityPath: zapParamsNative.liquidityPath,
            to: zapParamsNative.to,
            deadline: zapParamsNative.deadline
        });

        _zapBond(zapParams, true, feeSwapPath, bill, maxPrice);
    }

    /// -----------------------------------------------------------------------
    /// Private Functions
    /// -----------------------------------------------------------------------

    function _zapBond(
        ZapParams memory zapParams,
        bool native,
        SwapPath memory feeSwapPath,
        ICustomBillRefillable bill,
        uint256 maxPrice
    ) private {
        IUniswapV2Pair pair = IUniswapV2Pair(bill.principalToken());
        // TODO: Will need to expand this because bonds can technically be any token, not just LPs
        require(
            (zapParams.token0 == pair.token0() && zapParams.token1 == pair.token1()) ||
                (zapParams.token1 == pair.token0() && zapParams.token0 == pair.token1()),
            "ApeBond: Wrong LP pair for Bond"
        );
        address to = zapParams.to;
        zapParams.to = address(this);
        _zap(zapParams, native, feeSwapPath);

        uint256 balance = pair.balanceOf(address(this));
        pair.approve(address(bill), balance);
        bill.deposit(balance, maxPrice, to);
        pair.approve(address(bill), 0);

        if (native) {
            emit ZapBondNative(zapParams, bill, maxPrice);
        } else {
            emit ZapBond(zapParams, bill, maxPrice);
        }
    }
}

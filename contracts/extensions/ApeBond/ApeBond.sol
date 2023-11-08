// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SoulZap_UniV2} from "../../SoulZap.sol";
import "./lib/ICustomBillRefillable.sol";
// TODO: Use official Uniswap Interfaces
import "../../lib/IApeRouter02.sol";
import "../../lib/IApePair.sol";

// TODO: Need this?
// import {ISoulFeeManager} from "../../fee-manager/ISoulFeeManager.sol";

// TODO: Update name to SoulZap_ApeBond.sol
abstract contract SoulZapExt_ApeBond is SoulZap_UniV2 {
    event ZapBond(ZapParams zapParams, ICustomBillRefillable bill, uint256 maxPrice);
    event ZapBondNative(ZapParams zapParams, ICustomBillRefillable bill, uint256 maxPrice);
    // TODO: Pausing may be overkill for extensions, but it could be cool to have a feature based pause mechanism in SoulZap
    // ex: `const APE_BOND_ZAP_UNIV2_FEATURE = APE_BOND_ZAP_UNIV2`
    bool public apeBondPaused = false;

    constructor() {}

    modifier whenNotPausedApeBond() {
        require(!paused() && !apeBondPaused, "Paused");
        _;
    }

    function pauseApeBond() public restricted {
        apeBondPaused = true;
    }

    function unpauseApeBond() public restricted {
        apeBondPaused = false;
    }

    /// @notice Zap single token to ApeBond
    /// @param zapParams ISoulZap.ZapParams
    /// @param bill Treasury bill address
    /// @param maxPrice Max price of treasury bill
    function zapBond(
        ZapParams memory zapParams,
        // TODO: Rebrand to `IApeBond bond`?
        ICustomBillRefillable bill,
        uint256 maxPrice
    ) external nonReentrant whenNotPausedApeBond {
        _zapBond(zapParams, false, bill, maxPrice);
    }

    /// @notice Zap native token to Treasury Bill
    /// @param zapParamsNative ISoulZap.ZapParamsNative
    /// @param bill Treasury bill address
    /// @param maxPrice Max price of treasury bill
    function zapBondNative(
        ZapParamsNative memory zapParamsNative,
        ICustomBillRefillable bill,
        uint256 maxPrice
    ) external payable nonReentrant whenNotPausedApeBond {
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

        _zapBond(zapParams, true, bill, maxPrice);
    }

    function _zapBond(ZapParams memory zapParams, bool native, ICustomBillRefillable bill, uint256 maxPrice) private {
        IApePair pair = IApePair(bill.principalToken());
        // TODO: Will need to expand this because bonds can technically be any token, not just LPs
        require(
            (zapParams.token0 == pair.token0() && zapParams.token1 == pair.token1()) ||
                (zapParams.token1 == pair.token0() && zapParams.token0 == pair.token1()),
            "ApeBond: Wrong LP pair for Bond"
        );
        address to = zapParams.to;
        zapParams.to = address(this);
        // TODO: getEpochVolume() is experimental. Volume is currently not yet tracked
        _zap(zapParams, native, soulFeeManager.getFee(getEpochVolume()));

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

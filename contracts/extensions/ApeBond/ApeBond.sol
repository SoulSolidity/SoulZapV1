// SPDX-License-Identifier: GPL-3.0-only
pragma solidity ^0.8.0;

import "../../SoulZap.sol";
import "./lib/ICustomBillRefillable.sol";
import "../../lib/IApeRouter02.sol";
import "../../lib/ISoulZap.sol";
import "../../SoulFee.sol";

abstract contract ApeBond is SoulZap {
    event ZapBond(ZapParamsBond zapParamsBond);
    event ZapBondNative(ZapParamsBondNative zapParamsBondNative);
    bool public apeBondPaused = false;

    constructor() {}

    modifier whenNotPausedApeBond() {
        require(!paused() && !apeBondPaused, "Paused");
        _;
    }

    function pauseApeBond() public onlyOwner {
        apeBondPaused = true;
    }

    function unpauseApeBond() public onlyOwner {
        apeBondPaused = false;
    }

    /// @notice Zap single token to LP
    /// @param zapParamsBond all parameters for Bond zap
    /// inputToken Input token to zap
    /// inputAmount Amount of input tokens to zap
    /// underlyingTokens Tokens of LP to zap to
    /// paths Path from input token to LP token0
    /// minAmounts The minimum amount of output tokens that must be received for
    ///   swap and AmountAMin and amountBMin for adding liquidity
    /// deadline Unix timestamp after which the transaction will revert
    /// bill Treasury bill address
    /// maxPrice Max price of treasury bill
    function zapBond(ZapParamsBond memory zapParamsBond) external nonReentrant whenNotPausedApeBond {
        IApePair pair = IApePair(zapParamsBond.bill.principalToken());
        require(
            (zapParamsBond.zapParams.token0 == pair.token0() && zapParamsBond.zapParams.token1 == pair.token1()) ||
                (zapParamsBond.zapParams.token1 == pair.token0() && zapParamsBond.zapParams.token0 == pair.token1()),
            "ApeBond: Wrong LP pair for Bond"
        );
        address to = zapParamsBond.zapParams.to;
        zapParamsBond.zapParams.to = address(this);
        _zapInternal(zapParamsBond.zapParams, soulFee.getFee("apebond-bond-zap"));

        uint256 balance = pair.balanceOf(address(this));
        pair.approve(address(zapParamsBond.bill), balance);
        zapParamsBond.bill.deposit(balance, zapParamsBond.maxPrice, to);
        pair.approve(address(zapParamsBond.bill), 0);
        emit ZapBond(zapParamsBond);
    }

    /// @notice Zap native token to Treasury Bill
    /// @param zapParamsBondNative all parameters for native Bond zap
    /// underlyingTokens Tokens of LP to zap to
    /// paths Path from input token to LP token0
    /// minAmounts The minimum amount of output tokens that must be received for
    ///   swap and AmountAMin and amountBMin for adding liquidity
    /// deadline Unix timestamp after which the transaction will revert
    /// bill Treasury bill address
    /// maxPrice Max price of treasury bill
    function zapBondNative(
        ZapParamsBondNative memory zapParamsBondNative
    ) external payable nonReentrant whenNotPausedApeBond {
        IApePair pair = IApePair(zapParamsBondNative.bill.principalToken());
        require(
            (zapParamsBondNative.zapParamsNative.token0 == pair.token0() &&
                zapParamsBondNative.zapParamsNative.token1 == pair.token1()) ||
                (zapParamsBondNative.zapParamsNative.token1 == pair.token0() &&
                    zapParamsBondNative.zapParamsNative.token0 == pair.token1()),
            "ApeBond: Wrong LP pair for Bond"
        );
        address to = zapParamsBondNative.zapParamsNative.to;
        zapParamsBondNative.zapParamsNative.to = address(this);
        _zapNativeInternal(zapParamsBondNative.zapParamsNative, soulFee.getFee("apebond-bond-zap"));

        uint256 balance = pair.balanceOf(address(this));
        pair.approve(address(zapParamsBondNative.bill), balance);
        zapParamsBondNative.bill.deposit(balance, zapParamsBondNative.maxPrice, to);
        pair.approve(address(zapParamsBondNative.bill), 0);
        emit ZapBondNative(zapParamsBondNative);
    }
}

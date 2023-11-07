// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "../../SoulZap_Lens.sol";
import "../../../lib/ISoulZap.sol";
import "../../../extensions/ApeBond/lib/ICustomBillRefillable.sol";
import "../../../extensions/ApeBond/ApeBond.sol";
import "hardhat/console.sol";
import "../../../SoulFee.sol";

abstract contract ApeBond_Lens is SoulZap_Lens {
    bytes4 private constant ZAPBONDNATIVE_SELECTOR = ApeBond.zapBondNative.selector;
    bytes4 private constant ZAPBOND_SELECTOR = ApeBond.zapBond.selector;

    /**
     * @dev Get the Zap data for a bond transaction with a native token.
     * @param amount The amount of tokens to zap.
     * @param bill The custom bill refillable contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return params ZapParamsBondNative structure containing relevant data.
     * @return encodedParams Encoded ZapParamsBondNative structure.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return priceImpactPercentage0 The price impact percentage for token0.
     * @return priceImpactPercentage1 The price impact percentage for token1.
     */
    function getZapDataBondNative(
        uint256 amount,
        ICustomBillRefillable bill,
        uint256 slippage, // 1 = 0.01%, 100 = 1%
        address to
    )
        public
        view
        returns (
            ISoulZap.ZapParamsBondNative memory params,
            bytes memory encodedParams,
            bytes memory encodedTx,
            uint256 priceImpactPercentage0,
            uint256 priceImpactPercentage1
        )
    {
        ISoulZap.ZapParamsBond memory tempParams;
        (tempParams, priceImpactPercentage0, priceImpactPercentage1) = getZapDataBondInternal(
            WNATIVE,
            amount,
            bill,
            slippage,
            to
        );
        ISoulZap.ZapParamsNative memory zapParamsNative = ISoulZap.ZapParamsNative({
            token0: tempParams.zapParams.token0,
            token1: tempParams.zapParams.token1,
            path0: tempParams.zapParams.path0,
            path1: tempParams.zapParams.path1,
            liquidityPath: tempParams.zapParams.liquidityPath,
            to: to,
            deadline: block.timestamp + 100_000_000_000
        });
        params = ISoulZap.ZapParamsBondNative({
            zapParamsNative: zapParamsNative,
            bill: bill,
            maxPrice: tempParams.maxPrice
        });
        encodedParams = abi.encode(params);
        encodedTx = abi.encodeWithSelector(ZAPBONDNATIVE_SELECTOR, params);
    }

    /**
     * @dev Get the Zap data for a bond transaction with a specified token.
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param bill The custom bill refillable contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return params ZapParamsBond structure containing relevant data.
     * @return encodedParams Encoded ZapParamsBond structure.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return priceImpactPercentage0 The price impact percentage for token0.
     * @return priceImpactPercentage1 The price impact percentage for token1.
     */
    function getZapDataBond(
        address fromToken,
        uint256 amount,
        ICustomBillRefillable bill,
        uint256 slippage, // 1 = 0.01%, 100 = 1%
        address to
    )
        public
        view
        returns (
            ISoulZap.ZapParamsBond memory params,
            bytes memory encodedParams,
            bytes memory encodedTx,
            uint256 priceImpactPercentage0,
            uint256 priceImpactPercentage1
        )
    {
        (params, priceImpactPercentage0, priceImpactPercentage1) = getZapDataBondInternal(
            fromToken,
            amount,
            bill,
            slippage,
            to
        );
        encodedParams = abi.encode(params);
        encodedTx = abi.encodeWithSelector(ZAPBOND_SELECTOR, params);
    }

    /**
     * @dev Get the Zap data for a bond transaction with a specified token (internal function).
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param bill The custom bill refillable contract.
     * @param slippage The slippage tolerance (Denominator 10_000. 1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return params ZapParamsBond structure containing relevant data.
     * @return priceImpactPercentage0 The price impact percentage for token0.
     * @return priceImpactPercentage1 The price impact percentage for token1.
     */
    function getZapDataBondInternal(
        address fromToken,
        uint256 amount,
        ICustomBillRefillable bill,
        uint256 slippage, //Denominator 10_000. 1 = 0.01%, 100 = 1%
        address to
    )
        internal
        view
        returns (ISoulZap.ZapParamsBond memory params, uint256 priceImpactPercentage0, uint256 priceImpactPercentage1)
    {
        IUniswapV2Pair lp = IUniswapV2Pair(bill.principalToken());
        console.log("lp=", address(lp));
        //TODO: add support for bonds with one erc20 token as principal token
        ISoulZap.ZapParams memory zapParams;
        (zapParams, priceImpactPercentage0, priceImpactPercentage1) = getZapDataInternal(
            fromToken,
            amount,
            lp,
            slippage,
            to
        );

        //TODO: what's this slippage and how to add it properly? seperate from routing slippage.
        //is trueBillPrice the right one?
        uint256 maxPrice = (bill.trueBillPrice() * (10_000 + slippage)) / 10_000;
        params = ISoulZap.ZapParamsBond({zapParams: zapParams, bill: bill, maxPrice: maxPrice});
    }
}

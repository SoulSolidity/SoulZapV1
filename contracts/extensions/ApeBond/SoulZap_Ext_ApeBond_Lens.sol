// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "../../SoulZap_UniV2_Lens.sol";
import "../../ISoulZap_UniV2.sol";
import "./lib/ICustomBillRefillable.sol";
import "./SoulZap_Ext_ApeBond.sol";
import "hardhat/console.sol";

abstract contract SoulZap_Ext_ApeBond_Lens is SoulZap_UniV2_Lens {
    struct ZapParams_Ext_Bonds {
        ICustomBillRefillable bill;
        uint256 maxPrice;
    }

    bytes4 private constant ZAPBONDNATIVE_SELECTOR = SoulZap_Ext_ApeBond.zapBondNative.selector;
    bytes4 private constant ZAPBOND_SELECTOR = SoulZap_Ext_ApeBond.zapBond.selector;

    /**
     * @dev Get the Zap data for a bond transaction with a native token.
     * @param amount The amount of tokens to zap.
     * @param bill The custom bill refillable contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return zapParams zapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath swap path for protocol fee.
     * @return priceImpactPercentages The price impact percentages.
     * @return zapParamsBonds zap extension params for bonds
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
            ISoulZap_UniV2.ZapParamsNative memory zapParams,
            bytes memory encodedTx,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages,
            ZapParams_Ext_Bonds memory zapParamsBonds
        )
    {
        ISoulZap_UniV2.ZapParams memory tempParams;
        (tempParams, feeSwapPath, priceImpactPercentages, zapParamsBonds) = _getZapDataBond(
            address(WNATIVE),
            amount,
            bill,
            slippage,
            to
        );
        zapParams = ISoulZap_UniV2.ZapParamsNative({
            token0: tempParams.token0,
            token1: tempParams.token1,
            path0: tempParams.path0,
            path1: tempParams.path1,
            liquidityPath: tempParams.liquidityPath,
            to: to,
            /// @dev deadline set to 20 minutes
            deadline: block.timestamp + 20 minutes
        });
        encodedTx = abi.encodeWithSelector(
            ZAPBONDNATIVE_SELECTOR,
            zapParams,
            feeSwapPath,
            bill,
            zapParamsBonds.maxPrice
        );
    }

    /**
     * @dev Get the Zap data for a bond transaction with a specified token.
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param bill The custom bill refillable contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return zapParams zapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath swap path for protocol fee.
     * @return priceImpactPercentages The price impact percentages.
     * @return zapParamsBonds zap extension params for bonds
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
            ISoulZap_UniV2.ZapParams memory zapParams,
            bytes memory encodedTx,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages,
            ZapParams_Ext_Bonds memory zapParamsBonds
        )
    {
        (zapParams, feeSwapPath, priceImpactPercentages, zapParamsBonds) = _getZapDataBond(
            fromToken,
            amount,
            bill,
            slippage,
            to
        );
        //TODO
        encodedTx = abi.encodeWithSelector(ZAPBOND_SELECTOR, zapParams, feeSwapPath, bill, zapParamsBonds.maxPrice);
    }

    /**
     * @dev Get the Zap data for a bond transaction with a specified token (internal function).
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param bill The custom bill refillable contract.
     * @param slippage The slippage tolerance (Denominator 10_000. 1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return zapParams zapParams structure containing relevant data.
     * @return feeSwapPath swap path for protocol fee.
     * @return priceImpactPercentages The price impact percentages.
     * @return zapParamsBonds zap extension params for bonds
     */
    function _getZapDataBond(
        address fromToken,
        uint256 amount,
        ICustomBillRefillable bill,
        uint256 slippage, //Denominator 10_000. 1 = 0.01%, 100 = 1%
        address to
    )
        internal
        view
        returns (
            ISoulZap_UniV2.ZapParams memory zapParams,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages,
            ZapParams_Ext_Bonds memory zapParamsBonds
        )
    {
        IUniswapV2Pair lp = IUniswapV2Pair(bill.principalToken());
        // TODO: Remove console.log before production
        console.log("lp=", address(lp));
        //TODO: add support for bonds with one erc20 token as principal token
        (zapParams, feeSwapPath, priceImpactPercentages) = _getZapDataInternal(fromToken, amount, lp, slippage, to);

        //TODO: what's this slippage and how to add it properly? seperate from routing slippage.
        //is trueBillPrice the right one?
        uint256 maxPrice = (bill.trueBillPrice() * (10_000 + slippage)) / 10_000;
        zapParamsBonds = ZapParams_Ext_Bonds({bill: bill, maxPrice: maxPrice});
    }
}

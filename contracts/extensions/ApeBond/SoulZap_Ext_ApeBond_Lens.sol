// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

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

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "../../SoulZap_UniV2_Lens.sol";
import "../../ISoulZap_UniV2.sol";
import "./lib/ICustomBillRefillable.sol";
import "./SoulZap_Ext_ApeBond.sol";
import "../../utils/Constants.sol";

// TODO: Remove before production
import "hardhat/console.sol";

abstract contract SoulZap_Ext_ApeBond_Lens is SoulZap_UniV2_Lens {
    struct ZapParams_Ext_Bonds {
        ICustomBillRefillable bond;
        uint256 maxPrice;
    }

    bytes4 private constant _ZAP_BOND_SELECTOR = SoulZap_Ext_ApeBond.zapBond.selector;

    /**
     * @dev Get the Zap data for a bond transaction with a specified token.
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param bond The custom bond refillable contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return zapParams zapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath swap path for protocol fee.
     * @return priceImpactPercentages The price impact percentages.
     * @return zapParamsBonds zap extension params for bonds
     */
    function getZapDataBond(
        address fromToken, // Pass Constants.NATIVE_ADDRESS for native token input
        uint256 amount,
        ICustomBillRefillable bond,
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
            bond,
            slippage,
            to
        );
        encodedTx = abi.encodeWithSelector(_ZAP_BOND_SELECTOR, zapParams, feeSwapPath, bond, zapParamsBonds.maxPrice);
    }

    /**
     * @dev Get the Zap data for a bond transaction with the Native token.
     * @param amount The amount of tokens to zap.
     * @param bond The custom bond refillable contract.
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
        ICustomBillRefillable bond,
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
        return getZapDataBond(Constants.NATIVE_ADDRESS, amount, bond, slippage, to);
    }

    /**
     * @dev Get the Zap data for a bond transaction with a specified token (internal function).
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param bond The custom bond refillable contract.
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
        ICustomBillRefillable bond,
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
        bool nativeZap = fromToken == Constants.NATIVE_ADDRESS;
        if (nativeZap) {
            fromToken = address(WNATIVE);
        }

        IUniswapV2Pair bondPrincipalToken = IUniswapV2Pair(bond.principalToken());

        //Check if bond principal token is single token or lp
        bool isSingleTokenBond = true;
        try IUniswapV2Pair(bondPrincipalToken).token0() returns (address /*_token0*/) {
            isSingleTokenBond = false;
        } catch (bytes memory) {}

        if (isSingleTokenBond) {
            priceImpactPercentages = new uint256[](2);

            ISoulZap_UniV2.SwapParams memory swapParams;
            (swapParams, feeSwapPath, priceImpactPercentages[0]) = _getSwapData(
                fromToken,
                amount,
                address(bondPrincipalToken),
                slippage,
                to
            );

            ISoulZap_UniV2.SwapPath memory emptySwapPath;
            ISoulZap_UniV2.LiquidityPath memory emptyLiquidityPath;
            zapParams = ISoulZap_UniV2.ZapParams({
                inputToken: swapParams.inputToken,
                inputAmount: swapParams.inputAmount,
                token0: swapParams.token,
                /// @dev token1 is not used for single token bonds
                token1: address(0),
                path0: swapParams.path,
                path1: emptySwapPath,
                liquidityPath: emptyLiquidityPath,
                to: swapParams.to,
                deadline: swapParams.deadline
            });
        } else {
            (zapParams, feeSwapPath, priceImpactPercentages) = _getZapData(
                fromToken,
                amount,
                bondPrincipalToken,
                slippage,
                to
            );
        }

        if (nativeZap) {
            /// @dev Zaps with msg.value are passed as Constants.NATIVE_ADDRESS
            zapParams.inputToken = IERC20(Constants.NATIVE_ADDRESS);
        }
        uint256 maxPrice = bond.trueBillPrice();
        zapParamsBonds = ZapParams_Ext_Bonds({bond: bond, maxPrice: maxPrice});
    }
}

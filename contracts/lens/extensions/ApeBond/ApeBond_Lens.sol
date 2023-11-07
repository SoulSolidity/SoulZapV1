// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "../../SoulZap_Lens.sol";
import "../../../lib/ISoulZap.sol";
import "../../../extensions/ApeBond/lib/ICustomBillRefillable.sol";
import "../../../extensions/ApeBond/ApeBond.sol";

abstract contract ApeBond_Lens is SoulZap_Lens {
    bytes4 private constant ZAPBONDNATIVE_SELECTOR = ApeBond.zapBondNative.selector;
    bytes4 private constant ZAPBOND_SELECTOR = ApeBond.zapBond.selector;

    function getZapDataNative(
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
            uint256 priceChangePercentage0,
            uint256 priceChangePercentage1
        )
    {
        ISoulZap.ZapParamsBond memory tempParams;
        (tempParams, priceChangePercentage0, priceChangePercentage1) = getZapDataInternal(
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

    function getZapData(
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
            uint256 priceChangePercentage0,
            uint256 priceChangePercentage1
        )
    {
        (params, priceChangePercentage0, priceChangePercentage1) = getZapDataInternal(
            fromToken,
            amount,
            bill,
            slippage,
            to
        );
        encodedParams = abi.encode(params);
        encodedTx = abi.encodeWithSelector(ZAPBOND_SELECTOR, params);
    }

    function getZapDataInternal(
        address fromToken,
        uint256 amount,
        ICustomBillRefillable bill,
        uint256 slippage, // 1 = 0.01%, 100 = 1%
        address to
    )
        internal
        view
        returns (ISoulZap.ZapParamsBond memory params, uint256 priceChangePercentage0, uint256 priceChangePercentage1)
    {
        address principalToken = bill.principalToken();
        address token0;
        address token1;

        try IUniswapV2Pair(principalToken).token0() returns (address _token0) {
            token0 = _token0;
        } catch (bytes memory) {}
        try IUniswapV2Pair(principalToken).token1() returns (address _token1) {
            token1 = _token1;
        } catch (bytes memory) {}

        ISoulZap.ZapParams memory zapParams;
        zapParams.deadline = block.timestamp + 100_000_000_000; //TODO: chose random extra time, pick a better one
        zapParams.inputAmount = amount;
        zapParams.inputToken = IERC20(fromToken);
        zapParams.to = to;
        if (token0 != address(0) && token1 != address(0)) {
            //LP
            uint256 halfAmount = amount / 2;
            zapParams.token0 = token0;
            zapParams.token1 = token1;
            (zapParams.path0, priceChangePercentage0) = SoulZap_Lens.getBestRoute(
                fromToken,
                token0,
                halfAmount,
                slippage
            );
            (zapParams.path1, priceChangePercentage1) = SoulZap_Lens.getBestRoute(
                fromToken,
                token1,
                halfAmount,
                slippage
            );
            zapParams.liquidityPath = getLiquidityPath(IUniswapV2Pair(principalToken), zapParams.path0.amountOutMin);
        } else {
            //Single token
            revert("Only lp bonds supported for now");
        }

        //TODO: what's this slippage and how to add it properly? seperate from routing slippage.
        //is trueBillPrice the right one?
        uint256 maxPrice = (bill.trueBillPrice() * (10_000 + slippage)) / 10_000;
        params = ISoulZap.ZapParamsBond({zapParams: zapParams, bill: bill, maxPrice: maxPrice});
    }

    function getLiquidityPath(
        IUniswapV2Pair lp,
        uint256 minAmountLP0
    ) internal view returns (ISoulZap.LiquidityPath memory params) {
        IUniswapV2Router02 lpRouter = SoulZap_Lens.factoryToRouter[IUniswapV2Factory(lp.factory())];

        (uint256 reserveA, uint256 reserveB, ) = lp.getReserves();
        uint256 amountB = lpRouter.quote(minAmountLP0, reserveA, reserveB);

        params = ISoulZap.LiquidityPath({
            lpRouter: address(lpRouter),
            lpType: ISoulZap.LPType.V2,
            minAmountLP0: minAmountLP0,
            minAmountLP1: amountB
        });
    }
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

/// -----------------------------------------------------------------------
/// Package Imports
/// -----------------------------------------------------------------------

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

/// -----------------------------------------------------------------------
/// Internal Imports
/// -----------------------------------------------------------------------
import {ISoulZap_UniV2} from "./ISoulZap_UniV2.sol";
//FIXME: should be from interface
import {SoulZap_UniV2} from "./SoulZap_UniV2.sol";
import {ISoulFeeManager} from "./fee-manager/ISoulFeeManager.sol";
import {IWETH} from "./lib/IWETH.sol";

// TODO: Remove console before production
import "hardhat/console.sol";

/**
 * @title SoulZap_UniV2_Lens
 * @dev This contract is an implementation of AccessManaged interface. It includes functionalities for managing access to
 * SoulZap_UniV2 contracts.
 * @notice This contract uses AccessManaged for managing access.
 * @author Soul Solidity - (Contact for mainnet licensing until 730 days after the deployment transaction. Otherwise
 * feel free to experiment locally or on testnets.)
 * @notice Do not use this contract for any tokens that do not have a standard ERC20 implementation.
 */
contract SoulZap_UniV2_Lens is AccessManaged {
    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

    bytes4 private constant ZAPNATIVE_SELECTOR = ISoulZap_UniV2.zapNative.selector;
    bytes4 private constant ZAP_SELECTOR = ISoulZap_UniV2.zap.selector;

    IUniswapV2Factory public factory;
    IUniswapV2Router02 public router;
    address[] public hopTokens;
    address public feeStableToken;
    IWETH public immutable WNATIVE;
    //FIXME: do we really need the fee manger AND the zap in here for just logic stuff...
    // and make soulzap the interface instead of the contract. need the epoch interface stuff
    ISoulFeeManager public soulFeeManager;
    SoulZap_UniV2 public soulZap;

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(
        SoulZap_UniV2 _soulZap,
        IWETH _wnative,
        address _feeStableToken,
        IUniswapV2Router02 _router,
        address[] memory _hopTokens
    ) AccessManaged(_soulZap.authority()) {
        router = _router;
        factory = IUniswapV2Factory(_router.factory());
        WNATIVE = _wnative;
        hopTokens = _hopTokens;
        soulZap = _soulZap;
        feeStableToken = _feeStableToken;
        soulFeeManager = soulZap.soulFeeManager();
    }

    /**
     * @dev Find possible hop tokens for swapping between two specified tokens.
     * @param _fromToken The source token for the swap.
     * @param _toToken The target token for the swap.
     * @return possibleHopTokens An array of possible hop tokens.
     */
    function findPossibleHopTokens(
        address _fromToken,
        address _toToken
    ) public view returns (address[] memory possibleHopTokens) {
        possibleHopTokens = new address[](hopTokens.length);
        uint count = 0;
        for (uint i = 0; i < hopTokens.length; i++) {
            address hopToken = hopTokens[i];
            bool hop1 = pairExists(_fromToken, hopToken);
            bool hop2 = pairExists(hopToken, _toToken);
            if (hop1 && hop2) {
                possibleHopTokens[count] = hopToken;
                count++;
            }
        }
    }

    /**
     * @dev Check if a pair exists for two given tokens in the Uniswap V2 factory.
     * @param token0 The first token of the pair.
     * @param token1 The second token of the pair.
     * @return True if the pair exists; false otherwise.
     */
    function pairExists(address token0, address token1) public view returns (bool) {
        address pair = factory.getPair(token0, token1);
        if (pair == address(0)) {
            return false;
        }
        return true;
    }

    /**
     * @dev Calculate the output amount for a given input amount and pair
     * @param _pair The address of the pair
     * @param _inputAmount The input amount
     * @param _fromToken The address of the input token
     */
    function calculateOutputAmount(address _pair, uint _inputAmount, address _fromToken) public view returns (uint) {
        //TODO function not even used. needed?
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        uint reserveIn = pair.token0() == _fromToken ? reserve0 : reserve1;
        uint reserveOut = pair.token0() == _fromToken ? reserve1 : reserve0;
        return router.getAmountOut(_inputAmount, reserveIn, reserveOut);
    }

    /**
     * @dev Check if a token is in the hop tokens
     * @param _token The address of the token
     */
    function isInHopTokens(address _token) public view returns (bool) {
        for (uint i = 0; i < hopTokens.length; i++) {
            if (hopTokens[i] == _token) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get the Zap data for a transaction with a native token.
     * @param amount The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return zapParams ZapParamsNative structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function getZapDataNative(
        uint256 amount,
        IUniswapV2Pair lp,
        uint256 slippage, // 1 = 0.01%, 100 = 1%
        address to
    )
        public
        view
        returns (
            ISoulZap_UniV2.ZapParamsNative memory zapParams,
            bytes memory encodedTx,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages
        )
    {
        ISoulZap_UniV2.ZapParams memory tempParams;
        (tempParams, feeSwapPath, priceImpactPercentages) = _getZapDataInternal(
            address(WNATIVE),
            amount,
            lp,
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
            //FIXME: deadline time addition
            deadline: block.timestamp + 100_000_000_000
        });
        encodedTx = abi.encodeWithSelector(ZAPNATIVE_SELECTOR, zapParams, feeSwapPath);
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return zapParams ZapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function getZapData(
        address fromToken,
        uint256 amount,
        IUniswapV2Pair lp,
        uint256 slippage, // Denominator of 10_000. 1 = 0.01%, 100 = 1%
        address to
    )
        public
        view
        returns (
            ISoulZap_UniV2.ZapParams memory zapParams,
            bytes memory encodedTx,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages
        )
    {
        (zapParams, feeSwapPath, priceImpactPercentages) = _getZapDataInternal(fromToken, amount, lp, slippage, to);
        encodedTx = abi.encodeWithSelector(ZAP_SELECTOR, zapParams, feeSwapPath);
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token (internal function).
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance (Denominator 10_000. 1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @return zapParams ZapParams structure containing relevant data.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function _getZapDataInternal(
        address fromToken,
        uint256 amount,
        IUniswapV2Pair lp,
        uint256 slippage, //Denominator 10_000. 1 = 0.01%, 100 = 1%
        address to
    )
        internal
        view
        returns (
            ISoulZap_UniV2.ZapParams memory zapParams,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages
        )
    {
        //FIXME: chose random extra time, pick a better one
        zapParams.deadline = block.timestamp + 100_000_000_000;
        zapParams.inputAmount = amount;
        zapParams.inputToken = IERC20(fromToken);
        zapParams.to = to;

        //Get path for protocol fee
        uint256 feePercentage = soulFeeManager.getFee(soulZap.getEpochVolume());
        uint256 feeAmount = (amount * feePercentage) / soulFeeManager.FEE_DENOMINATOR();
        if (feeAmount > 0) {
            //Remove protocol fee from amount for finding the best path so amounts are correct
            amount -= feeAmount;
        }
        if (feePercentage == 0) {
            //If no fee, take 1% so we can still calculate volume
            feeAmount = amount / 100;
        }
        (address[] memory path, uint256 amountOutMin) = getBestPath(fromToken, feeStableToken, feeAmount);
        feeSwapPath.swapRouter = address(router);
        feeSwapPath.swapType = ISoulZap_UniV2.SwapType.V2;
        feeSwapPath.path = path;
        feeSwapPath.amountOutMin = (amountOutMin * (10_000 - slippage)) / 10_000;
        console.log("feeswappath done");

        address token0;
        address token1;
        // TODO: Remove console.log before production
        console.log("lpaddress", address(lp));

        try IUniswapV2Pair(lp).token0() returns (address _token0) {
            token0 = _token0;
        } catch (bytes memory) {}
        try IUniswapV2Pair(lp).token1() returns (address _token1) {
            token1 = _token1;
        } catch (bytes memory) {}

        // TODO: Remove console.log before production
        console.log("token addresses", token0, token1);

        if (token0 != address(0) && token1 != address(0)) {
            //LP
            uint256 halfAmount = amount / 2;
            zapParams.token0 = token0;
            zapParams.token1 = token1;
            priceImpactPercentages = new uint256[](2);
            (zapParams.path0, priceImpactPercentages[0]) = getBestRoute(fromToken, token0, halfAmount, slippage);
            (zapParams.path1, priceImpactPercentages[1]) = getBestRoute(fromToken, token1, halfAmount, slippage);
            zapParams.liquidityPath = _getLiquidityPath(
                IUniswapV2Pair(lp),
                zapParams.path0.amountOutMin,
                zapParams.path1.amountOutMin
            );
        } else {
            revert("lp address not actual lp");
        }
    }

    /**
     * @dev Get the Liquidity Path for a specified Uniswap V2 pair.
     * @param lp The Uniswap V2 pair contract.
     * @param minAmountLP0 The minimum amount of LP token0 to receive.
     * @param minAmountLP1 The minimum amount of LP token1 to receive.
     * @return params LiquidityPath structure containing relevant data.
     */
    function _getLiquidityPath(
        IUniswapV2Pair lp,
        uint256 minAmountLP0,
        uint256 minAmountLP1
    ) internal view returns (ISoulZap_UniV2.LiquidityPath memory params) {
        (uint256 reserveA, uint256 reserveB, ) = lp.getReserves();
        uint256 amountB = router.quote(minAmountLP0, reserveA, reserveB);
        // TODO: Remove console.log before production
        console.log("liquiditypath", amountB, minAmountLP1);

        //The min amount B to add for LP can be lower than the received tokenB amount.
        //If that's the case calculate min amount with tokenA amount so it doesn't revert
        if (amountB > minAmountLP1) {
            minAmountLP0 = router.quote(minAmountLP1, reserveB, reserveA);
            amountB = minAmountLP1;
            // TODO: Remove console.log before production
            console.log("liquiditypath CHANGED", amountB, minAmountLP0);
        }

        params = ISoulZap_UniV2.LiquidityPath({
            lpRouter: address(router),
            lpType: ISoulZap_UniV2.LPType.V2,
            minAmountLP0: minAmountLP0,
            minAmountLP1: amountB
        });
    }

    //FIXME: bad naming. getBestPath and getBestRoute are bad. Suggestions?
    function getBestPath(
        address _fromToken,
        address _toToken,
        uint _amountIn
    ) internal view returns (address[] memory bestPath, uint256 bestAmountOutMin) {
        if (_fromToken == _toToken) {
            return (bestPath, _amountIn);
        }

        /// @dev If pair exists, then we will note the output amount and path to compare
        if (pairExists(_fromToken, _toToken)) {
            bestPath = new address[](2);
            bestPath[0] = _fromToken;
            bestPath[1] = _toToken;
            uint[] memory amounts = router.getAmountsOut(_amountIn, bestPath);
            bestAmountOutMin = amounts[amounts.length - 1];
        }

        address[] memory possibleHopTokens = findPossibleHopTokens(_fromToken, _toToken);
        if (possibleHopTokens.length == 0) {
            return (bestPath, 0);
        }

        address[] memory path = new address[](3);
        path[0] = _fromToken;
        path[2] = _toToken;
        bool first = true;
        for (uint i = 0; i < possibleHopTokens.length; i++) {
            if (possibleHopTokens[i] == address(0)) {
                break;
            }
            path[1] = possibleHopTokens[i];
            // TODO: Remove console.log before production
            uint[] memory amounts = router.getAmountsOut(_amountIn, path);
            console.log(path[1], amounts[amounts.length - 1]);
            if (amounts[amounts.length - 1] > bestAmountOutMin) {
                console.log(path[0], path[1], path[2]);
                if (first) {
                    bestPath = new address[](3);
                    bestPath[0] = path[0];
                    bestPath[2] = path[2];
                    first = false;
                }
                bestPath[1] = path[1];
                bestAmountOutMin = amounts[amounts.length - 1];
            }
        }
    }

    /**
     * @dev Get the best route from a Uniswap V2 factory for swapping between two tokens.
     * @param _fromToken The source token for the swap.
     * @param _toToken The target token for the swap.
     * @param _amountIn The input amount for the swap.
     * @param _slippage amountOutMin slippage. This is front run slippage and for the small time difference between read and write tx
     *          AND NOT FOR ACTUAL PRICE IMPACT. Denominator 10_000
     * @return bestPath An array of addresses representing the best route.
     * @return priceImpactPercentage The price impact for the swap.
     */
    function getBestRoute(
        address _fromToken,
        address _toToken,
        uint _amountIn,
        uint256 _slippage //Denominator 10_000 1 = 0.01%, 100 = 1%
    ) public view returns (ISoulZap_UniV2.SwapPath memory bestPath, uint256 priceImpactPercentage) {
        if (_fromToken == _toToken) {
            //amountOutMin == amountIn if token is the same (needed for liquidity path)
            bestPath.amountOutMin = _amountIn;
            //no price impact if the token doesn't change
            return (bestPath, 0);
        }

        bestPath.swapType = ISoulZap_UniV2.SwapType.V2;
        bestPath.swapRouter = address(router);

        (address[] memory bestPathAddresses, uint256 bestAmountOutMin) = getBestPath(_fromToken, _toToken, _amountIn);
        bestPath.path = bestPathAddresses;
        bestPath.amountOutMin = (bestAmountOutMin * (10_000 - _slippage)) / 10_000;

        //TODO maybe: add a double hop check so both tokens only need to have a pair with any one of the blue chip hop tokens instead of both with the same one
        //Probably only if no single hope exists to save gas if it's not needed

        //Calculation of price impact. actual price is the current actual price which does not take slippage into account for less liquid pairs.
        //It calculates the impact between actual price and price after slippage.
        // TODO: 10_000 hardcoded
        //With a denominator of 10_000. 100 = 1% price impact, 1000 = 10% price impact.
        uint256 actualPrice = _amountIn;
        console.log("actualPrice", actualPrice);
        for (uint256 i = 0; i < bestPath.path.length - 1; i++) {
            address token0 = bestPath.path[i];
            address token1 = bestPath.path[i + 1];
            (uint256 reserveA, uint256 reserveB, ) = IUniswapV2Pair(factory.getPair(token0, token1)).getReserves();
            if (token0 > token1) {
                (reserveA, reserveB) = (reserveB, reserveA);
            }
            console.log(factory.getPair(token0, token1), reserveB, reserveA, (reserveB * 1e18) / reserveA);
            actualPrice *= (reserveB * 1e18) / reserveA;
            if (i > 0) {
                actualPrice /= 1e18;
            }
            // TODO: Remove console.log before production
            console.log("actualPrice", actualPrice);
        }
        // TODO: Hardcoded 10_000, also we should probably add in some more granularity here
        // NOTE: hardcoded 1e22 (because 1e22/1e18=10_000)
        priceImpactPercentage = 10_000 - ((bestPath.amountOutMin * 1e22) / actualPrice);
        console.log("price impact", priceImpactPercentage);
    }

    /// -----------------------------------------------------------------------
    /// Restricted functions
    /// -----------------------------------------------------------------------

    function changeFeeStableToken(address _feeStableToken) public restricted {
        feeStableToken = _feeStableToken;
    }

    function addHopTokens(address[] memory tokens) public restricted {
        for (uint256 i = 0; i < tokens.length; i++) {
            hopTokens.push(tokens[i]);
        }
    }

    function addHopToken(address token) public restricted {
        hopTokens.push(token);
    }

    function removeHopToken(address token) public restricted {
        for (uint256 i = 0; i < hopTokens.length; i++) {
            if (hopTokens[i] == token) {
                if (i != hopTokens.length - 1) {
                    // Swap the element to remove with the last element
                    hopTokens[i] = hopTokens[hopTokens.length - 1];
                }
                hopTokens.pop();
                break;
            }
        }
    }
}

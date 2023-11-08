// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.20;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// FIXME: remove
// import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {ISoulZap} from "../ISoulZap.sol";

// TODO: Remove console before production
import "hardhat/console.sol";

// TODO: SoulZap_UniV2_Lens
contract SoulZap_UniV2_Lens is AccessManaged {
    IUniswapV2Factory[] public factories;
    // TODO: Technically there can be multiple routers to a factory
    mapping(IUniswapV2Factory => IUniswapV2Router02) public factoryToRouter;
    address[] public hopTokens;
    address public immutable WNATIVE;

    constructor(
        address _wnative,
        IUniswapV2Router02[] memory _routers,
        address[] memory _hopTokens,
        address _accessManager
    ) AccessManaged(_accessManager) {
        for (uint256 index = 0; index < _routers.length; index++) {
            IUniswapV2Factory routerFactory = IUniswapV2Factory(_routers[index].factory());
            factoryToRouter[routerFactory] = _routers[index];
            factories.push(routerFactory);
        }
        WNATIVE = _wnative;
        hopTokens = _hopTokens;
    }

    function addFactoryFromRouter(IUniswapV2Router02 _router) public restricted {
        IUniswapV2Factory factory = IUniswapV2Factory(_router.factory());
        factories.push(factory);
        factoryToRouter[factory] = _router;
    }

    function removeFactory(IUniswapV2Factory _factory) public restricted {
        // Search for the factory in the array
        for (uint256 i = 0; i < factories.length; i++) {
            if (factories[i] == _factory) {
                // Swap the element to remove to the end of the array
                factories[i] = factories[uint256(factories.length) - 1];
                // Shorten the array by one
                factories.pop();
                break;
            }
        }

        // Remove the factory from the mapping
        delete factoryToRouter[_factory];
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
                // Shorten the array by one
                hopTokens.pop();
                break;
            }
        }
    }

    function findPossibleHopTokens(
        IUniswapV2Factory factory,
        address _fromToken,
        address _toToken
    ) public view returns (address[] memory possibleHopTokens) {
        possibleHopTokens = new address[](hopTokens.length);
        uint count = 0;
        for (uint i = 0; i < hopTokens.length; i++) {
            address hopToken = hopTokens[i];
            bool hop1 = pairExists(factory, _fromToken, hopToken);
            bool hop2 = pairExists(factory, hopToken, _toToken);
            if (hop1 && hop2) {
                possibleHopTokens[count] = hopToken;
                count++;
            }
        }
    }

    function pairExists(IUniswapV2Factory factory, address token0, address token1) public view returns (bool) {
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
        //      Oooh this was so we don't need the router I think. so maybe use this and we don't need mapping for router?
        //FIXME important: if we take a protocol fee this calculation/input amount is wrong
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        uint reserveIn = pair.token0() == _fromToken ? reserve0 : reserve1;
        uint reserveOut = pair.token0() == _fromToken ? reserve1 : reserve0;
        return factoryToRouter[IUniswapV2Factory(pair.factory())].getAmountOut(_inputAmount, reserveIn, reserveOut);
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
     * @dev Find the best route for a given input token and amount
     * @param _fromToken The address of the input token
     * @param _toToken The address of the output token
     * @param _amountIn The input amount
     * @param _slippage amountOutMin slippage. This is front run slippage and for the small time difference between read and write tx
     *          AND NOT FOR ACTUAL PRICE IMPACT.
     */
    function getBestRoute(
        address _fromToken,
        address _toToken,
        uint _amountIn,
        uint256 _slippage // 1 = 0.01%, 100 = 1%
    ) public view returns (ISoulZap.SwapPath memory bestPath, uint256 priceImpactPercentage) {
        address[] memory path;
        uint256 outputAmount = 0;
        bestPath.swapType = ISoulZap.SwapType.V2;
        if (_fromToken == _toToken) {
            //TODO setting this to address(1) because swaprouter can't be address(0). but also not used in zap now because no swap needed. better way of fixing?
            // TODO: from DeFi FoFum: Consider a new enum: bestPath.swapType = ISoulZap.SwapType.SameToken;
            bestPath.swapRouter = address(1);
            return (bestPath, 0);
        }

        // NOTE: Very concerned about the gas costs here. I was intending that we would only have a single factory :thinking:
        for (uint256 index = 0; index < factories.length; index++) {
            IUniswapV2Router02 router = factoryToRouter[factories[index]];
            (path, outputAmount) = getBestRouteFromFactory(factories[index], router, _fromToken, _toToken, _amountIn);
            if (outputAmount > bestPath.amountOutMin) {
                bestPath.swapRouter = address(router);
                bestPath.path = path;
                bestPath.amountOutMin = outputAmount;
            }
        }
        // TODO: Use a const for 10_000
        bestPath.amountOutMin = (bestPath.amountOutMin * (10_000 - _slippage)) / 10_000;

        //Calculation of price impact. actual price is the current actual price which does not take slippage into account for less liquid pairs.
        //It calculates the impact between actual price and price after slippage.
        // TODO: 10_000 hardcoded
        //With a denominator of 10_000. 100 = 1% price impact, 1000 = 10% price impact.
        uint256 actualPrice = _amountIn;
        IUniswapV2Factory factory = IUniswapV2Factory(IUniswapV2Router02(bestPath.swapRouter).factory());
        for (uint256 i = 0; i < bestPath.path.length - 1; i++) {
            address token0 = bestPath.path[i];
            address token1 = bestPath.path[i + 1];
            (uint256 reserveA, uint256 reserveB, ) = IUniswapV2Pair(factory.getPair(token0, token1)).getReserves();
            if (token0 > token1) {
                (reserveA, reserveB) = (reserveB, reserveA);
            }
            actualPrice *= (reserveB * 1e18) / reserveA;
            if (i > 0) {
                actualPrice /= 1e18;
            }
            // TODO: Remove console.log before production
            console.log("actualPrice", actualPrice);
        }
        console.log(bestPath.amountOutMin, actualPrice);
        // TODO: Hardcoded 10_000, also we should probably add in some more granularity here
        // NOTE: hardcoded 1e22
        priceImpactPercentage = 10_000 - ((bestPath.amountOutMin * 1e22) / actualPrice);
    }

    // TODO:
    function getBestRouteFromFactory(
        IUniswapV2Factory factory,
        IUniswapV2Router02 router,
        address _fromToken,
        address _toToken,
        uint _amountIn
    ) public view returns (address[] memory bestPath, uint256 maxOutputAmount) {
        address[] memory path;
        /// @dev If pair exists, then we will note the output amount and path to compare
        if (pairExists(factory, _fromToken, _toToken)) {
            bestPath = new address[](2);
            bestPath[0] = _fromToken;
            bestPath[1] = _toToken;
            uint[] memory amounts = router.getAmountsOut(_amountIn, bestPath);
            maxOutputAmount = amounts[amounts.length - 1];
        }

        address[] memory possibleHopTokens = findPossibleHopTokens(factory, _fromToken, _toToken);
        if (possibleHopTokens.length == 0) {
            return (bestPath, maxOutputAmount);
        }

        path = new address[](3);
        path[0] = _fromToken;
        path[2] = _toToken;
        for (uint i = 0; i < possibleHopTokens.length; i++) {
            if (possibleHopTokens[i] == address(0)) {
                break;
            }
            path[1] = possibleHopTokens[i];
            // TODO: Remove console.log before production
            console.log(path[0], path[1], path[2]);
            //TODO important: if we take a protocol fee this calculation/input amount is wrong
            uint[] memory amounts = router.getAmountsOut(_amountIn, path);
            if (amounts[amounts.length - 1] > maxOutputAmount) {
                maxOutputAmount = amounts[amounts.length - 1];
                bestPath = new address[](3);
                bestPath[0] = path[0];
                bestPath[1] = path[1];
                bestPath[2] = path[2];
                // TODO: Remove console.log before production
                console.log("betterpath", bestPath[1], maxOutputAmount);
            }
        }

        //TODO: add a double hop check so both tokens only need to have a pair with any one of the blue chip hop tokens instead of both with the same one
    }
}

// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.15;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import "../lib/ISoulZap.sol";
import "../lib/IApeFactory.sol";
import "hardhat/console.sol";
import "../SoulFee.sol";

contract SoulZap_Lens is Ownable {
    IUniswapV2Factory[] public factories;
    mapping(IUniswapV2Factory => IUniswapV2Router02) public factoryToRouter;
    address[] public hopTokens;
    address public immutable WNATIVE;
    SoulFee public soulFee;

    constructor(
        address _wnative,
        IUniswapV2Factory[] memory _factories,
        IUniswapV2Router02[] memory _routers,
        address[] memory _hopTokens,
        SoulFee _soulfee
    ) Ownable() {
        require(_factories.length == _routers.length, "Every factory needs a router");
        factories = _factories;
        for (uint256 index = 0; index < _factories.length; index++) {
            factoryToRouter[_factories[index]] = _routers[index];
        }
        WNATIVE = _wnative;
        hopTokens = _hopTokens;
        soulFee = _soulfee;
    }

    function addFactory(IUniswapV2Factory _factory, IUniswapV2Router02 _router) public onlyOwner {
        factories.push(_factory);
        factoryToRouter[_factory] = _router;
    }

    function removeFactory(IUniswapV2Factory _factory) public onlyOwner {
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

    function addHopTokens(address[] memory tokens) public onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            hopTokens.push(tokens[i]);
        }
    }

    function addHopToken(address token) public onlyOwner {
        hopTokens.push(token);
    }

    function removeHopToken(address token) public onlyOwner {
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
        //TODO important: if we take a protocol fee this calculation/input amount is wrong
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
     *          AND NOT FOR ACTUAL PRICE IMPACT. Denominator 10_000
     * @param _protocolFee The protocol fee removed from input token
     */
    function getBestRoute(
        address _fromToken,
        address _toToken,
        uint _amountIn,
        uint256 _slippage, //Denominator 10_000 1 = 0.01%, 100 = 1%
        uint256 _protocolFee
    ) public view returns (ISoulZap.SwapPath memory bestPath, uint256 priceImpactPercentage) {
        console.log("start finding best route");
        _amountIn -= (_amountIn * _protocolFee) / 10_000;
        address[] memory path;
        uint256 outputAmount = 0;
        bestPath.swapType = ISoulZap.SwapType.V2;
        if (_fromToken == _toToken) {
            //TODO setting this to address(1) because swaprouter can't be address(0). but also not used in zap now because no swap needed. better way of fixing?
            bestPath.swapRouter = address(1);
            return (bestPath, 0);
        }

        for (uint256 index = 0; index < factories.length; index++) {
            IUniswapV2Router02 router = factoryToRouter[factories[index]];
            (path, outputAmount) = getBestRouteFromFactory(factories[index], router, _fromToken, _toToken, _amountIn);
            if (outputAmount > bestPath.amountOutMin) {
                bestPath.swapRouter = address(router);
                bestPath.path = path;
                bestPath.amountOutMin = outputAmount;
            }
        }
        bestPath.amountOutMin = (bestPath.amountOutMin * (10_000 - _slippage)) / 10_000;

        //Calculation of price impact. actual price is the current actual price which does not take slippage into account for less liquid pairs.
        //It calculates the impact between actual price and price after slippage.
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
            console.log("actualPrice", actualPrice);
        }
        console.log(bestPath.amountOutMin, actualPrice);
        priceImpactPercentage = 10_000 - ((bestPath.amountOutMin * 1e22) / actualPrice);
    }

    function getBestRouteFromFactory(
        IUniswapV2Factory factory,
        IUniswapV2Router02 router,
        address _fromToken,
        address _toToken,
        uint _amountIn
    ) public view returns (address[] memory bestPath, uint256 maxOutputAmount) {
        address[] memory path;
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
            console.log(path[0], path[1], path[2]);
            //TODO important: if we take a protocol fee this calculation/input amount is wrong
            uint[] memory amounts = router.getAmountsOut(_amountIn, path);
            if (amounts[amounts.length - 1] > maxOutputAmount) {
                maxOutputAmount = amounts[amounts.length - 1];
                bestPath = new address[](3);
                bestPath[0] = path[0];
                bestPath[1] = path[1];
                bestPath[2] = path[2];
                console.log("betterpath", bestPath[1], maxOutputAmount);
            }
        }

        //TODO: add a double hop check so both tokens only need to have a pair with any one of the blue chip hop tokens instead of both with the same one
    }
}

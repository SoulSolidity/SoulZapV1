// SPDX-License-Identifier: BUSL-1.1
pragma solidity ^0.8.0;

import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";

contract ZapRoutingUniV2_Lens {
    IUniswapV2Router02 public uniswapV2Router;
    IUniswapV2Factory public uniswapV2Factory;
    // TODO: Probably best to change to topTokens list and then allow it to be dynamic?
    address[] public top10Tokens;

    constructor(address _uniswapV2Router, address _uniswapV2Factory, address[] memory _top10Tokens) {
        uniswapV2Router = IUniswapV2Router02(_uniswapV2Router);
        uniswapV2Factory = IUniswapV2Factory(_uniswapV2Factory);
        top10Tokens = _top10Tokens;
    }

    /**
     * @dev Find tokens in the top 10 that have a pair with the given token
     * @param _token The address of the token
     * @param _tokens The array of token addresses to find pairs with
     */
    function findStartingPairTokens(
        address _token,
        address[] memory _tokens
    ) public view returns (address[] memory startingTokens) {
        startingTokens = new address[](_tokens.length);
        uint count = 0;
        for (uint i = 0; i < _tokens.length; i++) {
            address pair = uniswapV2Factory.getPair(_token, _tokens[i]);
            if (pair != address(0)) {
                startingTokens[count] = _tokens[i];
                count++;
            }
        }
    }

    /**
     * @dev Get the tokens of a pair
     * @param _pair The address of the pair
     */
    function getTokensFromPair(address _pair) public view returns (address token0, address token1) {
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);
        token0 = pair.token0();
        token1 = pair.token1();
    }

    /**
     * @dev Calculate the output amount for a given input amount and pair
     * @param _pair The address of the pair
     * @param _inputAmount The input amount
     * @param _fromToken The address of the input token
     */
    function calculateOutputAmount(address _pair, uint _inputAmount, address _fromToken) public view returns (uint) {
        IUniswapV2Pair pair = IUniswapV2Pair(_pair);
        (uint112 reserve0, uint112 reserve1, ) = pair.getReserves();
        uint reserveIn = pair.token0() == _fromToken ? reserve0 : reserve1;
        uint reserveOut = pair.token0() == _fromToken ? reserve1 : reserve0;
        return uniswapV2Router.getAmountOut(_inputAmount, reserveIn, reserveOut);
    }

    /**
     * @dev Check if a token is in the top 10
     * @param _token The address of the token
     */
    function isInTop10(address _token) public view returns (bool) {
        for (uint i = 0; i < top10Tokens.length; i++) {
            if (top10Tokens[i] == _token) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Find the best route for a given input token and amount
     * @param _fromToken The address of the input token
     * @param _amountIn The input amount
     * @param _toLpToken The address of the output LP token
     */
    function getBestRoute(
        address _fromToken,
        uint _amountIn,
        address _toLpToken
    ) public view returns (address[] memory path, uint[] memory amounts) {
        uint maxOutputAmount = 0;
        address[] memory bestPath;

        (address token0, address token1) = getTokensFromPair(_toLpToken);

        address[] memory startingTokens = findStartingPairTokens(_fromToken, top10Tokens);
        if (startingTokens.length == 0) {
            revert("No starting pair");
        }

        if (!isInTop10(token0) && !isInTop10(token1)) {
            revert("No ending pair");
        }

        // TODO: This is a just a starting approach and needs more sophisticated logic to try all the combinations.
        for (uint i = 0; i < startingTokens.length; i++) {
            for (uint j = 0; j < top10Tokens.length; j++) {
                if (top10Tokens[j] == _fromToken || top10Tokens[j] == startingTokens[i]) {
                    continue;
                }

                address[] memory currentPath = new address[](3);
                currentPath[0] = _fromToken;
                currentPath[1] = startingTokens[i];
                currentPath[2] = top10Tokens[j];

                uint[] memory currentAmounts = uniswapV2Router.getAmountsOut(_amountIn, currentPath);

                if (currentAmounts[currentAmounts.length - 1] > maxOutputAmount) {
                    maxOutputAmount = currentAmounts[currentAmounts.length - 1];
                    bestPath = currentPath;
                }
            }
        }

        if (bestPath.length == 0) {
            revert("No route");
        }

        return (bestPath, uniswapV2Router.getAmountsOut(_amountIn, bestPath));
    }
}

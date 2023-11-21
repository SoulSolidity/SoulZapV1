// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.23;

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

/// -----------------------------------------------------------------------
/// Package Imports
/// -----------------------------------------------------------------------

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

/// -----------------------------------------------------------------------
/// Internal Imports
/// -----------------------------------------------------------------------
import {Constants} from "./utils/Constants.sol";
import {ISoulZap_UniV2} from "./ISoulZap_UniV2.sol";
import {IWETH} from "./lib/IWETH.sol";

// TODO: Remove console.log before production
import "hardhat/console.sol";

/**
 * @title SoulZap_UniV2_Lens
 * @dev This contract is an implementation of AccessManaged interface. It includes functionalities for managing
 *   access to SoulZap_UniV2 contracts.
 * @notice This contract uses AccessManaged for managing access.
 * @author Soul Solidity - Contact for mainnet licensing until 730 days after first deployment transaction with matching bytecode.
 * Otherwise feel free to experiment locally or on testnets.
 * @notice Do not use this contract for any tokens that do not have a standard ERC20 implementation.
 */
contract SoulZap_UniV2_Lens is AccessManaged {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// -----------------------------------------------------------------------
    /// Storage variables public
    /// -----------------------------------------------------------------------

    IWETH public immutable WNATIVE;
    IUniswapV2Factory public factory;
    IUniswapV2Router02 public router;
    ISoulZap_UniV2 public soulZap;

    uint256 public constant MAX_HOP_TOKENS = 20;
    uint256 public constant DEADLINE = 20 minutes;

    /// -----------------------------------------------------------------------
    /// Storage variables internal/private
    /// -----------------------------------------------------------------------

    bytes4 private constant _ZAP_SELECTOR = ISoulZap_UniV2.zap.selector;
    bytes4 private constant _SWAP_SELECTOR = ISoulZap_UniV2.swap.selector;
    uint256 private constant ACCEPTED_FEE_PRICE_IMPACT = (3 * Constants.DENOMINATOR) / 100; // 3%

    EnumerableSet.AddressSet private _hopTokens;

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(
        ISoulZap_UniV2 _soulZap,
        IUniswapV2Router02 _router,
        address[] memory _startingHopTokens
    ) AccessManaged(_soulZap.authority()) {
        require(_router.WETH() == address(_soulZap.WNATIVE()), "SoulZap_UniV2_Lens: WNATIVE != router.WETH()");

        router = _router;
        factory = IUniswapV2Factory(_router.factory());
        // Verify and add hop tokens
        _addHopTokens(_startingHopTokens);

        soulZap = _soulZap;
        WNATIVE = _soulZap.WNATIVE();
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
     * @dev Calculates the output amount for a given input amount and token swap path.
     * @param _inputAmount The amount of input tokens.
     * @param path The token swap path, represented as an array of token addresses.
     * @return amountOut The output amount of tokens.
     */
    function calculateOutputAmount(uint _inputAmount, address[] memory path) public view returns (uint amountOut) {
        try router.getAmountsOut(_inputAmount, path) returns (uint[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
        } catch (bytes memory) {
            //Can error when inputAmount == 0 somewhere in the path with low liquidity pair
            //0 returned when it errors
        }
    }

    /// -----------------------------------------------------------------------
    /// Swap Functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param fromToken The source token for the swap.
     * @param amount The amount of tokens to swap.
     * @param toToken The output token of swap.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the swapped tokens.
     * @return swapParams SwapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentage The price impact percentages.
     */
    function getSwapData(
        address fromToken,
        uint256 amount,
        address toToken,
        uint256 slippage,
        address to
    )
        public
        view
        returns (
            ISoulZap_UniV2.SwapParams memory swapParams,
            bytes memory encodedTx,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256 priceImpactPercentage
        )
    {
        (swapParams, feeSwapPath, priceImpactPercentage) = _getSwapData(fromToken, amount, toToken, slippage, to);
        encodedTx = abi.encodeWithSelector(_SWAP_SELECTOR, swapParams, feeSwapPath);
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param amount The amount of tokens to zap.
     * @param toToken The output token of swap.
     * @param slippage The slippage tolerance percentage. See Constants.DENOMINATOR for percentage denominator.
     * @param to The address to receive the zapped tokens.
     * @return swapParams SwapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentage The price impact percentages.
     */
    function getSwapDataNative(
        uint256 amount,
        address toToken,
        uint256 slippage,
        address to
    )
        public
        view
        returns (
            ISoulZap_UniV2.SwapParams memory swapParams,
            bytes memory encodedTx,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256 priceImpactPercentage
        )
    {
        return getSwapData(Constants.NATIVE_ADDRESS, amount, toToken, slippage, to);
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param fromToken The source token for the swap.
     * @param amount The amount of tokens to swap.
     * @param toToken The output token of swap.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the swapped tokens.
     * @return swapParams SwapParams structure containing relevant data.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentage The price impact percentages.
     */
    function _getSwapData(
        address fromToken,
        uint256 amount,
        address toToken,
        uint256 slippage,
        address to
    )
        internal
        view
        returns (
            ISoulZap_UniV2.SwapParams memory swapParams,
            ISoulZap_UniV2.SwapPath memory feeSwapPath,
            uint256 priceImpactPercentage
        )
    {
        bool nativeSwap = fromToken == Constants.NATIVE_ADDRESS;
        if (nativeSwap) {
            fromToken = address(WNATIVE);
        }

        FeeVars memory feeVars;
        (feeSwapPath, feeVars) = _getFeeSwapPath(fromToken, amount, slippage);
        uint256 amountAfterFee = amount - feeVars.feeAmount;

        ISoulZap_UniV2.SwapPath memory swapPath;
        (swapPath, priceImpactPercentage) = _getBestSwapPathWithImpact(fromToken, toToken, amountAfterFee, slippage);

        swapParams = ISoulZap_UniV2.SwapParams({
            // Set input token to NATIVE_ADDRESS if nativeSwap
            inputToken: nativeSwap ? IERC20(Constants.NATIVE_ADDRESS) : IERC20(fromToken),
            inputAmount: amount, // Use full input amount here
            token: toToken,
            to: to,
            deadline: block.timestamp + DEADLINE,
            path: swapPath
        });
    }

    /// -----------------------------------------------------------------------
    /// Zap Functions
    /// -----------------------------------------------------------------------

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
        uint256 slippage,
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
        (zapParams, feeSwapPath, priceImpactPercentages) = _getZapData(fromToken, amount, lp, slippage, to);
        encodedTx = abi.encodeWithSelector(_ZAP_SELECTOR, zapParams, feeSwapPath);
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param amount The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance percentage. See Constants.DENOMINATOR for percentage denominator.
     * @param to The address to receive the zapped tokens.
     * @return zapParams ZapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function getZapDataNative(
        uint256 amount,
        IUniswapV2Pair lp,
        uint256 slippage,
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
        return getZapData(Constants.NATIVE_ADDRESS, amount, lp, slippage, to);
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token (internal function).
     * @param fromToken The source token for the zap.
     * @param amount The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance percentage. See Constants.DENOMINATOR for percentage denominator.
     * @param to The address to receive the zapped tokens.
     * @return zapParams ZapParams structure containing relevant data.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function _getZapData(
        address fromToken,
        uint256 amount,
        IUniswapV2Pair lp,
        uint256 slippage,
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
        require(lp.factory() == address(factory), "SoulZap_UniV2_Lens: LP factory doesn't match factory");
        bool nativeZap = fromToken == Constants.NATIVE_ADDRESS;
        if (nativeZap) {
            fromToken = address(WNATIVE);
        }

        zapParams.deadline = block.timestamp + DEADLINE;
        zapParams.inputAmount = amount; // Use full input amount here
        // Set input token to NATIVE_ADDRESS if nativeZap
        zapParams.inputToken = nativeZap ? IERC20(Constants.NATIVE_ADDRESS) : IERC20(fromToken);
        zapParams.to = to;

        FeeVars memory feeVars;
        (feeSwapPath, feeVars) = _getFeeSwapPath(fromToken, amount, slippage);
        uint256 amountAfterFee = amount - feeVars.feeAmount;

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
            uint256 halfAmount = amountAfterFee / 2;
            zapParams.token0 = token0;
            zapParams.token1 = token1;
            priceImpactPercentages = new uint256[](2);
            (zapParams.path0, priceImpactPercentages[0]) = _getBestSwapPathWithImpact(
                fromToken,
                token0,
                halfAmount,
                slippage
            );
            (zapParams.path1, priceImpactPercentages[1]) = _getBestSwapPathWithImpact(
                fromToken,
                token1,
                halfAmount,
                slippage
            );
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

    function _getBestPath(
        address _fromToken,
        address _toToken,
        uint _amountIn
    ) internal view returns (address[] memory bestPath, uint256 bestAmountOutMin) {
        if (_fromToken == _toToken) {
            // TEST: Should this be empty or [_fromToken, _toToken]
            return (bestPath, _amountIn);
        }

        // -----------------------------------------------------------------------
        // Check if fromToken and toToken share a pair - 2 paths
        // -----------------------------------------------------------------------
        /// @dev If pair exists, then we will note the output amount and path to compare
        if (pairExists(_fromToken, _toToken)) {
            bestPath = new address[](2);
            bestPath[0] = _fromToken;
            bestPath[1] = _toToken;
            bestAmountOutMin = calculateOutputAmount(_amountIn, bestPath);
        }

        // Find all pairs between input token and hop tokens
        (
            address[] memory sharedHopTokens,
            address[] memory fromTokenHopTokens,
            address[] memory toTokenHopTokens
        ) = findPossibleHopTokens(_fromToken, _toToken);
        // If there are no hop tokens, return the best path
        if (fromTokenHopTokens.length == 0 || toTokenHopTokens.length == 0) {
            if (!pairExists(_fromToken, _toToken)) {
                // TODO: Fail gracefully?
                revert("No swap path found");
            }
            return (bestPath, bestAmountOutMin);
        }

        // -----------------------------------------------------------------------
        // sharedHopTokens - 3 paths
        // -----------------------------------------------------------------------
        if (sharedHopTokens.length > 0) {
            // If there are shared hop tokens, we will check if any of them are better than the current best path
            for (uint i = 0; i < sharedHopTokens.length; i++) {
                // Construct the path through the shared hop token
                address[] memory path = new address[](3);
                path[0] = _fromToken;
                path[1] = sharedHopTokens[i];
                path[2] = _toToken;
                /// @dev Code duplication in twoHopTokens section
                // Calculate the output amount for this path
                uint256 amountOut = calculateOutputAmount(_amountIn, path);

                // Update the best path and best amount out min if this path is better
                if (amountOut > bestAmountOutMin) {
                    bestPath = path;
                    bestAmountOutMin = amountOut;
                }
            }
        }

        // -----------------------------------------------------------------------
        // twoHopTokens - 4 paths
        // -----------------------------------------------------------------------
        // Iterate through all possible pairs to find the best path
        for (uint i = 0; i < fromTokenHopTokens.length; i++) {
            for (uint j = 0; j < toTokenHopTokens.length; j++) {
                // Skip if they equal each other as this is handled in the sharedHopTokens section
                if (fromTokenHopTokens[i] == toTokenHopTokens[j]) {
                    continue;
                }

                // Construct the path through the two hop tokens
                address[] memory path = new address[](4);
                path[0] = _fromToken;
                path[1] = fromTokenHopTokens[i];
                path[2] = toTokenHopTokens[j];
                path[3] = _toToken;
                /// @dev Code duplication in sharedHopTokens section
                // Calculate the output amount for this path
                uint256 amountOut = calculateOutputAmount(_amountIn, path);

                // Update the best path and best amount out min if this path is better
                if (amountOut > bestAmountOutMin) {
                    bestPath = path;
                    bestAmountOutMin = amountOut;
                }
            }
        }

        return (bestPath, bestAmountOutMin);
    }

    /**
     * @dev Get the best route from a Uniswap V2 factory for swapping between two tokens.
     * @param _fromToken The source token for the swap.
     * @param _toToken The target token for the swap.
     * @param _amountIn The input amount for the swap.
     * @param _slippage amountOutMin slippage. This is front run slippage and for the small time difference
     * between read and write tx AND NOT FOR ACTUAL PRICE IMPACT.
     * @return bestPath An array of addresses representing the best route.
     * @return priceImpactPercentage The price impact for the swap.
     */
    function _getBestSwapPathWithImpact(
        address _fromToken,
        address _toToken,
        uint _amountIn,
        uint256 _slippage
    ) internal view returns (ISoulZap_UniV2.SwapPath memory bestPath, uint256 priceImpactPercentage) {
        if (_fromToken == _toToken) {
            //amountOutMin == amountIn if token is the same (needed for liquidity path)
            bestPath.amountOutMin = _amountIn;
            //no price impact if the token doesn't change
            return (bestPath, 0);
        }

        bestPath.swapType = ISoulZap_UniV2.SwapType.V2;
        bestPath.swapRouter = address(router);

        (address[] memory bestPathAddresses, uint256 bestAmountOutMin) = _getBestPath(_fromToken, _toToken, _amountIn);
        bestPath.path = bestPathAddresses;
        bestPath.amountOutMin = (bestAmountOutMin * (Constants.DENOMINATOR - _slippage)) / Constants.DENOMINATOR;

        // Calculation of price impact.
        // Actual price is the current actual price which does not take slippage into account for less liquid pairs.
        // Calculation of price impact between actual price and price after slippage.
        uint256 actualPrice = _amountIn;
        // TODO: Remove console.log before production
        console.log("actualPrice", actualPrice);
        for (uint256 i = 0; i < bestPath.path.length - 1; i++) {
            address token0 = bestPath.path[i];
            address token1 = bestPath.path[i + 1];
            (uint256 reserveA, uint256 reserveB, ) = IUniswapV2Pair(factory.getPair(token0, token1)).getReserves();
            if (token0 > token1) {
                (reserveA, reserveB) = (reserveB, reserveA);
            }
            // Multiply the actual price by the ratio of reserveB to reserveA, scaled by precision to maintain precision
            actualPrice *= (reserveB * Constants.PRECISION) / reserveA;
            // If this is not the first iteration, divide the actual price by precision to correct the scaling
            if (i > 0) {
                actualPrice /= Constants.PRECISION;
            }
            // TODO: Remove console.log before production
            console.log("actualPrice", actualPrice);
        }
        priceImpactPercentage =
            Constants.DENOMINATOR -
            ((bestPath.amountOutMin * (Constants.DENOMINATOR * Constants.PRECISION)) / actualPrice);
        console.log("price impact", priceImpactPercentage);
    }

    /// -----------------------------------------------------------------------
    /// Hop token functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Check if a token is in the hop tokens
     * @param _token The address of the token
     */
    function isHopToken(address _token) public view returns (bool) {
        return _hopTokens.contains(_token);
    }

    /**
     * @dev Returns the length of the hop tokens array.
     * @return The length of the hop tokens array.
     */
    function getHopTokensLength() public view returns (uint256) {
        return _hopTokens.length();
    }

    /**
     * @dev Returns the hop token at the specified index.
     * @param _index The index of the hop token.
     * @return The hop token at the specified index.
     */
    function getHopTokenAtIndex(uint256 _index) public view returns (address) {
        return _hopTokens.at(_index);
    }

    /**
     * @dev Find possible hop tokens for swapping between two specified tokens.
     * @param _fromToken The source token for the swap.
     * @param _toToken The target token for the swap.
     * @return sharedHopTokens An array of shared hop tokens.
     * @return fromHopTokens An array of hop tokens from the source token.
     * @return toHopTokens An array of hop tokens to the target token.
     */
    function findPossibleHopTokens(
        address _fromToken,
        address _toToken
    )
        public
        view
        returns (address[] memory sharedHopTokens, address[] memory fromHopTokens, address[] memory toHopTokens)
    {
        uint256 hopTokensLength = getHopTokensLength();
        sharedHopTokens = new address[](hopTokensLength);
        fromHopTokens = new address[](hopTokensLength);
        toHopTokens = new address[](hopTokensLength);
        uint sharedCount = 0;
        uint fromCount = 0;
        uint toCount = 0;
        for (uint i = 0; i < hopTokensLength; i++) {
            address hopToken = getHopTokenAtIndex(i);
            bool fromHop = pairExists(_fromToken, hopToken);
            if (fromHop) {
                fromHopTokens[fromCount] = hopToken;
                fromCount++;
            }
            bool toHop = pairExists(hopToken, _toToken);
            if (toHop) {
                toHopTokens[toCount] = hopToken;
                toCount++;
            }
            if (fromHop && toHop) {
                sharedHopTokens[sharedCount] = hopToken;
                sharedCount++;
            }
        }
        // Update the length of the array to match the count
        assembly {
            mstore(sharedHopTokens, sharedCount)
            mstore(fromHopTokens, fromCount)
            mstore(toHopTokens, toCount)
        }
    }

    function _addHopTokens(address[] memory tokens) internal {
        /// @dev Gas consideration
        require(tokens.length + _hopTokens.length() <= MAX_HOP_TOKENS, "Exceeded maximum hop tokens limit");
        for (uint256 i = 0; i < tokens.length; i++) {
            address currentToken = tokens[i];
            require(currentToken != address(0), "Hop Token cannot be address(0)");
            require(!isHopToken(currentToken), "Hop Token already included");
            _hopTokens.add(currentToken);
        }
    }

    /// -----------------------------------------------------------------------
    /// Hop token - Restricted functions
    /// -----------------------------------------------------------------------
    function addHopTokens(address[] memory _tokens) external restricted {
        _addHopTokens(_tokens);
    }

    function removeHopTokens(address[] memory _tokens) external restricted {
        for (uint256 i = 0; i < _tokens.length; i++) {
            _hopTokens.remove(_tokens[i]);
        }
    }

    /// -----------------------------------------------------------------------
    /// Fee Functions
    /// -----------------------------------------------------------------------

    struct FeeVars {
        uint256 feePercentage;
        address feeToken;
        uint256 feeAmount;
    }

    function _getFeeSwapPath(
        address _fromToken,
        uint256 _amountIn,
        uint256 _slippage
    ) internal view returns (ISoulZap_UniV2.SwapPath memory feeSwapPath, FeeVars memory feeVars) {
        (address[] memory feeTokens, uint256 currentFeePercentage, uint256 feeDenominator, ) = soulZap.getFeeInfo();
        //If no fees just return
        // FIXME: Tests are failing here
        if (currentFeePercentage == 0 /*|| soulZap.isFeeToken(_fromToken)*/) {
            return (feeSwapPath, feeVars);
        }

        feeVars.feePercentage = currentFeePercentage;
        feeVars.feeAmount = (_amountIn * currentFeePercentage) / feeDenominator;

        for (uint256 i = 0; i < feeTokens.length; i++) {
            feeVars.feeToken = feeTokens[i];
            (ISoulZap_UniV2.SwapPath memory bestPath, uint256 priceImpactPercentage) = _getBestSwapPathWithImpact(
                _fromToken,
                feeVars.feeToken,
                feeVars.feeAmount,
                _slippage
            );
            if (bestPath.amountOutMin > feeSwapPath.amountOutMin) {
                feeSwapPath = bestPath;
                // To save gas usage we break if we get any accepted fee price impact
                // If no path has an accepted fee price impact we just take the best one
                if (priceImpactPercentage < ACCEPTED_FEE_PRICE_IMPACT) {
                    break;
                }
            }
        }

        // TODO: Remove console.log before production
        console.log("feeswappath done");
    }
}

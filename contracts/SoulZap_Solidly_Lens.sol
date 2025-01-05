// SPDX-License-Identifier: BUSL-1.1
pragma solidity 0.8.19;

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
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// -----------------------------------------------------------------------
/// Internal Imports
/// -----------------------------------------------------------------------
import {IRouterV2} from "./lib/IRouterV2.sol";
import {IPairFactory} from "./lib/IPairFactory.sol";
import {IPair} from "./lib/IPair.sol";
import {Constants} from "./utils/Constants.sol";
import {TokenHelper} from "./utils/TokenHelper.sol";
import {SoulAccessManaged} from "./access/SoulAccessManaged.sol";
import {ISoulZap_Solidly} from "./ISoulZap_Solidly.sol";
import {IWETH} from "./lib/IWETH.sol";

/**
 * @title SoulZap_Solidly_Lens
 * @notice Lens contract to build Swap and Zap transaction data for UniswaSolidly like Zaps
 * @author Soul Solidity - Contact for mainnet licensing until 730 days after first deployment transaction with matching bytecode.
 * Otherwise feel free to experiment locally or on testnets.
 * @notice Do not use this contract for any tokens that do not have a standard ERC20 implementation.
 */
contract SoulZap_Solidly_Lens is SoulAccessManaged {
    using EnumerableSet for EnumerableSet.AddressSet;

    /// -----------------------------------------------------------------------
    /// Storage variables public
    /// -----------------------------------------------------------------------

    bytes32 public SOUL_ZAP_ADMIN_ROLE = _getRoleHash("SOUL_ZAP_ADMIN_ROLE");

    IWETH public immutable WNATIVE;
    IPairFactory public factory;
    IRouterV2 public router;
    ISoulZap_Solidly public soulZap;

    uint256 public constant MAX_HOP_TOKENS = 20;

    /// -----------------------------------------------------------------------
    /// Storage variables internal/private
    /// -----------------------------------------------------------------------

    uint256 private constant _ACCEPTED_FEE_PRICE_IMPACT = (3 * Constants.DENOMINATOR) / 100; // 3%

    EnumerableSet.AddressSet private _hopTokens;

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------

    constructor(
        ISoulZap_Solidly _soulZap,
        IRouterV2 _router,
        address[] memory _startingHopTokens
    ) SoulAccessManaged(_soulZap.soulAccessRegistry()) {
        require(_router.wETH() == address(_soulZap.WNATIVE()), "SoulZap_Solidly_Lens: WNATIVE != router.WETH()");

        router = _router;
        factory = IPairFactory(_router.factory());
        // Verify and add hop tokens
        _addHopTokens(_startingHopTokens);

        soulZap = _soulZap;
        WNATIVE = _soulZap.WNATIVE();
    }

    /**
     * @dev Check if a pair exists for two given tokens in the Uniswap V2 factory.
     * @param _token0 The first token of the pair.
     * @param _token1 The second token of the pair.
     * @return True if the pair exists; false otherwise.
     */
    function pairExists(address _token0, address _token1) public view returns (bool) {
        address pair = factory.getPair(_token0, _token1, false);
        if (pair == address(0)) {
            return false;
        }
        return true;
    }

    /**
     * @dev Calculates the output amount for a given input amount and token swap path.
     * @param _amountIn The amount of input tokens.
     * @param _path The token swap path, represented as an array of token addresses.
     * @return amountOut The output amount of tokens.
     */
    function calculateOutputAmount(
        uint256 _amountIn,
        IRouterV2.route[] memory _path
    ) public view returns (uint amountOut) {
        try router.getAmountsOut(_amountIn, _path) returns (uint[] memory amounts) {
            amountOut = amounts[amounts.length - 1];
        } catch (bytes memory) {
            //Can error when amountIn == 0 somewhere in the path with low liquidity pair
            //0 returned when it errors
        }
    }

    /// -----------------------------------------------------------------------
    /// Swap Functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param tokenIn The source token for the swap.
     * @param amountIn The amount of tokens to swap.
     * @param tokenOut The output token of swap.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the swapped tokens.
     * @param deadlineOffset The number of seconds into the future for which the data will be valid.
     * @return swapParams SwapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentage The price impact percentages.
     */
    function getSwapData(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 slippage,
        address to,
        uint256 deadlineOffset
    )
        public
        view
        returns (
            ISoulZap_Solidly.SwapParams memory swapParams,
            bytes memory encodedTx,
            ISoulZap_Solidly.SwapPath memory feeSwapPath,
            uint256 priceImpactPercentage
        )
    {
        (swapParams, feeSwapPath, priceImpactPercentage) = _getSwapData(
            tokenIn,
            amountIn,
            tokenOut,
            slippage,
            to,
            deadlineOffset
        );
        encodedTx = abi.encodeCall(ISoulZap_Solidly.swap, (swapParams, feeSwapPath));
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param amountIn The amount of tokens to zap.
     * @param tokenOut The output token of swap.
     * @param slippage The slippage tolerance percentage. See Constants.DENOMINATOR for percentage denominator.
     * @param to The address to receive the zapped tokens.
     * @param deadlineOffset The number of seconds into the future for which the data will be valid.
     * @return swapParams SwapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentage The price impact percentages.
     */
    function getSwapDataNative(
        uint256 amountIn,
        address tokenOut,
        uint256 slippage,
        address to,
        uint256 deadlineOffset
    )
        public
        view
        returns (
            ISoulZap_Solidly.SwapParams memory swapParams,
            bytes memory encodedTx,
            ISoulZap_Solidly.SwapPath memory feeSwapPath,
            uint256 priceImpactPercentage
        )
    {
        return getSwapData(Constants.NATIVE_ADDRESS, amountIn, tokenOut, slippage, to, deadlineOffset);
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param tokenIn The source token for the swap.
     * @param amountIn The amount of tokens to swap.
     * @param tokenOut The output token of swap.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the swapped tokens.
     * @return swapParams SwapParams structure containing relevant data.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentage The price impact percentages.
     */
    function _getSwapData(
        address tokenIn,
        uint256 amountIn,
        address tokenOut,
        uint256 slippage,
        address to,
        uint256 deadlineOffset
    )
        internal
        view
        returns (
            ISoulZap_Solidly.SwapParams memory swapParams,
            ISoulZap_Solidly.SwapPath memory feeSwapPath,
            uint256 priceImpactPercentage
        )
    {
        // Verify inputs
        require(amountIn > 0, "SoulZap_Solidly_Lens: amountIn must be > 0");
        require(tokenOut != address(0), "SoulZap_Solidly_Lens: token can't be address(0)");
        require(tokenIn != tokenOut, "SoulZap_Solidly_Lens: tokens can't be the same");

        bool nativeSwap = tokenIn == Constants.NATIVE_ADDRESS;
        if (nativeSwap) {
            tokenIn = address(WNATIVE);
        }

        FeeVars memory feeVars;
        (feeSwapPath, feeVars) = _getFeeSwapPath(tokenIn, amountIn, slippage);
        uint256 amountAfterFee = amountIn - feeVars.feeAmount;

        ISoulZap_Solidly.SwapPath memory swapPath;
        (swapPath, priceImpactPercentage) = _getBestSwapPathWithImpact(tokenIn, tokenOut, amountAfterFee, slippage);

        swapParams = ISoulZap_Solidly.SwapParams({
            // Set input token to NATIVE_ADDRESS if nativeSwap
            tokenIn: nativeSwap ? IERC20(Constants.NATIVE_ADDRESS) : IERC20(tokenIn),
            amountIn: amountIn, // Use full input amount here
            tokenOut: tokenOut,
            to: to,
            deadline: block.timestamp + deadlineOffset,
            path: swapPath
        });
    }

    /// -----------------------------------------------------------------------
    /// Zap Functions
    /// -----------------------------------------------------------------------

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param tokenIn The source token for the zap.
     * @param amountIn The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance (1 = 0.01%, 100 = 1%).
     * @param to The address to receive the zapped tokens.
     * @param deadlineOffset The number of seconds into the future for which the data will be valid.
     * @return zapParams ZapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function getZapData(
        address tokenIn,
        uint256 amountIn,
        IPair lp,
        uint256 slippage,
        address to,
        uint256 deadlineOffset
    )
        public
        view
        returns (
            ISoulZap_Solidly.ZapParams memory zapParams,
            bytes memory encodedTx,
            ISoulZap_Solidly.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages
        )
    {
        (zapParams, feeSwapPath, priceImpactPercentages) = _getZapData(
            tokenIn,
            amountIn,
            lp,
            slippage,
            to,
            deadlineOffset
        );
        encodedTx = abi.encodeCall(ISoulZap_Solidly.zap, (zapParams, feeSwapPath));
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token.
     * @param amountIn The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance percentage. See Constants.DENOMINATOR for percentage denominator.
     * @param to The address to receive the zapped tokens.
     * @param deadlineOffset The number of seconds into the future for which the data will be valid.
     * @return zapParams ZapParams structure containing relevant data.
     * @return encodedTx Encoded transaction with the given parameters.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function getZapDataNative(
        uint256 amountIn,
        IPair lp,
        uint256 slippage,
        address to,
        uint256 deadlineOffset
    )
        public
        view
        returns (
            ISoulZap_Solidly.ZapParams memory zapParams,
            bytes memory encodedTx,
            ISoulZap_Solidly.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages
        )
    {
        return getZapData(Constants.NATIVE_ADDRESS, amountIn, lp, slippage, to, deadlineOffset);
    }

    struct Tokens {
        address token0;
        address token1;
    }

    /**
     * @dev Get the Zap data for a transaction with a specified token (internal function).
     * @param tokenIn The source token for the zap.
     * @param amountIn The amount of tokens to zap.
     * @param lp The Uniswap V2 pair contract.
     * @param slippage The slippage tolerance percentage. See Constants.DENOMINATOR for percentage denominator.
     * @param to The address to receive the zapped tokens.
     * @return zapParams ZapParams structure containing relevant data.
     * @return feeSwapPath SwapPath for protocol fees
     * @return priceImpactPercentages The price impact percentages.
     */
    function _getZapData(
        address tokenIn,
        uint256 amountIn,
        IPair lp,
        uint256 slippage,
        address to,
        uint256 deadlineOffset
    )
        internal
        view
        returns (
            ISoulZap_Solidly.ZapParams memory zapParams,
            ISoulZap_Solidly.SwapPath memory feeSwapPath,
            uint256[] memory priceImpactPercentages
        )
    {
        // Verify inputs
        require(amountIn > 0, "SoulZap_Solidly_Lens: amountIn must be > 0");
        require(address(lp) != address(0), "SoulZap_Solidly_Lens: lp can't be address(0)");

        // Can't get factory from lp
        // try lp.factory() returns (address _factory) {
        //     require(_factory == address(factory), "SoulZap_Solidly_Lens: LP factory doesn't match factory");
        // } catch {
        //     revert("SoulZap_Solidly_Lens: Not an LP");
        // }

        bool nativeZap = tokenIn == Constants.NATIVE_ADDRESS;
        if (nativeZap) {
            tokenIn = address(WNATIVE);
        }

        zapParams.deadline = block.timestamp + deadlineOffset;
        zapParams.amountIn = amountIn; // Use full input amount here
        // Set input token to NATIVE_ADDRESS if nativeZap
        zapParams.tokenIn = nativeZap ? IERC20(Constants.NATIVE_ADDRESS) : IERC20(tokenIn);
        zapParams.stable = lp.isStable();
        zapParams.to = to;

        FeeVars memory feeVars;
        (feeSwapPath, feeVars) = _getFeeSwapPath(tokenIn, amountIn, slippage);
        uint256 amountInAfterFee = amountIn - feeVars.feeAmount;

        Tokens memory tokens;

        try IPair(lp).token0() returns (address _token0) {
            tokens.token0 = _token0;
        } catch (bytes memory) {}
        try IPair(lp).token1() returns (address _token1) {
            tokens.token1 = _token1;
        } catch (bytes memory) {}

        if (tokens.token0 != address(0) && tokens.token1 != address(0)) {
            //LP
            uint256 halfAmount = amountInAfterFee / 2;
            zapParams.token0 = tokens.token0;
            zapParams.token1 = tokens.token1;
            priceImpactPercentages = new uint256[](2);
            (zapParams.path0, priceImpactPercentages[0]) = _getBestSwapPathWithImpact(
                tokenIn,
                tokens.token0,
                halfAmount,
                slippage
            );
            (zapParams.path1, priceImpactPercentages[1]) = _getBestSwapPathWithImpact(
                tokenIn,
                tokens.token1,
                halfAmount,
                slippage
            );
            zapParams.liquidityPath = _getLiquidityPath(
                tokens.token0,
                tokens.token1,
                zapParams.stable,
                IPair(lp),
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
     * @param amountAMin The minimum amount of LP token0 to add to liquidity.
     * @param amountBMin The minimum amount of LP token1 to add to liquidity.
     * @return params LiquidityPath structure containing relevant data.
     */
    function _getLiquidityPath(
        address token0,
        address token1,
        bool stable,
        IPair lp,
        uint256 amountAMin,
        uint256 amountBMin
    ) internal view returns (ISoulZap_Solidly.LiquidityPath memory params) {
        (uint256 reserveA, uint256 reserveB, ) = lp.getReserves();
        uint256 totalSupply = lp.totalSupply();
        (uint256 amountA, uint256 amountB, uint256 lpAmount) = router.quoteAddLiquidity(
            token0,
            token1,
            stable,
            amountAMin,
            amountBMin
        );

        params = ISoulZap_Solidly.LiquidityPath({
            lpRouter: address(router),
            lpType: ISoulZap_Solidly.LPType.Solidly,
            amountAMin: amountA,
            amountBMin: amountB,
            lpAmount: lpAmount
        });
    }

    function _getBestPath(
        address _fromToken,
        address _toToken,
        uint _amountIn
    ) internal view returns (IRouterV2.route[] memory bestPath, uint256 bestAmountOut) {
        if (_fromToken == _toToken) {
            return (bestPath, _amountIn);
        }

        // -----------------------------------------------------------------------
        // Check if tokenIn and tokenOut share a pair - 2 paths
        // -----------------------------------------------------------------------
        /// @dev If pair exists, then we will note the output amount and path to compare
        if (pairExists(_fromToken, _toToken)) {
            bestPath = new IRouterV2.route[](1);
            bestPath[0].from = _fromToken;
            bestPath[0].to = _toToken;
            bestPath[0].stable = false;
            bestAmountOut = calculateOutputAmount(_amountIn, bestPath);
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
                // TODO: Fail gracefully
                revert("No swap path found");
            }
            return (bestPath, bestAmountOut);
        }

        // -----------------------------------------------------------------------
        // sharedHopTokens - 3 paths
        // -----------------------------------------------------------------------
        if (sharedHopTokens.length > 0) {
            // If there are shared hop tokens, we will check if any of them are better than the current best path
            for (uint i = 0; i < sharedHopTokens.length; i++) {
                // Construct the path through the shared hop token
                IRouterV2.route[] memory path = new IRouterV2.route[](2);
                path[0].from = _fromToken;
                path[0].to = sharedHopTokens[i];
                path[0].stable = false;

                path[1].from = sharedHopTokens[i];
                path[1].to = _toToken;
                path[1].stable = false;
                /// @dev Code duplication in twoHopTokens section
                // Calculate the output amount for this path
                uint256 amountOut = calculateOutputAmount(_amountIn, path);

                // Update the best path and best amount out min if this path is better
                if (amountOut > bestAmountOut) {
                    bestPath = path;
                    bestAmountOut = amountOut;
                }
            }
        }

        // -----------------------------------------------------------------------
        // twoHopTokens - 4 paths
        // -----------------------------------------------------------------------
        // Iterate through all possible pairs to find the best path
        for (uint i = 0; i < fromTokenHopTokens.length; i++) {
            /// @dev In this case, _toToken will be used twice in the path
            if (fromTokenHopTokens[i] == _toToken) {
                continue;
            }
            for (uint j = 0; j < toTokenHopTokens.length; j++) {
                if (
                    /// @dev In this case, _fromToken will be used twice in the path
                    _fromToken == toTokenHopTokens[j] ||
                    // Skip if they equal each other as this is handled in the sharedHopTokens section
                    fromTokenHopTokens[i] == toTokenHopTokens[j]
                ) {
                    continue;
                }

                // Construct the path through the two hop tokens
                IRouterV2.route[] memory path = new IRouterV2.route[](3);
                path[0].from = _fromToken;
                path[0].to = fromTokenHopTokens[i];
                path[0].stable = false;

                path[1].from = fromTokenHopTokens[i];
                path[1].to = toTokenHopTokens[j];
                path[1].stable = false;

                path[2].from = toTokenHopTokens[j];
                path[2].to = _toToken;
                path[2].stable = false;
                /// @dev Code duplication in sharedHopTokens section
                // Calculate the output amount for this path
                uint256 amountOut = calculateOutputAmount(_amountIn, path);

                // Update the best path and best amount out min if this path is better
                if (amountOut > bestAmountOut) {
                    bestPath = path;
                    bestAmountOut = amountOut;
                }
            }
        }

        return (bestPath, bestAmountOut);
    }

    /**
     * @dev Get the best route from a UniswapSolidly factory for swapping between two tokens.
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
    ) internal view returns (ISoulZap_Solidly.SwapPath memory bestPath, uint256 priceImpactPercentage) {
        if (_fromToken == _toToken) {
            //amountOutMin == amountIn if token is the same (needed for liquidity path)
            bestPath.amountOutMin = _amountIn;
            //no price impact if the token doesn't change
            return (bestPath, 0);
        }

        bestPath.swapType = ISoulZap_Solidly.SwapType.Solidly;
        bestPath.swapRouter = address(router);

        (IRouterV2.route[] memory bestPathAddresses, uint256 bestAmountOut) = _getBestPath(
            _fromToken,
            _toToken,
            _amountIn
        );
        bestPath.path = bestPathAddresses;
        bestPath.amountOut = bestAmountOut;

        // Calculation of price impact.
        // Actual price is the current actual price which does not take slippage into account for less liquid pairs.
        // Calculation of price impact between actual price and price after slippage.
        uint256 actualPrice = _amountIn;

        for (uint256 i = 0; i < bestPath.path.length; i++) {
            address token0 = bestPath.path[i].from;
            address token1 = bestPath.path[i].to;
            (uint256 reserveA, uint256 reserveB, ) = IPair(factory.getPair(token0, token1, false)).getReserves();
            if (token0 > token1) {
                (reserveA, reserveB) = (reserveB, reserveA);
            }
            // Multiply the actual price by the ratio of reserveB to reserveA, scaled by precision to maintain precision
            actualPrice *= (reserveB * Constants.PRECISION) / reserveA;
            // If this is not the first iteration, divide the actual price by precision to correct the scaling
            if (i > 0) {
                actualPrice /= Constants.PRECISION;
            }
        }
        priceImpactPercentage =
            Constants.DENOMINATOR -
            ((bestAmountOut * (Constants.DENOMINATOR * Constants.PRECISION)) / actualPrice);

        // Add slippage after price impact caluclation is done
        bestPath.amountOutMin = (bestAmountOut * (Constants.DENOMINATOR - _slippage)) / Constants.DENOMINATOR;
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
        require(_index < getHopTokensLength(), "SoulZap_Solidly_Lens: index out of bounds");
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
    function addHopTokens(address[] memory _tokens) external onlyAccessRegistryRole(SOUL_ZAP_ADMIN_ROLE) {
        _addHopTokens(_tokens);
    }

    function removeHopTokens(address[] memory _tokens) external onlyAccessRegistryRole(SOUL_ZAP_ADMIN_ROLE) {
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
    ) internal view returns (ISoulZap_Solidly.SwapPath memory feeSwapPath, FeeVars memory feeVars) {
        (address[] memory feeTokens, uint256 currentFeePercentage, uint256 feeDenominator, ) = soulZap.getFeeInfo();
        //If no fees or input token is a fee token just return
        if (currentFeePercentage == 0 || soulZap.isFeeToken(_fromToken)) {
            return (feeSwapPath, feeVars);
        }

        feeVars.feePercentage = currentFeePercentage;
        feeVars.feeAmount = (_amountIn * currentFeePercentage) / feeDenominator;
        // Keep track of the output normalized to 18 decimals
        uint256 normalizedBestAmountOut = 0;
        for (uint256 i = 0; i < feeTokens.length; i++) {
            feeVars.feeToken = feeTokens[i];
            (ISoulZap_Solidly.SwapPath memory bestPath, uint256 priceImpactPercentage) = _getBestSwapPathWithImpact(
                _fromToken,
                feeVars.feeToken,
                feeVars.feeAmount,
                _slippage
            );
            // Normalize the amount out to 18 decimals
            uint256 normalizedAmountOut = TokenHelper.normalizeTokenAmount(feeVars.feeToken, bestPath.amountOutMin);
            if (normalizedAmountOut > normalizedBestAmountOut) {
                normalizedBestAmountOut = normalizedAmountOut;
                feeSwapPath = bestPath;
                // To save gas usage we break if we get any accepted fee price impact
                // If no path has an accepted fee price impact we just take the best one
                if (priceImpactPercentage < _ACCEPTED_FEE_PRICE_IMPACT) {
                    break;
                }
            }
        }
    }
}

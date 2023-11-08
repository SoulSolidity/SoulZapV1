// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

/*
   ▄████████  ▄██████▄  ███    █▄   ▄█                                      
  ███    ███ ███    ███ ███    ███ ███                                      
  ███    █▀  ███    ███ ███    ███ ███                                      
  ███        ███    ███ ███    ███ ███                                      
  ██████████ ███    ███ ███    ███ ███                                      
         ███ ███    ███ ███    ███ ███                                      
   ▄█    ███ ███    ███ ███    ███ ███     ▄                                
 ▄████████▀   ▀██████▀  ████████▀  █████████                                
                                                                           
   ▄████████  ▄██████▄   ▄█        ▄█  ████████▄   ▄█      ███      ▄██   █▄  
  ███    ███ ███    ███ ███       ███  ███   ▀███ ███ ▀███████████▄ ███   ███
  ███    █▀  ███    ███ ███       ███  ███    ███ ███   ▀▀▀███▀▀▀▀▀ ███▄▄▄███
  ███        ███    ███ ███       ███  ███    ███ ███      ███      ▀▀▀▀▀▀███
  ██████████ ███    ███ ███       ███  ███    ███ ███      ███      ▄██   ███
         ███ ███    ███ ███       ███  ███    ███ ███      ███      ███   ███
   ▄█    ███ ███    ███ ███     ▄ ███  ███   ▄███ ███      ███      ███   ███
 ▄████████▀   ▀██████▀  █████████ █▀   ████████▀  █▀      ▄███       ▀█████▀     

 * App:             https:// TODO
 * Medium:          https:// TODO
 * Twitter:         https:// TODO
 * Discord:         https:// TODO
 * Telegram:        https:// TODO
 * Announcements:   https:// TODO
 * GitHub:          https:// TODO
 */

import "./ISoulZap.sol";
import "./lib/IApeRouter02.sol";
import "./lib/IApeFactory.sol";
import "./lib/IApePair.sol";
import "./lib/IWETH.sol";
import {ISoulFeeManager} from "./fee-manager/ISoulFeeManager.sol";
import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {EpochTracker} from "./EpochTracker.sol";
import {TransferHelper} from "./utils/TransferHelper.sol";

// TODO: Need to rename this file to SoulZap_UniV2.sol
contract SoulZap_UniV2 is ISoulZap, EpochTracker, TransferHelper, ReentrancyGuard, AccessManaged, Pausable {
    using SafeERC20 for IERC20;

    // TODO:? Move to ISoulZap_LocalVars for cleanup?
    struct LocalVars {
        uint256 amount0In;
        uint256 amount1In;
        uint256 amount0Out;
        uint256 amount1Out;
        uint256 amount0Lp;
        uint256 amount1Lp;
    }

    // struct minAmountsLocalVars {
    //     uint256 inputAmountHalf;
    //     uint256 amountOutMin0;
    //     uint256 amountOutMin1;
    //     IApeFactory factory;
    //     address token0;
    //     address token1;
    //     address inputToken;
    //     uint256 amount0;
    //     uint256 amount1;
    //     uint256 reserveA;
    //     uint256 reserveB;
    //     address uniV3Pool;
    //     address arrakisPool;
    //     uint256 weightedPrice0;
    //     uint256 weightedPrice1;
    // }

    ISoulFeeManager public soulFeeManager;

    // TODO: Add feature string here?
    // string public featureName;

    event Zap(ZapParams zapParams);
    event ZapNative(ZapParams zapParams);

    constructor(
        IWETH _wnative,
        ISoulFeeManager _soulFeeManager,
        address _accessManager
    ) TransferHelper(_wnative) AccessManaged(_accessManager) EpochTracker(0) {
        // TODO: validate?
        soulFeeManager = _soulFeeManager;
    }

    /// @dev The receive method is used as a fallback function in a contract
    /// and is called when ether is sent to a contract with no calldata.
    receive() external payable {
        require(msg.sender == address(WNATIVE), "SoulZap: Only receive ether from wrapped");
    }

    // TODO: Just go with `pause` and `unpause`?
    function pauseAll() public restricted {
        _pause();
    }

    function unpauseAll() public restricted {
        _unpause();
    }

    /// @notice Zap single token to LP
    /// @param zapParams all parameters for zap
    function zap(ZapParams memory zapParams) external override nonReentrant whenNotPaused {
        uint256 balanceBefore = _getBalance(zapParams.inputToken);
        zapParams.inputToken.safeTransferFrom(msg.sender, address(this), zapParams.inputAmount);
        zapParams.inputAmount = _getBalance(zapParams.inputToken) - balanceBefore;

        _zap(zapParams, false, soulFeeManager.getFee(getEpochVolume()));
    }

    /// @notice Zap native token to LP
    /// @param zapParamsNative all parameters for native zap
    function zapNative(ZapParamsNative memory zapParamsNative) external payable override nonReentrant whenNotPaused {
        (IERC20 wNative, uint256 inputAmount) = _wrapNative();

        ZapParams memory zapParams = ZapParams({
            inputToken: wNative,
            inputAmount: inputAmount,
            token0: zapParamsNative.token0,
            token1: zapParamsNative.token1,
            path0: zapParamsNative.path0,
            path1: zapParamsNative.path1,
            liquidityPath: zapParamsNative.liquidityPath,
            to: zapParamsNative.to,
            deadline: zapParamsNative.deadline
        });

        _zap(zapParams, true, soulFeeManager.getFee(getEpochVolume()));
    }

    // TODO: This is not needed anymore as we use a different lens contract to get best routing and these min amounts for slippage
    // /// @notice get min amounts for swaps
    // /// @param params all params
    // function getMinAmounts(
    //     MinAmountsParams memory params
    // ) external view override returns (uint256[2] memory minAmountsSwap, uint256[2] memory minAmountsLP) {
    //     require(params.path0.path.length >= 2 || params.path1.path.length >= 2, "SoulZap: Needs at least one path");

    //     minAmountsLocalVars memory vars;

    //     IApeFactory factory;
    //     vars.token0 = params.path0.path.length == 0
    //         ? params.path1.path[0]
    //         : params.path0.path[params.path0.path.length - 1];
    //     vars.token1 = params.path1.path.length == 0
    //         ? params.path0.path[0]
    //         : params.path1.path[params.path1.path.length - 1];
    //     vars.inputToken = params.path0.path.length > 0 ? params.path0.path[0] : params.path1.path[0];

    //     //get min amounts for swap
    //     // V2 swap and based on V2 also V3 estimate assuming no arbitrage exists
    //     IApeRouter02 router = IApeRouter02(params.path0.swapRouter);
    //     factory = IApeFactory(router.factory());
    //     vars.inputAmountHalf = params.inputAmount / 2;
    //     vars.amountOutMin0 = vars.inputAmountHalf;
    //     if (params.path0.path.length != 0) {
    //         uint256[] memory amountsOut0 = router.getAmountsOut(vars.inputAmountHalf, params.path0.path);
    //         vars.amountOutMin0 = amountsOut0[amountsOut0.length - 1];
    //     }
    //     vars.amountOutMin1 = vars.inputAmountHalf;
    //     if (params.path1.path.length != 0) {
    //         uint256[] memory amountsOut1 = router.getAmountsOut(vars.inputAmountHalf, params.path1.path);
    //         vars.amountOutMin1 = amountsOut1[amountsOut1.length - 1];
    //     }
    //     minAmountsSwap = [vars.amountOutMin0, vars.amountOutMin1];

    //     // get min amounts for adding liquidity
    //     if (params.liquidityPath.lpType == LPType.V2) {
    //         //V2 LP
    //         IApePair lp = IApePair(factory.getPair(vars.token0, vars.token1));
    //         (vars.reserveA, vars.reserveB, ) = lp.getReserves();
    //         if (vars.token0 == lp.token1()) {
    //             (vars.reserveA, vars.reserveB) = (vars.reserveB, vars.reserveA);
    //         }
    //         uint256 amountB = IApeRouter02(params.path0.swapRouter).quote(
    //             vars.amountOutMin0,
    //             vars.reserveA,
    //             vars.reserveB
    //         );
    //         minAmountsLP = [vars.amountOutMin0, amountB];
    //     } else {
    //         revert("LP is not yet supported");
    //     }
    // }

    /// @notice Ultimate ZAP function
    /// @dev Assumes tokens are already transferred to this contract
    /// @param zapParams all parameters for zap
    /// swapRouter swap router
    /// swapType type of swap zap
    /// lpRouter lp router
    /// lpType type of lp zap
    /// arrakisFactory Arrakis factory
    /// inputToken Address of token to turn into an LP Token
    /// inputAmount Amount of inputToken to deposit into LP
    /// token0 first underlying token of LP
    /// token1 second underlying token of LP
    /// path0 path from input token to first underlying token of LP
    /// amountOutMin0 min amount of token0 to receive after swap
    /// uniV3PoolFees0 pool fees for path0 for when type of swap is V3
    /// path1 path from input token to second underlying token of LP
    /// amountOutMin1 min amount of token1 to receive after swap
    /// uniV3PoolFees1 pool fees for path1 for when type of swap is V3
    /// minAmountLP0 min amount of token0 to use when adding liquidity
    /// minAmountLP1 min amount of token1 to use when adding liquidity
    /// uniV3PoolLPFee pool fee of LP for when lp type is Arrakis or V3
    /// to Address which receives the LP Tokens
    /// deadline Latest timestamp this call is valid
    /// @param native Unwrap Wrapped Native tokens before transferring
    /// @param protocolFee Protocol fee to take
    function _zap(ZapParams memory zapParams, bool native, uint256 protocolFee) internal {
        // Verify inputs
        require(zapParams.to != address(0), "SoulZap: Can't zap to null address");
        require(
            zapParams.path0.swapRouter != address(0) &&
                zapParams.path1.swapRouter != address(0) &&
                zapParams.liquidityPath.lpRouter != address(0),
            "SoulZap: swap and lp routers can not be address(0)"
        );
        require(zapParams.token0 != address(0), "SoulZap: token0 can not be address(0)");
        require(zapParams.token1 != address(0), "SoulZap: token1 can not be address(0)");
        // Setup struct to prevent stack overflow
        LocalVars memory vars;
        // Ensure token addresses and paths are in ascending numerical order
        if (zapParams.token1 < zapParams.token0) {
            (zapParams.token0, zapParams.token1) = (zapParams.token1, zapParams.token0);
            (zapParams.path0, zapParams.path1) = (zapParams.path1, zapParams.path0);
        }

        //Take protocol fee
        //TODO: it takes fee in form of input token. Can we somehow get blue chips? or is there another way?
        if (protocolFee > 0) {
            // TODO: Hardcoded 10_000
            uint256 feeAmount = (zapParams.inputAmount * protocolFee) / 10_000;
            zapParams.inputAmount -= feeAmount;
            // TODO: Currently intending on using something like _routerSwap to swap to the proper token. Not fully fleshed out though. EpochTracker is a contract which can be used to track volume.
            // zapParams.inputToken.safeTransfer(soulFee.getFeeCollector(), feeAmount);
        }

        /**
         * Setup swap amount0 and amount1
         */
        if (zapParams.liquidityPath.lpType == LPType.V2) {
            // Handle UniswapV2 Liquidity
            require(
                IApeFactory(IApeRouter02(zapParams.liquidityPath.lpRouter).factory()).getPair(
                    zapParams.token0,
                    zapParams.token1
                ) != address(0),
                "SoulZap: Pair doesn't exist"
            );
            vars.amount0In = zapParams.inputAmount / 2;
            vars.amount1In = zapParams.inputAmount / 2;
        } else {
            revert("SoulZap: LPType not supported");
        }

        /**
         * Handle token0 Swap
         */
        if (zapParams.token0 != address(zapParams.inputToken)) {
            require(zapParams.path0.path[0] == address(zapParams.inputToken), "SoulZap: wrong path path0[0]");
            require(
                zapParams.path0.path[zapParams.path0.path.length - 1] == zapParams.token0,
                "SoulZap: wrong path path0[-1]"
            );
            zapParams.inputToken.approve(zapParams.path0.swapRouter, vars.amount0In);
            vars.amount0Out = _routerSwapFromPath(zapParams.path0, vars.amount0In, zapParams.deadline);
        } else {
            vars.amount0Out = zapParams.inputAmount - vars.amount1In;
        }
        /**
         * Handle token1 Swap
         */
        if (zapParams.token1 != address(zapParams.inputToken)) {
            require(zapParams.path1.path[0] == address(zapParams.inputToken), "SoulZap: wrong path path1[0]");
            require(
                zapParams.path1.path[zapParams.path1.path.length - 1] == zapParams.token1,
                "SoulZap: wrong path path1[-1]"
            );
            zapParams.inputToken.approve(zapParams.path1.swapRouter, vars.amount1In);
            vars.amount1Out = _routerSwapFromPath(zapParams.path1, vars.amount1In, zapParams.deadline);
        } else {
            vars.amount1Out = zapParams.inputAmount - vars.amount0In;
        }

        /**
         * Handle Liquidity Add
         */
        IERC20(zapParams.token0).approve(address(zapParams.liquidityPath.lpRouter), vars.amount0Out);
        IERC20(zapParams.token1).approve(address(zapParams.liquidityPath.lpRouter), vars.amount1Out);

        if (zapParams.liquidityPath.lpType == LPType.V2) {
            // Add liquidity to UniswapV2 Pool
            (vars.amount0Lp, vars.amount1Lp, ) = IApeRouter02(zapParams.liquidityPath.lpRouter).addLiquidity(
                zapParams.token0,
                zapParams.token1,
                vars.amount0Out,
                vars.amount1Out,
                zapParams.liquidityPath.minAmountLP0,
                zapParams.liquidityPath.minAmountLP1,
                zapParams.to,
                zapParams.deadline
            );
        } else {
            revert("SoulZap: lpType not supported");
        }

        if (zapParams.token0 == address(WNATIVE)) {
            // Ensure WNATIVE is called last
            _transferOut(IERC20(zapParams.token1), vars.amount1Out - vars.amount1Lp, msg.sender, native);
            _transferOut(IERC20(zapParams.token0), vars.amount0Out - vars.amount0Lp, msg.sender, native);
        } else {
            _transferOut(IERC20(zapParams.token0), vars.amount0Out - vars.amount0Lp, msg.sender, native);
            _transferOut(IERC20(zapParams.token1), vars.amount1Out - vars.amount1Lp, msg.sender, native);
        }

        if (native) {
            emit ZapNative(zapParams);
        } else {
            emit Zap(zapParams);
        }
    }

    function _routerSwapFromPath(
        SwapPath memory _uniSwapPath,
        uint256 _amountIn,
        uint256 _deadline
    ) private returns (uint256 amountOut) {
        require(_uniSwapPath.path.length >= 2, "SoulZap: need path0 of >=2");
        address outputToken = _uniSwapPath.path[_uniSwapPath.path.length - 1];
        uint256 balanceBefore = _getBalance(IERC20(outputToken));
        _routerSwap(
            _uniSwapPath.swapRouter,
            _uniSwapPath.swapType,
            _amountIn,
            _uniSwapPath.amountOutMin,
            _uniSwapPath.path,
            _deadline
        );
        amountOut = _getBalance(IERC20(outputToken)) - balanceBefore;
    }

    function _routerSwap(
        address router,
        SwapType swapType,
        uint256 amountIn,
        uint256 amountOutMin,
        address[] memory path,
        uint256 deadline
    ) private {
        if (swapType == SwapType.V2) {
            // TODO ZapFee: Can use this to take the fee and send to the feeCollector if fee route is passed from lens
            // Perform UniV2 swap
            IApeRouter02(router).swapExactTokensForTokens(amountIn, amountOutMin, path, address(this), deadline);
        } else {
            revert("SoulZap: SwapType not supported");
        }
    }
}

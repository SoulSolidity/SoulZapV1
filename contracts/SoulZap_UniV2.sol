// SPDX-License-Identifier: BUSL-1.1
// TODO: Last thing update compiler version to 0.8.23
pragma solidity 0.8.23;

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

/// -----------------------------------------------------------------------
/// Package Imports (alphabetical)
/// -----------------------------------------------------------------------

import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {IUniswapV2Factory} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Factory.sol";
import {IUniswapV2Pair} from "@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// -----------------------------------------------------------------------
/// Local Imports (alphabetical)
/// -----------------------------------------------------------------------
import {IWETH} from "./lib/IWETH.sol";
import {EpochVolumeTracker} from "./utils/EpochVolumeTracker.sol";
import {ISoulFeeManager} from "./fee-manager/ISoulFeeManager.sol";
import {ISoulZap_UniV2} from "./ISoulZap_UniV2.sol";
import {TransferHelper} from "./utils/TransferHelper.sol";

/*
/// @dev The receive method is used as a fallback function in a contract
/// and is called when ether is sent to a contract with no calldata.

*/
/**
 * @title SoulZap_UniV2
 * @dev This contract is an implementation of ISoulZap interface. It includes functionalities for zapping in and out of
 * UniswapV2 type liquidity pools.
 * @notice This contract uses SafeERC20 for safe token transfers.
 * @author Soul Solidity - (Contact for mainnet licensing until 730 days after the deployment transaction. Otherwise
 * feel free to experiment locally or on testnets.)
 * @notice Do not use this contract for any tokens that do not have a standard ERC20 implementation.
 */

contract SoulZap_UniV2 is
    ISoulZap_UniV2,
    /// @dev other extensions in alphabetical order
    AccessManaged,
    EpochVolumeTracker,
    Initializable,
    Pausable,
    ReentrancyGuard,
    TransferHelper
{
    using SafeERC20 for IERC20;

    /// -----------------------------------------------------------------------
    /// Storage variables
    /// -----------------------------------------------------------------------

    ISoulFeeManager public soulFeeManager;

    /// -----------------------------------------------------------------------
    /// Events
    /// -----------------------------------------------------------------------

    event Zap(ZapParams zapParams);
    event ZapNative(ZapParams zapParams);

    /// -----------------------------------------------------------------------
    /// Errors
    /// -----------------------------------------------------------------------

    // TODO: Refactor `require` to revert
    error SoulZap_ReceiveOnlyFromWNative();
    error SoulZap_ZapToNullAddressError();
    error SoulZap_SwapAndLpRoutersNullError();
    error SoulZap_Token0NullError();
    error SoulZap_Token1NullError();

    /// -----------------------------------------------------------------------
    /// Constructor
    /// -----------------------------------------------------------------------
    // TODO: Considering adding a function `optionalInit` which can be called after the constructor to set the initial to allow for constructor deploys and also upgradeable deploys.
    // But it's a NTH at this point.
    constructor(
        address _accessManager,
        IWETH _wnative,
        ISoulFeeManager _soulFeeManager,
        /// @dev Set to zero to start epoch tracking immediately
        uint256 _epochStartTime
    ) AccessManaged(_accessManager) EpochVolumeTracker(0, _epochStartTime) TransferHelper(_wnative) {
        // TODO: validate?
        soulFeeManager = _soulFeeManager;
    }

    /// @dev The receive method is used as a fallback function in a contract
    /// and is called when ether is sent to a contract with no calldata.
    receive() external payable {
        if (msg.sender != address(WNATIVE)) revert SoulZap_ReceiveOnlyFromWNative();
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
    function zap(ZapParams memory zapParams) external override nonReentrant {
        uint256 balanceBefore = _getBalance(zapParams.inputToken);
        zapParams.inputToken.safeTransferFrom(msg.sender, address(this), zapParams.inputAmount);
        zapParams.inputAmount = _getBalance(zapParams.inputToken) - balanceBefore;

        _zap(zapParams, false, soulFeeManager.getFee(getEpochVolume()));
    }

    /// @notice Zap native token to LP
    /// @param zapParamsNative all parameters for native zap
    function zapNative(ZapParamsNative memory zapParamsNative) external payable override nonReentrant {
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

    /// @notice Ultimate ZAP function
    /// @dev Assumes tokens are already transferred to this contract.
    /// - whenNotPaused: Only works when not paused which also pauses all other extensions which extend this
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
    function _zap(ZapParams memory zapParams, bool native, uint256 protocolFee) internal whenNotPaused {
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
                IUniswapV2Factory(IUniswapV2Router02(zapParams.liquidityPath.lpRouter).factory()).getPair(
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
            (vars.amount0Lp, vars.amount1Lp, ) = IUniswapV2Router02(zapParams.liquidityPath.lpRouter).addLiquidity(
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
            IUniswapV2Router02(router).swapExactTokensForTokens(amountIn, amountOutMin, path, address(this), deadline);
        } else {
            revert("SoulZap: SwapType not supported");
        }
    }
}

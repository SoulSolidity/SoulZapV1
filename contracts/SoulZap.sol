// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.15;

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

import "./lib/ISoulZap.sol";
import "./lib/IApeRouter02.sol";
import "./lib/IApeFactory.sol";
import "./lib/IApePair.sol";
import "./lib/IWETH.sol";
import "./SoulFee.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract SoulZap is ISoulZap, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct LocalVars {
        uint256 amount0In;
        uint256 amount1In;
        uint256 amount0Out;
        uint256 amount1Out;
        uint256 amount0Lp;
        uint256 amount1Lp;
    }

    address public immutable WNATIVE;
    SoulFee public soulFee;

    event Zap(ZapParams zapParams);
    event ZapNative(ZapParams zapParams);

    constructor(address _wnative, SoulFee _soulFee) Ownable() {
        WNATIVE = _wnative;
        soulFee = _soulFee;
    }

    /// @dev The receive method is used as a fallback function in a contract
    /// and is called when ether is sent to a contract with no calldata.
    receive() external payable {
        require(msg.sender == WNATIVE, "ApeBond: Only receive ether from wrapped");
    }

    function pauseAll() public onlyOwner {
        _pause();
    }

    function unpauseAll() public onlyOwner {
        _unpause();
    }

    /// @notice Zap single token to LP
    /// @param zapParams all parameters for zap
    function zap(ZapParams memory zapParams) external override nonReentrant whenNotPaused {
        _zapInternal(zapParams, soulFee.getFee("zap"));
    }

    /// @notice Zap native token to LP
    /// @param zapParams all parameters for native zap
    function zapNative(ZapParamsNative memory zapParams) external payable override nonReentrant whenNotPaused {
        _zapNativeInternal(zapParams, soulFee.getFee("zap"));
    }

    function _zapInternal(ZapParams memory zapParams, uint256 protocolFee) internal {
        uint256 balanceBefore = _getBalance(zapParams.inputToken);
        zapParams.inputToken.safeTransferFrom(msg.sender, address(this), zapParams.inputAmount);
        zapParams.inputAmount = _getBalance(zapParams.inputToken) - balanceBefore;

        _zapPrivate(zapParams, false, protocolFee);
        emit Zap(zapParams);
    }

    function _zapNativeInternal(ZapParamsNative memory zapParamsNative, uint256 protocolFee) internal {
        uint256 inputAmount = msg.value;
        IERC20 inputToken = IERC20(WNATIVE);
        IWETH(WNATIVE).deposit{value: inputAmount}();

        ZapParams memory zapParams = ZapParams({
            inputToken: inputToken,
            inputAmount: inputAmount,
            token0: zapParamsNative.token0,
            token1: zapParamsNative.token1,
            path0: zapParamsNative.path0,
            path1: zapParamsNative.path1,
            liquidityPath: zapParamsNative.liquidityPath,
            to: zapParamsNative.to,
            deadline: zapParamsNative.deadline
        });

        _zapPrivate(zapParams, true, protocolFee);
        emit ZapNative(zapParams);
    }

    function _transfer(address token, uint256 amount, bool native) internal {
        if (amount == 0) return;
        if (token == WNATIVE && native) {
            IWETH(WNATIVE).withdraw(amount);
            // 2600 COLD_ACCOUNT_ACCESS_COST plus 2300 transfer gas - 1
            // Intended to support transfers to contracts, but not allow for further code execution
            (bool success, ) = msg.sender.call{value: amount, gas: 4899}("");
            require(success, "native transfer error");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }
    }

    function _getBalance(IERC20 token) internal view returns (uint256 balance) {
        balance = token.balanceOf(address(this));
    }

    /// @notice Ultimate ZAP function
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
    function _zapPrivate(ZapParams memory zapParams, bool native, uint256 protocolFee) private {
        // Verify inputs
        require(zapParams.to != address(0), "ApeBond: Can't zap to null address");
        require(
            zapParams.path0.swapRouter != address(0) &&
                zapParams.path1.swapRouter != address(0) &&
                zapParams.liquidityPath.lpRouter != address(0),
            "ApeBond: swap and lp routers can not be address(0)"
        );
        require(zapParams.token0 != address(0), "ApeBond: token0 can not be address(0)");
        require(zapParams.token1 != address(0), "ApeBond: token1 can not be address(0)");
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
            uint256 feeAmount = (zapParams.inputAmount * protocolFee) / 10_000;
            zapParams.inputAmount -= feeAmount;
            zapParams.inputToken.safeTransfer(soulFee.getFeeCollector(), feeAmount);
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
                "ApeBond: Pair doesn't exist"
            );
            vars.amount0In = zapParams.inputAmount / 2;
            vars.amount1In = zapParams.inputAmount / 2;
        } else {
            revert("ApeBond: LPType not supported");
        }

        /**
         * Handle token0 Swap
         */
        if (zapParams.token0 != address(zapParams.inputToken)) {
            require(zapParams.path0.path[0] == address(zapParams.inputToken), "ApeBond: wrong path path0[0]");
            require(
                zapParams.path0.path[zapParams.path0.path.length - 1] == zapParams.token0,
                "ApeBond: wrong path path0[-1]"
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
            require(zapParams.path1.path[0] == address(zapParams.inputToken), "ApeBond: wrong path path1[0]");
            require(
                zapParams.path1.path[zapParams.path1.path.length - 1] == zapParams.token1,
                "ApeBond: wrong path path1[-1]"
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
            revert("ApeBond: lpType not supported");
        }

        if (zapParams.token0 == WNATIVE) {
            // Ensure WNATIVE is called last
            _transfer(zapParams.token1, vars.amount1Out - vars.amount1Lp, native);
            _transfer(zapParams.token0, vars.amount0Out - vars.amount0Lp, native);
        } else {
            _transfer(zapParams.token0, vars.amount0Out - vars.amount0Lp, native);
            _transfer(zapParams.token1, vars.amount1Out - vars.amount1Lp, native);
        }
    }

    function _routerSwapFromPath(
        SwapPath memory _uniSwapPath,
        uint256 _amountIn,
        uint256 _deadline
    ) private returns (uint256 amountOut) {
        require(_uniSwapPath.path.length >= 2, "ApeBond: need path0 of >=2");
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
            // Perform UniV2 swap
            IApeRouter02(router).swapExactTokensForTokens(amountIn, amountOutMin, path, address(this), deadline);
        } else {
            revert("ApeBond: SwapType not supported");
        }
    }
}

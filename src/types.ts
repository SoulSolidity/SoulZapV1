import { BigNumber } from "ethers";
import { LPType, SwapType } from "./constants";

/// -----------------------------------------------------------------------
/// Generic types
/// -----------------------------------------------------------------------

// Define a type for the successful result
type BasicSuccess<T> = {
  success: true;
  value: T;
};

// Define a utility type that flattens the structure if the value is an object
export type Success<T> = T extends object ? BasicSuccess<T> & T : BasicSuccess<T>;

// Define a type for the error
export type Failure = {
  success: false;
  error: string; // You can customize the error type based on your needs
};

/// -----------------------------------------------------------------------
/// Specific types
/// -----------------------------------------------------------------------

export type SwapPath = {
  swapRouter: string;
  swapType: SwapType;
  path: string[];
  amountOutMin: number | string;
};

export type LiquidityPath = {
  lpRouter: string;
  lpType: LPType;
  minAmountLP0: number | string;
  minAmountLP1: number | string;
};

export type ZapParams = {
  inputToken: string,
  inputAmount: number | string,
  token0: string,
  token1: string,
  path0: SwapPath,
  path1: SwapPath,
  liquidityPath: LiquidityPath,
  to: string,
  deadline: number | string
};

export type ZapParamsNative = {
  token0: string,
  token1: string,
  path0: SwapPath,
  path1: SwapPath,
  liquidityPath: LiquidityPath,
  to: string,
  deadline: number | string
};

export type zapData = Success<{
  encodedTx: string,
  zapParams: ZapParams | ZapParamsNative,
  feeSwapPath: SwapPath,
  priceImpactPercentages: BigNumber[]
}> | Failure

export type ZapParams_Ext_Bonds = {
  bond: string,
  maxPrice: number | string
}

export type zapDataBond = Success<{
  encodedTx: string,
  zapParams: ZapParams | ZapParamsNative,
  feeSwapPath: SwapPath,
  priceImpactPercentages: BigNumber[],
  zapParamsBonds: ZapParams_Ext_Bonds
}> | Failure



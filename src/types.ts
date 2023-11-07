import { LPType, SwapType } from "./constants";

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

export type ZapParamsBond = {
  zapParams: ZapParams;
  bill: string;
  maxPrice: number | string;
};

export type ZapParamsBondNative = {
  zapParams: ZapParamsNative;
  bill: string;
  maxPrice: number | string;
};

export type ZapBondData = {
  params: ZapParamsBond,
  encodedParams: string,
  encodedTx: string
}

export type ZapBondDataNative = {
  params: ZapParamsBondNative,
  encodedParams: string,
  encodedTx: string
}
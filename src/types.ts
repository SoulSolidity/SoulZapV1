import { BigNumber } from 'ethers'
import { LPType, SwapType } from './constants'

/// -----------------------------------------------------------------------
/// Generic types
/// -----------------------------------------------------------------------

// Define a type for the successful result
type BasicSuccess<T> = {
  success: true
  value: T
}

// Define a utility type that flattens the structure if the value is an object
export type Success<T> = T extends object ? { success: true } & T : BasicSuccess<T>

// Define a type for the error
export type Failure = {
  success: false
  error: string // You can customize the error type based on your needs
}

export type SuccessOrFailure<T> = Success<T> | Failure

/// -----------------------------------------------------------------------
/// Swap Path
/// -----------------------------------------------------------------------

export type SwapPath = {
  swapRouter: string
  swapType: SwapType
  path: string[]
  amountOutMin: BigNumber
  //Extra vars
  amountOut: BigNumber
}

/// -----------------------------------------------------------------------
/// Liquidity Path
/// -----------------------------------------------------------------------

export type LiquidityPath = {
  lpRouter: string
  lpType: LPType
  amountAMin: BigNumber
  amountBMin: BigNumber
  lpAmount: BigNumber
}

/// -----------------------------------------------------------------------
/// Swap Params
/// -----------------------------------------------------------------------

export type SwapParams = {
  tokenIn: string
  amountIn: BigNumber
  tokenOut: string
  path: SwapPath
  to: string
  deadline: BigNumber
}

export type SwapData = {
  encodedTx: string
  swapParams: SwapParams
  feeSwapPath: SwapPath
  priceImpactPercentages: BigNumber[]
}

export type SwapDataExtras = {
  tokenInUsdPrice: BigNumber
  tokenOutUsdPrice: BigNumber
}

export type SwapDataResult = Success<SwapData & SwapDataExtras> | Failure

/// -----------------------------------------------------------------------
/// Zap Params
/// -----------------------------------------------------------------------

export type ZapParams = {
  tokenIn: string
  amountIn: BigNumber
  token0: string
  token1: string
  path0: SwapPath
  path1: SwapPath
  liquidityPath: LiquidityPath
  to: string
  deadline: BigNumber
}

export type ZapData = {
  encodedTx: string
  zapParams: ZapParams
  feeSwapPath: SwapPath
  priceImpactPercentages: BigNumber[]
}

export type ZapDataExtras = {
  tokenInUsdPrice: BigNumber
  tokenOutUsdPrice: BigNumber
}

export type ZapDataResult = Success<ZapData & ZapDataExtras> | Failure

/// -----------------------------------------------------------------------
/// Zap Bond Params
/// -----------------------------------------------------------------------

export type ZapParams_Ext_Bonds = {
  bond: string
  maxPrice: BigNumber
}

export type ZapDataBond = {
  encodedTx: string
  zapParams: ZapParams
  feeSwapPath: SwapPath
  priceImpactPercentages: BigNumber[]
  zapParamsBonds: ZapParams_Ext_Bonds
}

export type ZapDataBondExtras = {
  tokenInUsdPrice: BigNumber
  tokenOutUsdPrice: BigNumber
}

export type ZapDataBondResult = Success<ZapDataBond & ZapDataBondExtras> | Failure

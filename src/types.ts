import { BigNumber } from 'ethers'
import { LPType, SwapType } from './constants'

export type SwapPath = {
  swapRouter: string
  swapType: SwapType
  path: string[]
  amountOutMin: number | string
}

export type LiquidityPath = {
  lpRouter: string
  lpType: LPType
  minAmountLP0: number | string
  minAmountLP1: number | string
}

export type ZapParams = {
  inputToken: string
  inputAmount: number | string
  token0: string
  token1: string
  path0: SwapPath
  path1: SwapPath
  liquidityPath: LiquidityPath
  to: string
  deadline: number | string
}

export type ZapParamsNative = {
  token0: string
  token1: string
  path0: SwapPath
  path1: SwapPath
  liquidityPath: LiquidityPath
  to: string
  deadline: number | string
}

export type zapData =
  | { error: string }
  | {
      encodedTx: string
      zapParams: ZapParams | ZapParamsNative
      feeSwapPath: SwapPath
      priceImpactPercentages: BigNumber[]
    }

export type ZapParams_Ext_Bonds = {
  bond: string
  maxPrice: number | string
}

export type zapDataBond =
  | { error: string }
  | {
      encodedTx: string
      zapParams: ZapParams | ZapParamsNative
      feeSwapPath: SwapPath
      priceImpactPercentages: BigNumber[]
      zapParamsBonds: ZapParams_Ext_Bonds
    }

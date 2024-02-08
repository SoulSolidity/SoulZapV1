import { BigNumber } from 'ethers'
import { LPType, SwapType } from './constants'
import { ISoulZap_UniV2, SoulZap_Ext_ApeBond_Lens, SoulZap_UniV2_Lens } from '../typechain-types'

/// -----------------------------------------------------------------------
/// Generic types
/// -----------------------------------------------------------------------
export type Success<T> = {
  success: true
  data: T
}

export type Failure = {
  success: false
  error: string
}

export type SuccessOrFailure<T> = Success<T> | Failure

export type PricingInOut = {
  tokenInUsdPrice: BigNumber
  tokenOutUsdPrice: BigNumber
}

export function throwOnFailure<T>(successOrFailure: SuccessOrFailure<T>): T {
  if (!successOrFailure.success) {
    throw new Error(`throwOnFailure:: successOrFailure.error`)
  }
  return successOrFailure.data
}

/// -----------------------------------------------------------------------
/// Swap Path
/// -----------------------------------------------------------------------

export type SwapPath = ISoulZap_UniV2.SwapPathStruct

/// -----------------------------------------------------------------------
/// Liquidity Path
/// -----------------------------------------------------------------------

export type LiquidityPath = ISoulZap_UniV2.LiquidityPathStruct

/// -----------------------------------------------------------------------
/// Swap Params
/// -----------------------------------------------------------------------

export type SwapParams = ISoulZap_UniV2.SwapParamsStructOutput
export type SwapData = Awaited<ReturnType<SoulZap_UniV2_Lens['getSwapData']>>

export type SwapDataResult = SwapData & PricingInOut

/// -----------------------------------------------------------------------
/// Zap Params
/// -----------------------------------------------------------------------

export type ZapParams = ISoulZap_UniV2.ZapParamsStructOutput
export type ZapData = Awaited<ReturnType<SoulZap_UniV2_Lens['getZapData']>>

export type ZapDataResult = ZapData & PricingInOut

/// -----------------------------------------------------------------------
/// Zap Bond Params
/// -----------------------------------------------------------------------

export type ZapParams_Ext_Bonds = {
  bond: string
  maxPrice: BigNumber
}
export type ZapDataBond = Awaited<ReturnType<SoulZap_Ext_ApeBond_Lens['getZapDataBond']>>

export type ZapDataBondResult = ZapDataBond & PricingInOut

import { BigNumber, Signer, ethers } from 'ethers'
import {
  ChainId,
  DEX,
  FACTORIES,
  NATIVE_ADDRESS,
  PRICE_GETTER_ADDRESS,
  PriceGetterProtocol,
  Project,
  ZERO_ADDRESS,
} from '../constants'
import { multicall, Call } from '@defifofum/multicall'

//TODO: can't get this to work because in package it's not compiling the contracts
// import SoulZap_UniV2_Extended_V1_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1.sol/SoulZap_UniV2_Extended_V1.json'
// import SoulZap_UniV2_Extended_V1_Lens_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1_Lens.sol/SoulZap_UniV2_Extended_V1_Lens.json'
import SoulZap_UniV2_Extended_V1_ABI from '../ABI/SoulZap_UniV2_Extended_V1_ABI.json'
import SoulZap_UniV2_Extended_V1_Lens_ABI from '../ABI/SoulZap_UniV2_Extended_V1_Lens_ABI.json'
import IUniswapV2Factory_ABI from '../ABI/IUniswapV2Factory_ABI.json'
import PriceGetterExtended_ABI from '../ABI/PriceGetterExtended_ABI.json'

import {
  Success,
  SuccessOrFailure,
  SwapPath,
  ZapData,
  ZapDataBond,
  ZapDataBondResult,
  ZapDataExtras,
  ZapParams,
  ZapParams_Ext_Bonds,
} from '../types'
import { SoulZap_UniV2 } from './SoulZap_UniV2'
import { JsonRpcSigner } from '@ethersproject/providers'

export class SoulZap_UniV2_ApeBond extends SoulZap_UniV2 {
  constructor(chainId: ChainId, signerOrProvider: ethers.providers.Provider | Signer) {
    super(
      Project.APEBOND,
      chainId,
      signerOrProvider,
      JSON.stringify(SoulZap_UniV2_Extended_V1_ABI.abi),
      JSON.stringify(SoulZap_UniV2_Extended_V1_Lens_ABI.abi)
    )
  }

  /// -----------------------------------------------------------------------
  /// Bond Zap Functions
  /// -----------------------------------------------------------------------
  async getZapDataBond(
    dex: DEX,
    tokenIn: string,
    amountIn: number | string,
    bond: string,
    allowedPriceImpactPercentage: number,
    to: string
  ): Promise<ZapDataBondResult> {
    const lensContract = this.getLensContract(dex)

    try {
      const zapData: ZapDataBond = await lensContract.getZapDataBond(
        tokenIn,
        amountIn,
        bond,
        (this.slippage * this.DENOMINATOR) / 100,
        to,
        this.deadlineOffset
      )
      const priceImpactError = await this.checkPriceImpact(
        zapData.priceImpactPercentages[0],
        zapData.priceImpactPercentages[1],
        allowedPriceImpactPercentage
      )
      if (!priceImpactError.success) {
        return priceImpactError
      }

      const zapDataExtras: ZapDataExtras = {
        tokenInUsdPrice: BigNumber.from(0),
        tokenOutUsdPrice: BigNumber.from(0),
      }

      return { success: true, ...zapData, ...zapDataExtras }
    } catch (error: any) {
      return { success: false, error: error.reason ?? 'Something went wrong' }
    }
  }

  async getZapDataBondNative(
    dex: DEX,
    amountIn: number | string,
    bill: string,
    allowedPriceImpactPercentage: number,
    to: string = ZERO_ADDRESS
  ): Promise<ZapDataBondResult> {
    return this.getZapDataBond(dex, NATIVE_ADDRESS, amountIn, bill, allowedPriceImpactPercentage, to)
  }

  async zapBond(
    zapParams: ZapParams,
    zapParamsBond: ZapParams_Ext_Bonds,
    feeSwapPath: SwapPath
  ): Promise<SuccessOrFailure<{ txHash: string }>>
  async zapBond(ZapDataBondResult: ZapDataBondResult): Promise<SuccessOrFailure<{ txHash: string }>>
  async zapBond(encodedTx: string): Promise<SuccessOrFailure<{ txHash: string }>>

  async zapBond(
    arg1: ZapParams | ZapDataBondResult | string,
    arg2?: ZapParams_Ext_Bonds,
    arg3?: SwapPath
  ): Promise<SuccessOrFailure<{ txHash: string }>> {
    try {
      if (typeof arg1 === 'string') {
        // Handle the case when arg1 is an encodedTx
        // TODO: This is not actually supported yet because we don't know the native value from encodedTx here
        return { success: false, error: 'Param not yet supported' }
        // await (this.signerOrProvider as JsonRpcSigner).sendTransaction({
        //   to: this.zapContract.address,
        //   data: arg1,
        //   //FIXME: we don't know native value from encodedTx
        //   value: 0,
        // })
      } else if (
        typeof arg1 === 'object' &&
        'success' in arg1 &&
        'zapParams' in arg1 &&
        'zapParamsBonds' in arg1 &&
        'feeSwapPath' in arg1
      ) {
        // Handle the case when arg1 is an ZapData
        if (!arg1.success) {
          return { success: false, error: 'Lens was not successful' }
        }
        const value = arg1.zapParams.tokenIn == NATIVE_ADDRESS ? arg1.zapParams.amountIn : 0

        const tx = await this.zapContract.zapBond(
          arg1.zapParams,
          arg1.feeSwapPath,
          arg1.zapParamsBonds.bond,
          arg1.zapParamsBonds.maxPrice,
          { value }
        )
        return { success: true, txHash: tx.hash ?? '0x' }
      } else if (
        typeof arg1 === 'object' &&
        'tokenIn' in arg1 &&
        'amountIn' in arg1 &&
        'token0' in arg1 &&
        'token1' in arg1
      ) {
        // Handle the case when arg1 is an ZapParams
        if (arg2) {
          const value = arg1.tokenIn == NATIVE_ADDRESS ? arg1.amountIn : 0
          const tx = await this.zapContract.zapBond(arg1, arg3, arg2.bond, arg2.maxPrice, { value })
          return { success: true, txHash: tx.hash ?? '0x' }
        } else {
          // Handle the case where arg2 (feeSwapPath) is not provided
          return { success: false, error: 'feeSwapPath not provided' }
        }
      } else {
        // Default case
        return { success: false, error: 'Invalid input parameters' }
      }
    } catch (error: any) {
      return { success: false, error: error.error.reason ?? error.reason ?? 'Something went wrong' }
    }
  }
}

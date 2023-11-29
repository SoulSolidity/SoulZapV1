import { BigNumber, Signer, ethers } from 'ethers'
import { ChainId, DEX, NATIVE_ADDRESS, Project } from '../constants'

//TODO: can't get this to work because in package it's not compiling the contracts
// import SoulZap_UniV2_Extended_V1_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1.sol/SoulZap_UniV2_Extended_V1.json'
// import SoulZap_UniV2_Extended_V1_Lens_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1_Lens.sol/SoulZap_UniV2_Extended_V1_Lens.json'
import SoulZap_UniV2_Extended_V1_ABI from '../ABI/SoulZap_UniV2_Extended_V1_ABI.json'
import SoulZap_UniV2_Extended_V1_Lens_ABI from '../ABI/SoulZap_UniV2_Extended_V1_Lens_ABI.json'

import { SwapPath, ZapData, ZapDataBond, ZapParams, ZapParams_Ext_Bonds } from '../types'
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
  ): Promise<ZapDataBond> {
    const lensContract = this.getLensContract(dex)
    const zapData = await lensContract.getZapDataBond(
      tokenIn,
      amountIn,
      bond,
      (this.slippage * this.DENOMINATOR) / 100,
      to
    )
    const priceImpactError = await this.checkPriceImpact(
      zapData.priceImpactPercentage0,
      zapData.priceImpactPercentage1,
      allowedPriceImpactPercentage
    )
    if (!priceImpactError.success) {
      return priceImpactError
    }

    return { success: true, ...zapData }
  }

  async getZapDataBondNative(
    dex: DEX,
    amountIn: number | string,
    bill: string,
    allowedPriceImpactPercentage: number,
    to: string
  ): Promise<ZapDataBond> {
    return this.getZapDataBond(dex, NATIVE_ADDRESS, amountIn, bill, allowedPriceImpactPercentage, to)
  }

  async zapBond(zapParams: ZapParams, zapParamsBond: ZapParams_Ext_Bonds, feeSwapPath: SwapPath): Promise<void>
  async zapBond(zapData: ZapDataBond): Promise<void>
  async zapBond(encodedTx: string): Promise<void>

  async zapBond(arg1: ZapParams | ZapDataBond | string, arg2?: ZapParams_Ext_Bonds, arg3?: SwapPath): Promise<void> {
    if (typeof arg1 === 'string') {
      // Handle the case when arg1 is an encodedTx
      await (this.signerOrProvider as JsonRpcSigner).sendTransaction({
        to: this.zapContract.address,
        data: arg1,
        //FIXME: we don't know native value from encodedTx
        value: 0,
      })
    } else if (
      typeof arg1 === 'object' &&
      'success' in arg1 &&
      'zapParams' in arg1 &&
      'zapParamsBond' in arg1 &&
      'feeSwapPath' in arg1
    ) {
      // It's ZapData
      if (!arg1.success) {
        return
      }
      const value = arg1.zapParams.tokenIn == NATIVE_ADDRESS ? arg1.zapParams.amountIn : 0
      await this.zapContract.zapBond(
        arg1.zapParams,
        arg1.feeSwapPath,
        arg1.zapParamsBonds.bond,
        arg1.zapParamsBonds.maxPrice,
        { value }
      )
    } else if (
      typeof arg1 === 'object' &&
      'tokenIn' in arg1 &&
      'amountIn' in arg1 &&
      'token0' in arg1 &&
      'token1' in arg1
    ) {
      // It's ZapParams
      if (arg2 && arg3) {
        const value = arg1.tokenIn == NATIVE_ADDRESS ? arg1.amountIn : 0
        await this.zapContract.zapBond(arg1, arg3, arg2.bond, arg2.maxPrice, { value })
      } else {
        // Handle the case where arg2 (feeSwapPath) is not provided
        // You might want to throw an error or handle it according to your logic
      }
    }
  }
}

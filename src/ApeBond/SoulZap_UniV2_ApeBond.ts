import { BigNumber, Signer, ethers } from 'ethers'
import {
  ChainId,
  DEX,
  FACTORIES,
  NATIVE_ADDRESS,
  PRICE_GETTER_ADDRESS,
  PriceGetterProtocol,
  Project,
} from '../constants'
import { multicall, Call } from '@defifofum/multicall'

//TODO: can't get this to work because in package it's not compiling the contracts
// import SoulZap_UniV2_Extended_V1_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1.sol/SoulZap_UniV2_Extended_V1.json'
// import SoulZap_UniV2_Extended_V1_Lens_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1_Lens.sol/SoulZap_UniV2_Extended_V1_Lens.json'
import SoulZap_UniV2_Extended_V1_ABI from '../abi/SoulZap_UniV2_Extended_V1_ABI.json'
import SoulZap_UniV2_Extended_V1_Lens_ABI from '../abi/SoulZap_UniV2_Extended_V1_Lens_ABI.json'
import IUniswapV2Factory_ABI from '../abi/IUniswapV2Factory_ABI.json'
import PriceGetterExtended_ABI from '../abi/PriceGetterExtended_ABI.json'

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
        to
      )
      const priceImpactError = await this.checkPriceImpact(
        zapData.priceImpactPercentages[0],
        zapData.priceImpactPercentages[1],
        allowedPriceImpactPercentage
      )
      if (!priceImpactError.success) {
        return priceImpactError
      }

      let zapDataExtras: ZapDataExtras = {
        tokenInUsdPrice: BigNumber.from(0),
        tokenOutUsdPrice: BigNumber.from(0),
      }

      // FIXME: we don't have lp address so workaround for now to get it
      // We should get the lp from contract somehow I think
      const factoryAddress = FACTORIES[dex][this.chainId]?.[PriceGetterProtocol.V2]
      if (factoryAddress) {
        const factory = new ethers.Contract(factoryAddress, IUniswapV2Factory_ABI.abi, this.signerOrProvider)
        const lpAddress = await factory.getPair(zapData.zapParams.token0, zapData.zapParams.token1)

        // USD Prices
        const callDataArray: Call[] = []
        callDataArray.push(this.getTokenPriceMulticall(tokenIn, dex))
        callDataArray.push(this.getLPPriceMulticall(lpAddress, dex))
        const returnedData = await multicall(this.rpcUrl, PriceGetterExtended_ABI, callDataArray, {
          maxCallsPerTx: 1000,
        })
        console.log(returnedData)

        const tokenInUsdPriceSingle = returnedData?.[0][0] ?? BigNumber.from(0)
        const tokenOutUsdPriceSingle = returnedData?.[1][0] ?? BigNumber.from(0)

        zapDataExtras = {
          tokenInUsdPrice: tokenInUsdPriceSingle.mul(amountIn).div('1000000000000000000'),
          tokenOutUsdPrice: tokenOutUsdPriceSingle
            .mul(zapData.zapParams.liquidityPath.lpAmount)
            .div('1000000000000000000'),
        }
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
    to: string
  ): Promise<ZapDataBondResult> {
    return this.getZapDataBond(dex, NATIVE_ADDRESS, amountIn, bill, allowedPriceImpactPercentage, to)
  }

  async zapBond(
    zapParams: ZapParams,
    zapParamsBond: ZapParams_Ext_Bonds,
    feeSwapPath: SwapPath
  ): Promise<SuccessOrFailure<any>>
  async zapBond(ZapDataBondResult: ZapDataBondResult): Promise<SuccessOrFailure<any>>
  async zapBond(encodedTx: string): Promise<SuccessOrFailure<any>>

  async zapBond(
    arg1: ZapParams | ZapDataBondResult | string,
    arg2?: ZapParams_Ext_Bonds,
    arg3?: SwapPath
  ): Promise<SuccessOrFailure<any>> {
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
        'zapParamsBond' in arg1 &&
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
        return { success: true, tx }
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
          return { success: true, tx }
        } else {
          // Handle the case where arg2 (feeSwapPath) is not provided
          // You might want to throw an error or handle it according to your logic
          throw new Error('feeSwapPath not provided')
        }
      } else {
        // Default case
        throw new Error('Invalid input parameters')
      }
    } catch (error: any) {
      return { success: false, error: error.reason ?? 'Something went wrong' }
    }
  }
}

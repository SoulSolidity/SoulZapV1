import { BigNumber, ContractTransaction, Signer, ethers } from 'ethers'
import { ChainId, DEX, NATIVE_ADDRESS, Project, ZERO_ADDRESS } from '../constants'

import SoulZap_UniV2_Extended_V1_Artifact from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1.sol/SoulZap_UniV2_Extended_V1.json'
import SoulZap_UniV2_Extended_V1_Lens_Artifact from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1_Lens.sol/SoulZap_UniV2_Extended_V1_Lens.json'

import {
  SuccessOrFailure,
  SwapPath,
  ZapDataBond,
  ZapDataBondResult,
  ZapParams,
  ZapParams_Ext_Bonds,
  PricingInOut,
} from '../types'
import { SoulZap_UniV2_SDK } from './SoulZap_UniV2'
import { SoulZap_UniV2_Extended_V1, SoulZap_UniV2_Extended_V1_Lens } from '../../typechain-types'
import { logger } from '../../hardhat/utils'

export class SoulZap_UniV2_ApeBond_SDK extends SoulZap_UniV2_SDK {
  // NOTE: Letting super set these for now and then typecasting here.
  // protected zapContract: SoulZap_Ext_ApeBond | undefined
  // protected lensContracts: Partial<Record<DEX, SoulZap_UniV2_Extended_V1_Lens>> = {}

  constructor(chainId: ChainId, signerOrProvider: ethers.providers.Provider | Signer) {
    super(Project.APEBOND, chainId, signerOrProvider, {
      soulZapAbi: SoulZap_UniV2_Extended_V1_Artifact.abi,
      soulZapLensAbi: SoulZap_UniV2_Extended_V1_Lens_Artifact.abi,
    })
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
    to: string,
    options?: {
      deadlineOffset?: number
    }
  ): Promise<SuccessOrFailure<ZapDataBondResult>> {
    const lensContractReturn = this.getLensContract(dex)

    if (!lensContractReturn.success) {
      return { success: false, error: lensContractReturn.error }
    }
    const lensContract = lensContractReturn.data

    try {
      const zapData: ZapDataBond = await lensContract.getZapDataBond(
        tokenIn,
        amountIn,
        bond,
        (this.slippage * this.DENOMINATOR) / 100, // Convert readable slippage to DENOMINATOR basis
        to,
        options?.deadlineOffset || this.deadlineOffset
      )
      const priceImpactError = await this.checkPriceImpact(zapData.priceImpactPercentages, allowedPriceImpactPercentage)
      if (!priceImpactError.success) {
        return priceImpactError
      }
      // TODO: Passing 0?
      const zapDataExtras: PricingInOut = {
        tokenInUsdPrice: BigNumber.from(0),
        tokenOutUsdPrice: BigNumber.from(0),
      }

      return { success: true, data: { ...zapData, ...zapDataExtras } as ZapDataBondResult }
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
  ): Promise<SuccessOrFailure<ZapDataBondResult>> {
    return this.getZapDataBond(dex, NATIVE_ADDRESS, amountIn, bill, allowedPriceImpactPercentage, to)
  }

  async zapBond(
    zapBondData: ZapDataBondResult | { zapParams: ZapParams; feeSwapPath: SwapPath },
    zapParamsBond: ZapParams_Ext_Bonds
  ): Promise<SuccessOrFailure<{ tx: ContractTransaction }>> {
    if (!this.zapContract) {
      return { success: false, error: `Zap contract not found for chainId: ${this.chainId}` }
    }
    // NOTE: Not handling the rest of the values in ZapDataBondResult currently
    const { zapParams, feeSwapPath } = zapBondData
    const { bond, maxPrice } = zapParamsBond

    try {
      const value = zapParams.tokenIn === NATIVE_ADDRESS ? zapParams.amountIn : 0
      const tx = await (this.zapContract as SoulZap_UniV2_Extended_V1).zapBond(zapParams, feeSwapPath, bond, maxPrice, {
        value,
      })
      return { success: true, data: { tx } }
    } catch (error: any) {
      return { success: false, error: error.error?.reason ?? error.reason ?? 'Something went wrong' }
    }
  }

  /// -----------------------------------------------------------------------
  /// Getter Functions
  /// -----------------------------------------------------------------------

  getLensContract(dex: DEX): SuccessOrFailure<SoulZap_UniV2_Extended_V1_Lens> {
    const contract = this.lensContracts[dex]
    if (!contract) {
      const error = `Lens contract not found for ${dex}.`
      logger.error(error)
      return { success: false, error }
    }
    return { success: true, data: contract as SoulZap_UniV2_Extended_V1_Lens }
  }

  getZapContract(): SuccessOrFailure<SoulZap_UniV2_Extended_V1> {
    return this.zapContract
      ? { success: true, data: this.zapContract as SoulZap_UniV2_Extended_V1 }
      : { success: false, error: 'Zap contract not found' }
  }
}

import { BigNumber, BigNumberish, Contract, ContractTransaction, Signer, ethers } from 'ethers'
import { ChainId, DEX, NATIVE_ADDRESS, Project, ZAP_ADDRESS, ZAP_LENS_ADDRESS, ZERO_ADDRESS } from '../constants'

import SoulZap_UniV2_Artifact from '../abi/SoulZap_Univ2/SoulZap_UniV2.json'
import SoulZap_UniV2_Lens_Artifact from '../abi/SoulZap_Univ2/SoulZap_UniV2_Lens.json'

import {
  SuccessOrFailure,
  SwapData,
  SwapDataResult,
  SwapParams,
  SwapPath,
  ZapData,
  ZapDataResult,
  ZapParams,
  PricingInOut,
} from '../types'
import { logger } from '../'
import { SoulZap_UniV2, SoulZap_UniV2_Lens } from '../../typechain-types'
import { TransactionResponse } from '@ethersproject/providers'
import { getErrorMessage } from '../utils/getErrorMessage'

// type ValidDex<T extends Project, U extends ChainId> = Extract<DEX, keyof (typeof ZAP_LENS_ADDRESS[T][U])>;

interface SoulZapOptions {
  soulZapAbi?: string | any[]
  soulZapLensAbi?: string | any[]
}

export class SoulZap_UniV2_SDK {
  protected signerOrProvider: ethers.providers.Provider | Signer
  protected lensContracts: Partial<Record<DEX, SoulZap_UniV2_Lens>> = {}
  protected zapContract: SoulZap_UniV2 | undefined
  protected priceGetterContract: Contract | undefined
  protected project: Project
  chainId: ChainId

  // Slippage percentage after expected return amountIn. Only in case price changes between read and write function.
  // NOT PRICE IMPACT SLIPPAGE
  slippage = 0.5
  deadlineOffset = 5 * 60 //5 minutes
  protected DENOMINATOR = 10_000

  constructor(
    project: Project,
    chainId: ChainId,
    signerOrProvider: ethers.providers.Provider | Signer,
    {
      soulZapAbi = JSON.stringify(SoulZap_UniV2_Artifact.abi),
      soulZapLensAbi = JSON.stringify(SoulZap_UniV2_Lens_Artifact.abi),
    }: SoulZapOptions = {}
  ) {
    this.project = project
    this.chainId = chainId
    this.signerOrProvider = signerOrProvider

    // Lens contracts
    const lensAddresses = ZAP_LENS_ADDRESS[this.project]?.[this.chainId]

    // Check if lensAddresses is defined to avoid potential errors
    if (!lensAddresses) {
      logger.error(`Zap lens addresses not found for project ${this.project} and chainId ${this.chainId}`)
    }

    for (const dexType in lensAddresses) {
      if (Object.prototype.hasOwnProperty.call(lensAddresses, dexType)) {
        const typedDexType: DEX = dexType as DEX
        const dexValue = lensAddresses[typedDexType]
        if (!dexValue) {
          logger.error(`Zap lens address not found for ${typedDexType} on lendAddresses.`)
        } else {
          this.lensContracts[typedDexType] = new Contract(
            dexValue,
            soulZapLensAbi,
            this.signerOrProvider
          ) as SoulZap_UniV2_Lens
        }
      }
    }

    //Zap contract
    const zapAddress = ZAP_ADDRESS[this.project]?.[this.chainId]
    if (!zapAddress) {
      logger.error(`Zap address not found for project ${this.project} and chainId ${this.chainId}`)
    } else {
      this.zapContract = new Contract(zapAddress, soulZapAbi, this.signerOrProvider) as unknown as SoulZap_UniV2
    }
  }

  /// -----------------------------------------------------------------------
  /// Getter Functions
  /// -----------------------------------------------------------------------

  getLensContract(dex: DEX): SuccessOrFailure<SoulZap_UniV2_Lens> {
    const contract = this.lensContracts[dex]
    if (!contract) {
      const error = `Lens contract not found for ${dex}.`
      logger.error(error)
      return { success: false, error }
    }
    return { success: true, data: contract }
  }

  getZapContract(): SuccessOrFailure<SoulZap_UniV2> {
    return this.zapContract
      ? { success: true, data: this.zapContract }
      : { success: false, error: 'Zap contract not found' }
  }

  setSlippage(slippage: number) {
    this.slippage = slippage
  }

  setDeadlineOffset(deadlineOffset: number) {
    this.deadlineOffset = deadlineOffset
  }

  /// -----------------------------------------------------------------------
  /// Swap Functions
  /// -----------------------------------------------------------------------
  async getSwapData(
    dex: DEX,
    tokenIn: string,
    amountIn: number | string,
    tokenOut: string,
    allowedPriceImpactPercentage: number,
    to: string = ZERO_ADDRESS
  ): Promise<SuccessOrFailure<SwapDataResult>> {
    this.getLensContract(dex)
    const lensContractReturn = this.getLensContract(dex)

    if (lensContractReturn.success === false) {
      return { success: false, error: lensContractReturn.error }
    }

    const lensContract = lensContractReturn.data

    try {
      const swapData: SwapData = await lensContract.getSwapData(
        tokenIn,
        amountIn,
        tokenOut,
        (this.slippage * this.DENOMINATOR) / 100, // Convert readable slippage to DENOMINATOR basis
        to,
        this.deadlineOffset
      )

      //Check price impact
      const priceImpactError = await this.checkPriceImpact(
        [swapData.priceImpactPercentage],
        allowedPriceImpactPercentage
      )

      if (!priceImpactError.success) {
        return priceImpactError
      }
      // TODO: Passing 0?
      const swapDataExtras: PricingInOut = {
        tokenInUsdPrice: BigNumber.from(0),
        tokenOutUsdPrice: BigNumber.from(0),
      }

      return { success: true, data: { ...swapData, ...swapDataExtras } as SwapDataResult }
    } catch (error: any) {
      return { success: false, error: error.reason ?? 'Something went wrong' }
    }
  }

  async getSwapDataNative(
    dex: DEX,
    amountIn: number | string,
    tokenOut: string,
    allowedPriceImpactPercentage: number,
    to: string = ZERO_ADDRESS
  ): Promise<SuccessOrFailure<SwapDataResult>> {
    return this.getSwapData(dex, NATIVE_ADDRESS, amountIn, tokenOut, allowedPriceImpactPercentage, to)
  }

  async swap(
    swapData: SwapDataResult | { swapParams: SwapParams; feeSwapPath: SwapPath }
  ): Promise<SuccessOrFailure<{ tx: ContractTransaction }>> {
    if (!this.zapContract) {
      return { success: false, error: `Zap contract not found for chainId: ${this.chainId}` }
    }
    // NOTE: Not handling the rest of the values in SwapDataResult currently
    const { swapParams, feeSwapPath } = swapData

    try {
      const value = swapParams.tokenIn === NATIVE_ADDRESS ? swapParams.amountIn : 0
      const tx = await this.zapContract.swap(swapParams, feeSwapPath, { value })
      return { success: true, data: { tx } }
    } catch (error: any) {
      return { success: false, error: error.error?.reason ?? error.reason ?? getErrorMessage(error) }
    }
  }

  /// -----------------------------------------------------------------------
  /// Zap Functions
  /// -----------------------------------------------------------------------
  async getZapData(
    dex: DEX,
    tokenIn: string,
    amountIn: number | string,
    tokenOut: string,
    allowedPriceImpactPercentage: number,
    to: string = ZERO_ADDRESS
  ): Promise<SuccessOrFailure<ZapDataResult>> {
    this.getLensContract(dex)
    const lensContractReturn = this.getLensContract(dex)

    if (lensContractReturn.success === false) {
      return { success: false, error: lensContractReturn.error }
    }

    const lensContract = lensContractReturn.data

    try {
      const zapData: ZapData = await lensContract.getZapData(
        tokenIn,
        amountIn,
        tokenOut,
        (this.slippage * this.DENOMINATOR) / 100, // Convert readable slippage to DENOMINATOR basis
        to,
        this.deadlineOffset
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

      return { success: true, data: { ...zapData, ...zapDataExtras } as ZapDataResult }
    } catch (error: any) {
      return { success: false, error: error.reason ?? 'Something went wrong' }
    }
  }

  async getZapDataNative(
    dex: DEX,
    amountIn: number | string,
    tokenOut: string,
    allowedPriceImpactPercentage: number,
    to: string = ZERO_ADDRESS
  ): Promise<SuccessOrFailure<ZapDataResult>> {
    return this.getZapData(dex, NATIVE_ADDRESS, amountIn, tokenOut, allowedPriceImpactPercentage, to)
  }

  async zap(
    zapData: ZapDataResult | { zapParams: ZapParams; feeSwapPath: SwapPath }
  ): Promise<SuccessOrFailure<{ tx: ContractTransaction }>> {
    if (!this.zapContract) {
      return { success: false, error: `Zap contract not found for chainId: ${this.chainId}` }
    }
    // NOTE: Not handling the rest of the values in ZapDataResult currently
    const { zapParams, feeSwapPath } = zapData

    try {
      const value = zapParams.tokenIn === NATIVE_ADDRESS ? zapParams.amountIn : 0
      const tx = await this.zapContract.zap(zapParams, feeSwapPath, { value })
      return { success: true, data: { tx } }
    } catch (error: any) {
      return { success: false, error: error.error?.reason ?? error.reason ?? 'Something went wrong' }
    }
  }

  async sendEncodedTx(encodedTx: string, value?: BigNumberish): Promise<SuccessOrFailure<{ tx: TransactionResponse }>> {
    if (!this.zapContract) {
      return { success: false, error: `Zap contract not found for chainId: ${this.chainId}` }
    }
    try {
      const tx = await (this.signerOrProvider as Signer).sendTransaction({
        to: this.zapContract.address,
        data: encodedTx,
        value: value ?? 0,
      })
      return { success: true, data: { tx } }
    } catch (error: any) {
      return { success: false, error: error.error.reason ?? error.reason ?? 'Something went wrong' }
    }
  }

  /// -----------------------------------------------------------------------
  /// Helper Functions
  /// -----------------------------------------------------------------------
  protected checkPriceImpact(priceImpacts: BigNumber[], allowedPriceImpactPercentage: number): SuccessOrFailure<null> {
    priceImpacts.map((priceImpact) => {
      if (priceImpact.gt((allowedPriceImpactPercentage * this.DENOMINATOR) / 100)) {
        return { success: false, error: 'Price impact too high' }
      }
    })
    return { success: true, data: null } // No error
  }
}

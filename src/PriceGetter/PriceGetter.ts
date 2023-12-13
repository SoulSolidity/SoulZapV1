import { BigNumber, Contract, Signer, ethers } from 'ethers'
import {
  ChainId,
  DEX,
  FACTORIES,
  NATIVE_ADDRESS,
  PRICE_GETTER_ADDRESS,
  PriceGetterProtocol,
  WRAPPED_NATIVE,
  ZERO_ADDRESS,
} from '../constants'

import PriceGetterExtended_ABI from '../ABI/PriceGetterExtended_ABI.json'

import { SuccessOrFailure } from '../types'
import { Call, multicall } from '@defifofum/multicall'
import { logger } from '../'

export class PriceGetter {
  protected signerOrProvider: ethers.providers.Provider | Signer
  protected priceGetterContract: Contract | undefined
  chainId: ChainId

  constructor(chainId: ChainId, signerOrProvider: ethers.providers.Provider | Signer) {
    this.chainId = chainId
    this.signerOrProvider = signerOrProvider

    //PriceGetter contract
    const priceGetterContract = PRICE_GETTER_ADDRESS[this.chainId]
    if (!priceGetterContract) {
      logger.error(`PriceGetter address not found for chainId ${this.chainId}`)
    } else {
      this.priceGetterContract = new ethers.Contract(
        priceGetterContract,
        PriceGetterExtended_ABI,
        this.signerOrProvider
      )
    }
  }

  /// -----------------------------------------------------------------------
  /// Price Getter Functions
  /// -----------------------------------------------------------------------
  private getPricingContracts(dex: DEX): SuccessOrFailure<{ priceGetterContract: Contract; uniV2Factory: string }> {
    if (!this.priceGetterContract) {
      return { success: false, error: `PriceGetter contract not found for ${this.chainId}.` }
    }
    // Pull in UniV2Factory
    const uniV2Factory = FACTORIES[dex]?.[this.chainId]?.[PriceGetterProtocol.V2]
    if (!uniV2Factory) {
      return { success: false, error: `UniV2Factory not found for ${dex} and ${this.chainId}.` }
    }

    return { success: true, data: { priceGetterContract: this.priceGetterContract, uniV2Factory } }
  }

  protected async getTokenPrice(tokenAddress: string, dex: DEX): Promise<SuccessOrFailure<BigNumber>> {
    const pricingContractsReturn = this.getPricingContracts(dex)
    if (!pricingContractsReturn.success) {
      return { success: false, error: pricingContractsReturn.error }
    }
    const { priceGetterContract, uniV2Factory } = pricingContractsReturn.data
    // Check for Wrapped Native if Native address is passed in
    if (tokenAddress == NATIVE_ADDRESS) {
      tokenAddress = WRAPPED_NATIVE[this.chainId]
    }
    const price = await priceGetterContract.getPriceFromFactory(
      tokenAddress,
      2,
      uniV2Factory,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    )
    return { success: true, data: price }
  }

  protected async getLPPrice(tokenAddress: string, dex: DEX): Promise<SuccessOrFailure<BigNumber>> {
    const pricingContractsReturn = this.getPricingContracts(dex)
    if (!pricingContractsReturn.success) {
      return { success: false, error: pricingContractsReturn.error }
    }
    const { priceGetterContract, uniV2Factory } = pricingContractsReturn.data

    const price = await priceGetterContract.getLPPriceFromFactory(
      tokenAddress,
      2,
      uniV2Factory,
      ZERO_ADDRESS,
      ZERO_ADDRESS
    )
    return { success: true, data: price }
  }

  protected getTokenPriceMulticall(tokenAddress: string, dex: DEX): SuccessOrFailure<Call> {
    const pricingContractsReturn = this.getPricingContracts(dex)
    if (!pricingContractsReturn.success) {
      return { success: false, error: pricingContractsReturn.error }
    }
    const { priceGetterContract, uniV2Factory } = pricingContractsReturn.data

    if (tokenAddress == NATIVE_ADDRESS) {
      tokenAddress = WRAPPED_NATIVE[this.chainId]
    }
    return {
      success: true,
      data: {
        address: priceGetterContract.address,
        functionName: 'getPriceFromFactory',
        params: [tokenAddress, 2, uniV2Factory, ZERO_ADDRESS, ZERO_ADDRESS],
      },
    }
  }

  protected getLPPriceMulticall(tokenAddress: string, dex: DEX): SuccessOrFailure<Call> {
    const pricingContractsReturn = this.getPricingContracts(dex)
    if (!pricingContractsReturn.success) {
      return { success: false, error: pricingContractsReturn.error }
    }
    const { priceGetterContract, uniV2Factory } = pricingContractsReturn.data

    return {
      success: true,
      data: {
        address: priceGetterContract.address,
        functionName: 'getLPPriceFromFactory',
        params: [tokenAddress, 2, uniV2Factory, ZERO_ADDRESS, ZERO_ADDRESS],
      },
    }
  }
}

import { BigNumber, Contract, Signer, ethers } from 'ethers'
import { ChainId, DEX, NATIVE_ADDRESS, Project, ZAP_ADDRESS, ZAP_LENS_ADDRESS } from '../constants'

// FIXME: I recommend pulling directly from the artifacts folder to keep it up to date, these have been updated
// TODO: can't get this to work because in package it's not compiling the contracts
// import SoulZap_UniV2_Extended_V1_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1.sol/SoulZap_UniV2_Extended_V1.json'
// import SoulZap_UniV2_Extended_V1_Lens_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1_Lens.sol/SoulZap_UniV2_Extended_V1_Lens.json'
import SoulZap_UniV2_Extended_V1_ABI from '../ABI/SoulZap_UniV2_Extended_V1_ABI.json'
import SoulZap_UniV2_Extended_V1_Lens_ABI from '../ABI/SoulZap_UniV2_Extended_V1_Lens_ABI.json'

import {
    Failure,
    Success,
    SwapData,
    SwapDataResult,
    SwapParams,
    SwapPath,
    ZapData,
    ZapDataResult,
    ZapParams,
    ZapParams_Ext_Bonds,
} from '../types'
import { JsonRpcSigner } from '@ethersproject/providers'

// type ValidDex<T extends Project, U extends ChainId> = Extract<DEX, keyof (typeof ZAP_LENS_ADDRESS[T][U])>;

export class SoulZap_UniV2 {
    protected signerOrProvider: ethers.providers.Provider | Signer
    protected lensContracts: Partial<Record<DEX, Contract>> = {}
    protected zapContract: Contract
    protected project: Project
    chainId: ChainId

    // Slippage percentage after expected return amountIn. Only in case price changes between read and write function.
    // NOT PRICE IMPACT SLIPPAGE
    slippage = 0.5
    protected DENOMINATOR = 10_000

    //FIXME/TODO: default values for ABIs make no sense? they are defaults for ApeBond for now because we don't have generic version yet
    constructor(
        project: Project,
        chainId: ChainId,
        signerOrProvider: ethers.providers.Provider | Signer,
        soulZapAbi: string = JSON.stringify(SoulZap_UniV2_Extended_V1_ABI.abi),
        soulZapLensAbi: string = JSON.stringify(SoulZap_UniV2_Extended_V1_Lens_ABI.abi)
    ) {
        this.project = project
        this.chainId = chainId
        this.signerOrProvider = signerOrProvider

        // Lens contracts
        const lensAddresses = ZAP_LENS_ADDRESS[this.project][this.chainId]

        // Check if lensAddresses is defined to avoid potential errors
        if (!lensAddresses) {
            throw new Error(`Zap lens addresses not found for project ${this.project} and chainId ${this.chainId}`)
        }

        for (const dexType in lensAddresses) {
            if (Object.prototype.hasOwnProperty.call(lensAddresses, dexType)) {
                const typedDexType: DEX = dexType as DEX
                const dexValue = lensAddresses[typedDexType]
                console.log(`DEX Type: ${dexType}, Value: ${dexValue}`)
                if (!dexValue) {
                    throw new Error(`Zap lens address not found for ${typedDexType}`)
                }
                this.lensContracts[typedDexType] = new ethers.Contract(dexValue, soulZapLensAbi, this.signerOrProvider)
            }
        }

        //Zap contract
        const zapAddress = ZAP_ADDRESS[this.project][this.chainId]
        if (!zapAddress) {
            throw new Error('Zap address not found')
        }
        this.zapContract = new ethers.Contract(zapAddress, soulZapAbi, this.signerOrProvider)
    }

    /// -----------------------------------------------------------------------
    /// Getter Functions
    /// -----------------------------------------------------------------------

    getLensContract(dex: DEX): Contract {
        const contract = this.lensContracts[dex]
        if (!contract) {
            throw new Error('contract not found for dex')
        }
        return contract
    }

    getZapContract(): Contract {
        return this.zapContract
    }

    setSlippage(slippage: number) {
        this.slippage = slippage
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
        to: string
    ): Promise<SwapDataResult> {
        this.getLensContract(dex)
        const lensContract = this.getLensContract(dex)
        const swapData: SwapData = await lensContract.getSwapData(
            tokenIn,
            amountIn,
            tokenOut,
            (this.slippage * this.DENOMINATOR) / 100,
            to
        )
        const priceImpactError = await this.checkPriceImpact(
            swapData.priceImpactPercentages[0],
            swapData.priceImpactPercentages[1],
            allowedPriceImpactPercentage
        )

        if (!priceImpactError.success) {
            return priceImpactError
        }

        return { success: true, ...swapData }
    }

    async getSwapDataNative(
        dex: DEX,
        amountIn: number | string,
        tokenOut: string,
        allowedPriceImpactPercentage: number,
        to: string
    ): Promise<SwapDataResult> {
        return this.getSwapData(dex, NATIVE_ADDRESS, amountIn, tokenOut, allowedPriceImpactPercentage, to)
    }

    async swap(swapParams: SwapParams, feeSwapPath: SwapPath): Promise<void>
    async swap(swapData: SwapData): Promise<void>
    async swap(encodedTx: string): Promise<void>

    async swap(arg1: SwapParams | SwapData | string, arg2?: SwapPath): Promise<void> {
        if (typeof arg1 === 'string') {
            // Handle the case when arg1 is an encodedTx
            await (this.signerOrProvider as JsonRpcSigner).sendTransaction({
                to: this.zapContract.address,
                data: arg1,
                //FIXME: we don't know native value from encodedTx
                value: 0,
            })
        } else if (typeof arg1 === 'object' && 'success' in arg1 && 'swapParams' in arg1 && 'feeSwapPath' in arg1) {
            // It's SwapData
            if (!arg1.success) {
                return
            }
            const value = arg1.swapParams.tokenIn == NATIVE_ADDRESS ? arg1.swapParams.amountIn : 0
            await this.zapContract.swap(arg1.swapParams, arg1.feeSwapPath, { value })
        } else if (typeof arg1 === 'object' && 'tokenIn' in arg1 && 'amountIn' in arg1 && 'tokenOut' in arg1) {
            // It's SwapParams
            if (arg2) {
                const value = arg1.tokenIn == NATIVE_ADDRESS ? arg1.amountIn : 0
                await this.zapContract.swap(arg1, arg2, { value })
            } else {
                // Handle the case where arg2 (feeSwapPath) is not provided
                // You might want to throw an error or handle it according to your logic
            }
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
        to: string
    ): Promise<ZapDataResult> {
        this.getLensContract(dex)
        const lensContract = this.getLensContract(dex)
        const zapData: ZapData = await lensContract.getZapData(
            tokenIn,
            amountIn,
            tokenOut,
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

        return { success: true, ...zapData }
    }

    async getZapDataNative(
        dex: DEX,
        amountIn: number | string,
        tokenOut: string,
        allowedPriceImpactPercentage: number,
        to: string
    ): Promise<ZapDataResult> {
        return this.getZapData(dex, NATIVE_ADDRESS, amountIn, tokenOut, allowedPriceImpactPercentage, to)
    }

    async zap(zapParams: ZapParams, feeSwapPath: SwapPath): Promise<void>
    async zap(zapData: ZapData): Promise<void>
    async zap(encodedTx: string): Promise<void>

    async zap(arg1: ZapParams | ZapData | string, arg2?: SwapPath): Promise<Failure | Success<any>> {
        if (typeof arg1 === 'string') {
            // Handle the case when arg1 is an encodedTx
            return await (this.signerOrProvider as JsonRpcSigner).sendTransaction({
                to: this.zapContract.address,
                data: arg1,
                // FIXME: we don't know native value from encodedTx
                value: 0,
            })
        } else if (typeof arg1 === 'object' && 'success' in arg1 && 'zapParams' in arg1 && 'feeSwapPath' in arg1) {
            // It's ZapData
            if (!arg1.success) {
                return
            }
            const value = arg1.zapParams.tokenIn == NATIVE_ADDRESS ? arg1.zapParams.amountIn : 0
            return await this.zapContract.zap(arg1.zapParams, arg1.feeSwapPath, { value })
        } else if (
            typeof arg1 === 'object' &&
            'tokenIn' in arg1 &&
            'amountIn' in arg1 &&
            'token0' in arg1 &&
            'token1' in arg1
        ) {
            // It's ZapParams
            if (arg2) {
                const value = arg1.tokenIn == NATIVE_ADDRESS ? arg1.amountIn : 0
                return await this.zapContract.zap(arg1, arg2, { value })
            } else {
                // Handle the case where arg2 (feeSwapPath) is not provided
                // You might want to throw an error or handle it according to your logic
            }
        }
        return { success: false, error: 'Something went wrong' }
    }

    /// -----------------------------------------------------------------------
    /// Helper Functions
    /// -----------------------------------------------------------------------
    protected checkPriceImpact(
        priceImpactPercentage0: BigNumber,
        priceImpactPercentage1: BigNumber,
        allowedPriceImpactPercentage: number
    ): Failure | Success<null> {
        console.log(priceImpactPercentage0, (allowedPriceImpactPercentage * this.DENOMINATOR) / 100)
        console.log(priceImpactPercentage1, (allowedPriceImpactPercentage * this.DENOMINATOR) / 100)
        if (priceImpactPercentage0.gt((allowedPriceImpactPercentage * this.DENOMINATOR) / 100)) {
            return { success: false, error: 'Price impact for first token swap too high' }
        }
        if (priceImpactPercentage1.gt((allowedPriceImpactPercentage * this.DENOMINATOR) / 100)) {
            return { success: false, error: 'Price impact for second token swap too high' }
        }
        return { success: true, value: null } // No error
    }

    protected getExpectedOutputAmount(amountOutMin: BigNumber): BigNumber {
        return amountOutMin.div(100 - this.slippage).mul(100)
    }
}

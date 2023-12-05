import { BigNumber, Contract, Signer, ethers } from 'ethers'
import { ChainId, DEX, FACTORIES, NATIVE_ADDRESS, PRICE_GETTER_ADDRESS, PriceGetterProtocol, Project, WRAPPED_NATIVE, ZAP_ADDRESS, ZAP_LENS_ADDRESS, ZERO_ADDRESS } from '../constants'

// FIXME: I recommend pulling directly from the artifacts folder to keep it up to date, these have been updated
// TODO: can't get this /\ to work because in package it's not compiling the contracts
// import SoulZap_UniV2_Extended_V1_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1.sol/SoulZap_UniV2_Extended_V1.json'
// import SoulZap_UniV2_Extended_V1_Lens_ABI from '../../artifacts/contracts/full-versions/SoulZap_UniV2_Extended_V1_Lens.sol/SoulZap_UniV2_Extended_V1_Lens.json'
import SoulZap_UniV2_Extended_V1_ABI from '../abi/SoulZap_UniV2_Extended_V1_ABI.json'
import SoulZap_UniV2_Extended_V1_Lens_ABI from '../abi/SoulZap_UniV2_Extended_V1_Lens_ABI.json'
import PriceGetterExtended_ABI from '../abi/PriceGetterExtended_ABI.json'

import {
    Failure,
    Success,
    SuccessOrFailure,
    SwapData,
    SwapDataExtras,
    SwapDataResult,
    SwapParams,
    SwapPath,
    ZapData,
    ZapDataExtras,
    ZapDataResult,
    ZapParams,
    ZapParams_Ext_Bonds,
} from '../types'
import { Call, multicall } from '@defifofum/multicall'

// type ValidDex<T extends Project, U extends ChainId> = Extract<DEX, keyof (typeof ZAP_LENS_ADDRESS[T][U])>;

export class SoulZap_UniV2 {
    protected signerOrProvider: ethers.providers.Provider | Signer
    protected rpcUrl: string
    protected lensContracts: Partial<Record<DEX, Contract>> = {}
    protected zapContract: Contract
    protected priceGetterContract: Contract
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

        if (ethers.Signer.isSigner(signerOrProvider)) {
            // It's a Signer, get the provider's RPC URL
            const signerProvider = signerOrProvider.provider as ethers.providers.JsonRpcProvider;
            this.rpcUrl = signerProvider.connection.url;
        } else {
            // It's a Provider, get the RPC URL directly
            const provider = signerOrProvider as ethers.providers.JsonRpcProvider;
            this.rpcUrl = provider.connection.url;
        }

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

        //PriceGetter contract
        const priceGetterContract = PRICE_GETTER_ADDRESS[this.chainId]
        if (!priceGetterContract) {
            throw new Error('Zap address not found')
        }
        this.priceGetterContract = new ethers.Contract(priceGetterContract, PriceGetterExtended_ABI, this.signerOrProvider)

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
        to: string = ZERO_ADDRESS
    ): Promise<SwapDataResult> {
        this.getLensContract(dex)
        const lensContract = this.getLensContract(dex)

        try {
            const swapData: SwapData = await lensContract.getSwapData(
                tokenIn,
                amountIn,
                tokenOut,
                (this.slippage * this.DENOMINATOR) / 100,
                to
            )


            //Check price impact
            const priceImpactError = await this.checkPriceImpact(
                swapData.priceImpactPercentages[0],
                swapData.priceImpactPercentages[1],
                allowedPriceImpactPercentage
            )

            if (!priceImpactError.success) {
                return priceImpactError
            }

            //USD Prices
            const callDataArray: Call[] = [];
            callDataArray.push(this.getTokenPriceMulticall(tokenIn, dex));
            callDataArray.push(this.getTokenPriceMulticall(tokenOut, dex));
            const returnedData = await multicall(
                this.rpcUrl,
                PriceGetterExtended_ABI,
                callDataArray,
                {
                    maxCallsPerTx: 1000,
                }
            );

            const tokenInUsdPriceSingle = returnedData?.[0][0] ?? BigNumber.from(0)
            const tokenOutUsdPriceSingle = returnedData?.[1][0] ?? BigNumber.from(0)

            const swapDataExtras: SwapDataExtras = {
                tokenInUsdPrice: tokenInUsdPriceSingle.mul(amountIn).div('1000000000000000000'),
                tokenOutUsdPrice: tokenOutUsdPriceSingle.mul(swapData.swapParams.path.amountOut).div('1000000000000000000'),
            }

            return { success: true, ...swapData, ...swapDataExtras }
        } catch (error: any) {
            return { success: false, error: error.reason ?? "Something went wrong" }
        }
    }

    async getSwapDataNative(
        dex: DEX,
        amountIn: number | string,
        tokenOut: string,
        allowedPriceImpactPercentage: number,
        to: string = ZERO_ADDRESS
    ): Promise<SwapDataResult> {
        return this.getSwapData(dex, NATIVE_ADDRESS, amountIn, tokenOut, allowedPriceImpactPercentage, to)
    }

    //Execute Swap txs
    async swap(swapParams: SwapParams, feeSwapPath: SwapPath): Promise<SuccessOrFailure<any>>
    async swap(swapDataResult: SwapDataResult): Promise<SuccessOrFailure<any>>
    async swap(encodedTx: string): Promise<SuccessOrFailure<any>>

    async swap(arg1: SwapParams | SwapDataResult | string, arg2?: SwapPath): Promise<SuccessOrFailure<any>> {
        try {
            if (typeof arg1 === 'string') {
                // Handle the case when arg1 is an encodedTx
                // TODO: This is not actually supported yet because we don't know the native value from encodedTx here  
                return { success: false, error: "Param not yet supported" }
                // await (this.signerOrProvider as JsonRpcSigner).sendTransaction({
                //     to: this.zapContract.address,
                //     data: arg1,
                //     //FIXME: we don't know native value from encodedTx
                //     value: 0,
                // })
            } else if (typeof arg1 === 'object' && 'success' in arg1 && 'swapParams' in arg1 && 'feeSwapPath' in arg1) {
                // Handle the case when arg1 is an SwapDataResult
                if (!arg1.success) {
                    return { success: false, error: "Lens was not successful" }
                }
                const value = arg1.swapParams.tokenIn == NATIVE_ADDRESS ? arg1.swapParams.amountIn : 0
                const tx = await this.zapContract.swap(arg1.swapParams, arg1.feeSwapPath, { value })
                //FIXME: tx type any. should be typed and passing useful data
                return { success: true, tx }
            } else if (typeof arg1 === 'object' && 'tokenIn' in arg1 && 'amountIn' in arg1 && 'tokenOut' in arg1) {
                // Handle the case when arg1 is an SwapParams
                if (arg2) {
                    const value = arg1.tokenIn == NATIVE_ADDRESS ? arg1.amountIn : 0
                    const tx = await this.zapContract.swap(arg1, arg2, { value })
                    //FIXME: tx type any. should be typed and passing useful data
                    return { success: true, tx }
                } else {
                    // Handle the case where arg2 (feeSwapPath) is not provided
                    // You might want to throw an error or handle it according to your logic
                    throw new Error("feeSwapPath not provided")
                }
            } else {
                // Default case
                throw new Error("Invalid input parameters");
            }
        } catch (error: any) {
            return { success: false, error: error.reason ?? "Something went wrong" }
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
    ): Promise<ZapDataResult> {
        this.getLensContract(dex)
        const lensContract = this.getLensContract(dex)

        try {
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

            //USD Prices
            const callDataArray: Call[] = [];
            callDataArray.push(this.getTokenPriceMulticall(tokenIn, dex));
            callDataArray.push(this.getLPPriceMulticall(tokenOut, dex));
            const returnedData = await multicall(
                this.rpcUrl,
                PriceGetterExtended_ABI,
                callDataArray,
                {
                    maxCallsPerTx: 1000,
                }
            );

            const tokenInUsdPriceSingle = returnedData?.[0][0] ?? BigNumber.from(0)
            const tokenOutUsdPriceSingle = returnedData?.[1][0] ?? BigNumber.from(0)

            const zapDataExtras: ZapDataExtras = {
                tokenInUsdPrice: tokenInUsdPriceSingle.mul(amountIn).div("1000000000000000000"),
                tokenOutUsdPrice: tokenOutUsdPriceSingle.mul(zapData.zapParams.liquidityPath.lpAmount).div("1000000000000000000"),
            }

            return { success: true, ...zapData, ...zapDataExtras }
        } catch (error: any) {
            return { success: false, error: error.reason ?? "Something went wrong" }
        }
    }

    async getZapDataNative(
        dex: DEX,
        amountIn: number | string,
        tokenOut: string,
        allowedPriceImpactPercentage: number,
        to: string = ZERO_ADDRESS
    ): Promise<ZapDataResult> {
        return this.getZapData(dex, NATIVE_ADDRESS, amountIn, tokenOut, allowedPriceImpactPercentage, to)
    }

    async zap(zapParams: ZapParams, feeSwapPath: SwapPath): Promise<SuccessOrFailure<any>>
    async zap(zapDataResult: ZapDataResult): Promise<SuccessOrFailure<any>>
    async zap(encodedTx: string): Promise<SuccessOrFailure<any>>

    async zap(arg1: ZapParams | ZapDataResult | string, arg2?: SwapPath): Promise<SuccessOrFailure<any>> {
        try {
            if (typeof arg1 === 'string') {
                // Handle the case when arg1 is an encodedTx
                // TODO: This is not actually supported yet because we don't know the native value from encodedTx here  
                return { success: false, error: "Param not yet supported" }
                // return await (this.signerOrProvider as JsonRpcSigner).sendTransaction({
                //     to: this.zapContract.address,
                //     data: arg1,
                //     // FIXME: we don't know native value from encodedTx
                //     value: 0,
                // })
            } else if (typeof arg1 === 'object' && 'success' in arg1 && 'zapParams' in arg1 && 'feeSwapPath' in arg1) {
                // Handle the case when arg1 is an ZapDataResult
                if (!arg1.success) {
                    return { success: false, error: "Lens was not successful" }
                }
                const value = arg1.zapParams.tokenIn == NATIVE_ADDRESS ? arg1.zapParams.amountIn : 0
                const tx = await this.zapContract.zap(arg1.zapParams, arg1.feeSwapPath, { value })
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
                    const tx = await this.zapContract.zap(arg1, arg2, { value })
                    return { success: true, tx }
                } else {
                    // Handle the case where arg2 (feeSwapPath) is not provided
                    // You might want to throw an error or handle it according to your logic
                    throw new Error("feeSwapPath not provided");
                }
            } else {
                // Default case
                throw new Error("Invalid input parameters");
            }
        } catch (error: any) {
            return { success: false, error: error.reason ?? "Something went wrong" }
        }
    }

    /// -----------------------------------------------------------------------
    /// Price Getter Functions
    /// -----------------------------------------------------------------------
    protected async getTokenPrice(tokenAddress: string, dex: DEX): Promise<BigNumber> {
        const uniV2Factory = FACTORIES[dex][this.chainId]?.[PriceGetterProtocol.V2]
        if (!uniV2Factory) {
            return BigNumber.from(0)
        }
        if (tokenAddress == NATIVE_ADDRESS) {
            tokenAddress = WRAPPED_NATIVE[this.chainId]
        }
        return await this.priceGetterContract.getPriceFromFactory(tokenAddress, 2, uniV2Factory, ZERO_ADDRESS, ZERO_ADDRESS)
    }

    protected async getLPPrice(tokenAddress: string, dex: DEX): Promise<BigNumber> {
        const uniV2Factory = FACTORIES[dex][this.chainId]?.[PriceGetterProtocol.V2]
        if (!uniV2Factory) {
            return BigNumber.from(0)
        }
        return await this.priceGetterContract.getLPPriceFromFactory(tokenAddress, 2, uniV2Factory, ZERO_ADDRESS, ZERO_ADDRESS)
    }

    protected getTokenPriceMulticall(tokenAddress: string, dex: DEX): Call {
        const uniV2Factory = FACTORIES[dex][this.chainId]?.[PriceGetterProtocol.V2]
        if (!uniV2Factory) {
            throw new Error("factory not found")
        }
        if (tokenAddress == NATIVE_ADDRESS) {
            tokenAddress = WRAPPED_NATIVE[this.chainId]
        }
        return {
            address: this.priceGetterContract.address,
            functionName: 'getPriceFromFactory',
            params: [tokenAddress, 2, uniV2Factory, ZERO_ADDRESS, ZERO_ADDRESS]
        }
    }

    protected getLPPriceMulticall(tokenAddress: string, dex: DEX): Call {
        const uniV2Factory = FACTORIES[dex][this.chainId]?.[PriceGetterProtocol.V2]
        if (!uniV2Factory) {
            throw new Error("factory not found")
        }
        return {
            address: this.priceGetterContract.address,
            functionName: 'getLPPriceFromFactory',
            params: [tokenAddress, 2, uniV2Factory, ZERO_ADDRESS, ZERO_ADDRESS]
        }
    }

    /// -----------------------------------------------------------------------
    /// Helper Functions
    /// -----------------------------------------------------------------------
    protected checkPriceImpact(
        priceImpactPercentage0: BigNumber,
        priceImpactPercentage1: BigNumber,
        allowedPriceImpactPercentage: number
    ): Failure | Success<null> {
        if (priceImpactPercentage0.gt((allowedPriceImpactPercentage * this.DENOMINATOR) / 100)) {
            return { success: false, error: 'Price impact for first token swap too high' }
        }
        if (priceImpactPercentage1.gt((allowedPriceImpactPercentage * this.DENOMINATOR) / 100)) {
            return { success: false, error: 'Price impact for second token swap too high' }
        }
        return { success: true, value: null } // No error
    }
}

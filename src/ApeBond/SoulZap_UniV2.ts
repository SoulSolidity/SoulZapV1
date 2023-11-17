import { BigNumber, Contract, Signer, ethers } from 'ethers';
// FIXME: I recommend pulling directly from the artifacts folder to keep it up to date, these have been updated
import { ChainId, DEX, NATIVE_ADDRESS, Project, ZAP_ADDRESS, ZAP_LENS_ADDRESS } from '../constants';
import SoulZap_UniV2_Extended_V1_ABI from '../abi/SoulZap_UniV2_Extended_Lens_V1_ABI.json'
import SoulZap_UniV2_Extended_Lens_V1_ABI from '../abi/SoulZap_UniV2_Extended_Lens_V1_ABI.json'
import { Failure, Success, SwapPath, zapData, ZapParams, ZapParams_Ext_Bonds, ZapParamsNative } from '../types';

// type ValidDex<T extends Project, U extends ChainId> = Extract<DEX, keyof (typeof ZAP_LENS_ADDRESS[T][U])>;

export class SoulZap_UniV2 {
    private signerOrProvider: ethers.providers.Provider | Signer;
    private lensContracts: Partial<Record<DEX, Contract>> = {};
    private zapContract: Contract;
    private project: Project;
    chainId: ChainId;


    //Slippage percentage after expected return amount. Only in case price changes between read and write function. NOT PRICE IMPACT SLIPPAGE
    slippage = 0.5;
    protected DENOMINATOR = 10_000;

    //FIXME/TODO: default values for ABIs make no sense. they are defaults for ApeBond with wrong naming. Don't have generic version yet
    constructor(project: Project, chainId: ChainId, signerOrProvider: ethers.providers.Provider | Signer, soulZapAbi: string = SoulZap_UniV2_Extended_V1_ABI.abi.toString(), soulZapLensAbi: string = SoulZap_UniV2_Extended_Lens_V1_ABI.abi.toString()) {
        this.project = project
        this.chainId = chainId;
        this.signerOrProvider = signerOrProvider

        //Lens contracts
        const lensAddresses = ZAP_LENS_ADDRESS[this.project][this.chainId];

        // Check if lensAddresses is defined to avoid potential errors
        if (!lensAddresses) {
            throw new Error(`Zap lens addresses not found for project ${this.project} and chainId ${this.chainId}`);
        }

        for (const dexType in lensAddresses) {
            if (Object.prototype.hasOwnProperty.call(lensAddresses, dexType)) {
                const typedDexType: DEX = dexType as DEX;
                const dexValue = lensAddresses[typedDexType];
                console.log(`DEX Type: ${dexType}, Value: ${dexValue}`);
                if (!dexValue) {
                    throw new Error(`Zap lens address not found for ${typedDexType}`);
                }
                this.lensContracts[typedDexType] = new ethers.Contract(dexValue, soulZapLensAbi, this.signerOrProvider)
            }
        }

        //Zap contract
        const zapAddress = ZAP_ADDRESS[this.project][this.chainId];
        if (!zapAddress) {
            throw new Error('Zap address not found');
        }
        this.zapContract = new ethers.Contract(zapAddress, soulZapAbi, this.signerOrProvider);
    }

    getLensContract(dex: DEX): Contract {
        const contract = this.lensContracts[dex];
        if (!contract) {
            throw new Error('contract not found for dex');
        }
        return contract;
    }

    getZapContract(): Contract {
        return this.zapContract;
    }

    setSlippage(slippage: number) {
        this.slippage = slippage;
    }

    async getZapData(dex: DEX, fromToken: string, amount: number | string, toToken: string, allowedPriceImpactPercentage: number, to: string): Promise<zapData> {
        this.getLensContract(dex);
        const lensContract = this.getLensContract(dex);
        const zapData = await lensContract.getZapData(fromToken, amount, toToken, this.slippage * this.DENOMINATOR, to);
        const priceImpactError = await this.checkPriceImpact(zapData.priceImpactPercentage0, zapData.priceImpactPercentage1, allowedPriceImpactPercentage);

        if (!priceImpactError.success) {
            return priceImpactError;
        }

        return zapData.params;
    }

    async getZapDataNative(dex: DEX, amount: number | string, toToken: string, allowedPriceImpactPercentage: number, to: string): Promise<zapData> {
        return this.getZapData(dex, NATIVE_ADDRESS, amount, toToken, allowedPriceImpactPercentage, to);
    }

    protected checkPriceImpact(priceImpactPercentage0: number, priceImpactPercentage1: number, allowedPriceImpactPercentage: number): Failure | Success<null> {
        if (priceImpactPercentage0 > allowedPriceImpactPercentage * this.DENOMINATOR) {
            return { success: false, error: "Price impact for first token swap too high" };
        }
        if (priceImpactPercentage1 > allowedPriceImpactPercentage * this.DENOMINATOR) {
            return { success: false, error: "Price impact for second token swap too high" };
        }
        return { success: true, value: null }; // No error
    }

}
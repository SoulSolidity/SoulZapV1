import { BigNumber, Signer, ethers } from 'ethers';
import { ChainId, DEX, Project } from '../constants';
import SoulZap_UniV2_Extended_V1_ABI from '../abi/SoulZap_UniV2_Extended_Lens_V1_ABI.json'
import SoulZap_UniV2_Extended_Lens_V1_ABI from '../abi/SoulZap_UniV2_Extended_Lens_V1_ABI.json'
import { SwapPath, zapDataBond, ZapParams, ZapParams_Ext_Bonds, ZapParamsNative } from '../types';
import { SoulZap_UniV2 } from './SoulZap_UniV2'

export class SoulZap_UniV2_ApeBond extends SoulZap_UniV2 {
    constructor(chainId: ChainId, signerOrProvider: ethers.providers.Provider | Signer) {
        super(Project.APEBOND, chainId, signerOrProvider, SoulZap_UniV2_Extended_V1_ABI.abi.toString(), SoulZap_UniV2_Extended_Lens_V1_ABI.abi.toString());
    }

    async getZapDataBond(dex: DEX, fromToken: string, amount: number | string, bond: string, allowedPriceImpactPercentage: number, to: string): Promise<zapDataBond> {
        const lensContract = this.getLensContract(dex);
        const zapData = await lensContract.getZapDataBond(fromToken, amount, bond, this.slippage, to);
        const priceImpactError = await this.checkPriceImpact(zapData.priceImpactPercentage0, zapData.priceImpactPercentage1, allowedPriceImpactPercentage);

        if (priceImpactError) {
            return priceImpactError;
        }

        return zapData.params;
    }

    async getZapDataBondNative(dex: DEX, amount: number | string, bond: string, allowedPriceImpactPercentage: number, to: string): Promise<zapDataBond> {
        const lensContract = this.getLensContract(dex);
        const zapData = await lensContract.getZapDataBondNative(amount, bond, this.slippage, to);
        const priceImpactError = await this.checkPriceImpact(zapData.priceImpactPercentage0, zapData.priceImpactPercentage1, allowedPriceImpactPercentage);

        if (priceImpactError) {
            return priceImpactError;
        }

        return zapData.params;
    }
}
import { ethers } from 'ethers';
import { ChainId, ZAP_LENS_ADDRESS } from '../constants';
import SoulZapV1Abi from '../abi/SoulZapFullV1LensAbi.json'
import { ZapBondData, ZapBondDataNative, ZapParamsBond, ZapParamsBondNative } from '../types';

function getLensContract(rpc: string): ethers.Contract {
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    //TODO: Make it a dynamic chainId
    const contract = new ethers.Contract(ZAP_LENS_ADDRESS[ChainId.BNB], SoulZapV1Abi.abi, provider);
    return contract;
}

//Slippage after expected return amount. Only in case price changes between read and write function. NOT PRICE IMPACT SLIPPAGE
const slippage = 50; //denominator of 10_000. 50 = 0.5% 

export async function getZapDataBond(fromToken: string, amount: number | string, bill: string, allowedPriceImpactPercentage: number, to: string, rpc: string): Promise<ZapBondData | { error: string }> {
    const lensContract = getLensContract(rpc);
    const zapData = await lensContract.getZapData(fromToken, amount, bill, slippage, to);
    if (zapData.priceChangePercentage0 > allowedPriceImpactPercentage * 10_000) {
        return { error: "Price impact for first token swap too high" }
    }
    if (zapData.priceChangePercentage1 > allowedPriceImpactPercentage * 10_000) {
        return { error: "Price impact for second token swap too high" }
    }
    return zapData.params;
}

export async function getZapDataBondNative(amount: number | string, bill: string, allowedPriceImpactPercentage: number, to: string, rpc: string): Promise<ZapBondDataNative | { error: string }> {
    const lensContract = getLensContract(rpc);
    const zapData = await lensContract.getZapDataNative(amount, bill, slippage, to);
    if (zapData.priceChangePercentage0 > allowedPriceImpactPercentage * 10_000) {
        return { error: "Price impact for first token swap too high" }
    }
    if (zapData.priceChangePercentage1 > allowedPriceImpactPercentage * 10_000) {
        return { error: "Price impact for second token swap too high" }
    }
    return zapData.params;
} 
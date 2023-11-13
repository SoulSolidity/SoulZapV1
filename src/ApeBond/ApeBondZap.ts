import { BigNumber, ethers } from 'ethers';
import { ChainId, ZAP_LENS_ADDRESS } from '../constants';
import SoulZapV1Abi from '../abi/SoulZapFullV1LensAbi.json'
import { SwapPath, ZapBondData, ZapBondDataNative, ZapParams, ZapParams_Ext_Bonds, ZapParamsBond, ZapParamsBondNative, ZapParamsNative } from '../types';

function getLensContract(rpc: string): ethers.Contract {
    const provider = new ethers.providers.JsonRpcProvider(rpc);
    //TODO: Make it a dynamic chainId
    const contract = new ethers.Contract(ZAP_LENS_ADDRESS[ChainId.BNB], SoulZapV1Abi.abi, provider);
    return contract;
}

//Slippage after expected return amount. Only in case price changes between read and write function. NOT PRICE IMPACT SLIPPAGE
const slippage = 50; //denominator of 10_000. 50 = 0.5% 
const DENOMINATOR = 10_000;

type zapData = { error: string } | { encodedTx: string, zapParams: ZapParams | ZapParamsNative, feeSwapPath: SwapPath, priceImpactPercentages: BigNumber[] }
type zapDataBond = { error: string } | { encodedTx: string, zapParams: ZapParams | ZapParamsNative, feeSwapPath: SwapPath, priceImpactPercentages: BigNumber[], zapParamsBonds: ZapParams_Ext_Bonds }

export async function getZapData(fromToken: string, amount: number | string, toToken: string, allowedPriceImpactPercentage: number, to: string, rpc: string): Promise<zapData> {
    const lensContract = getLensContract(rpc);
    const zapData = await lensContract.getZapData(fromToken, amount, toToken, slippage, to);
    if (zapData.priceImpactPercentage0 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for first token swap too high" }
    }
    if (zapData.priceImpactPercentage1 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for second token swap too high" }
    }
    return zapData.params;
}

export async function getZapDataNative(amount: number | string, toToken: string, allowedPriceImpactPercentage: number, to: string, rpc: string): Promise<zapData> {
    const lensContract = getLensContract(rpc);
    const zapData = await lensContract.getZapDataNative(amount, toToken, slippage, to);
    if (zapData.priceImpactPercentage0 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for first token swap too high" }
    }
    if (zapData.priceImpactPercentage1 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for second token swap too high" }
    }
    return zapData.params;
}

export async function getZapDataBond(fromToken: string, amount: number | string, bill: string, allowedPriceImpactPercentage: number, to: string, rpc: string): Promise<zapDataBond> {
    const lensContract = getLensContract(rpc);
    const zapData = await lensContract.getZapDataBond(fromToken, amount, bill, slippage, to);
    if (zapData.priceImpactPercentage0 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for first token swap too high" }
    }
    if (zapData.priceImpactPercentage1 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for second token swap too high" }
    }
    return zapData.params;
}

export async function getZapDataBondNative(amount: number | string, bill: string, allowedPriceImpactPercentage: number, to: string, rpc: string): Promise<zapDataBond> {
    const lensContract = getLensContract(rpc);
    const zapData = await lensContract.getZapDataBondNative(amount, bill, slippage, to);
    if (zapData.priceImpactPercentage0 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for first token swap too high" }
    }
    if (zapData.priceImpactPercentage1 > allowedPriceImpactPercentage * DENOMINATOR) {
        return { error: "Price impact for second token swap too high" }
    }
    return zapData.params;
} 
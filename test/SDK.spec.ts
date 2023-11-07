// tests/calculator.spec.tx
import { assert } from "chai";
import { providers, utils } from "ethers";
import { getZapDataBond, getZapDataBondNative } from '../src/index'

// const WMATIC = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270";
// const DAI = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
// const ETH = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619";
// const BANANA = "0x5d47bAbA0d66083C52009271faF3F50DCc01023C";
// const USDT = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"; 
// const USDC = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"; 
// const WOMBAT = "0x0C9c7712C83B3C70e7c5E11100D33D9401BdF9dd";
// const MIMATIC = "0xa3Fa99A148fA48D14Ed51d610c367C61876997F1";

// const USDCWOMBATBOND = "0x4F256deDd156fB1Aa6e485E92FeCeB7bc15EBFcA";
// //Gamma
// const gammaMaticWeth = "0x81Cec323BF8C4164c66ec066F53cc053A535f03D";
// const gammaMaticQuick = "0x7f09bd2801a7b795df29c273c4afbb0ff15e2d63";

// const MINI_APE_V2 = "0x54aff400858Dcac39797a81894D9920f16972D1D";
// const KEEPER_MAXIMIZER_VAULT_APE = "0xe5C27CD5981B727d25D37B155aBF9Aa152CEaDBe";
// const POLYGON_ARRAKIS_FACTORY = "0x37265A834e95D11c36527451c7844eF346dC342a";

const DEFAULT_SLIPPAGE = 0.95;
const TO_ADDRESS = "0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2";

export const ether = (value: string) =>
  utils.parseUnits(value, "ether").toString();

describe("SDK - lens contract", () => {
  it("Should return data", async () => {
    const zapData: any = await getZapDataBondNative("100" + "000000000000000000", "0xB12413a70efd97B827201a071285fBFfCAC436Bc", 50, TO_ADDRESS, "https://binance.llamarpc.com");
    console.log(zapData.encodedTx)
  });
});

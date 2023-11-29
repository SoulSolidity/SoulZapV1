// tests/calculator.spec.tx
import { assert } from 'chai'
import { providers, utils } from 'ethers'
import { SoulZap_UniV2_ApeBond } from '../src/index'
import { ChainId, DEX, Project } from '../src/constants'
import { ethers } from 'hardhat'
import { getEnv, Logger, logger, testRunner } from '../hardhat/utils'

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

const DEFAULT_SLIPPAGE = 0.95
const TO_ADDRESS = '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2'

export const ether = (value: string) => utils.parseUnits(value, 'ether').toString()

describe('SDK - lens contract', () => {
  it('Should return data', async () => {
    const rpc = getEnv('POLYGON_RPC_URL')
    const provider = new ethers.providers.JsonRpcProvider(rpc)
    const wallet = ethers.Wallet.fromMnemonic(getEnv('TESTNET_MNEMONIC'))
    const signer = wallet.connect(provider)

    //Create soulZap object
    const soulZap = new SoulZap_UniV2_ApeBond(ChainId.POLYGON, signer)
    soulZap.setSlippage(1)
    const dex = DEX.APEBOND
    const amount = '10000000000000000'
    const BOND_ADDRESS = '0x4F256deDd156fB1Aa6e485E92FeCeB7bc15EBFcA'
    const LP_ADDRESS = '0x304e57c752E854E9A233Ae82fcC42F7568b81180'
    //APE LP '0x034293f21f1cce5908bc605ce5850df2b1059ac0'
    //QS LP '0x304e57c752E854E9A233Ae82fcC42F7568b81180'
    const recipient = '0x551DcB2Cf6155CBc4d1a8151576EEC43f3aE5559'
    const allowedPriceImpactPercentage = 3 //max 3% price impact or it returns an error (for low liquidity or large zaps)

    const zapDataBond = await soulZap.getZapDataBondNative(
      dex,
      amount,
      BOND_ADDRESS,
      allowedPriceImpactPercentage,
      recipient
    )
    console.log(zapDataBond)

    //Error handling
    if (!zapDataBond.success) {
      // Log or handle the error appropriately
      console.error(zapDataBond.error)
      return
    }

    // Data to possibly show on UI
    zapDataBond.zapParams.path0.amountOut
    zapDataBond.zapParams.path1.amountOut
    zapDataBond.zapParams.liquidityPath.lpAmount

    //Actual zap tx different options
    // await soulZap.zap(zapDataBond)
    // await soulZap.zapBond(zapDataBond.encodedTx)
    // await soulZap.zapBond(zapDataBond.zapParams, zapDataBond.zapParamsBonds, zapDataBond.feeSwapPath)

    //Or own variation
    // const soulZapContract = soulZap.getZapContract()
    // await signer.sendTransaction({
    //   to: soulZapContract.address, // Address of the contract
    //   data: zapDataBond.encodedTx,
    //   value: zapDataBond.zapParams.amountIn,
    // })
  })
})

import hardhatConfig from '../hardhat.config'
import { assert } from 'chai'
import { Suite } from 'mocha'
import { providers, utils } from 'ethers'
import { SoulZap_ApeBond, ZapDataBondResult } from '../src/index'
import { ChainId, DEX, Project, ZERO_ADDRESS } from '../src/constants'
import { ethers } from 'hardhat'
import { getEnv, Logger, logger, testRunner } from '../hardhat/utils'
import { parseEther } from 'ethers/lib/utils'
import { HttpNetworkUserConfig } from 'hardhat/types'
import { TransactionRequest } from '@ethersproject/providers'
import { unlockSigner } from '../test-fork/utils/accountHelper'
import { setupFork } from './utils'
import { Networks } from '../hardhat'
import { getDeployConfig } from '../scripts/deploy/deploy.config'
import { runTenderlySimulation } from '../hardhat/utils/tenderly'

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

describe('SDK - lens contract', function (this: Suite) {
  this.timeout(60000)

  it('Should return data', async () => {
    const currentNetwork: Networks = 'polygon'
    await setupFork(currentNetwork)
    const { SoulZap_UniV2 } = getDeployConfig(currentNetwork)
    const polygonWhale = '0x7a8ed27f4c30512326878652d20fc85727401854'
    const unlockedSigner = await unlockSigner(polygonWhale, '10000')

    //Create soulZap object
    const soulZap = new SoulZap_ApeBond(ChainId.POLYGON, unlockedSigner)
    soulZap.setSlippage(1)
    // const dex = DEX.APEBOND
    const dex = DEX.QUICKSWAP
    const amount = parseEther('300')
    const BOND_ADDRESS = '0xa772329656bcEDa4e312735bbac24d1EF944e793' // TODO: This one is failing over $450
    // const BOND_ADDRESS = '0x6Df8830c1dA2a5bB0e4A98DD84f079E83eE9e9a5'
    const LP_ADDRESS = '0x89470e8D8bB8655a94678d801e0089c4646f5E84'
    //APE LP '0x034293f21f1cce5908bc605ce5850df2b1059ac0'
    //QS LP '0x304e57c752E854E9A233Ae82fcC42F7568b81180'
    const recipient = '0x551DcB2Cf6155CBc4d1a8151576EEC43f3aE5559'
    const allowedPriceImpactPercentage = 3 //max 3% price impact or it returns an error (for low liquidity or large zaps)

    console.log(dex)
    const zapDataBond = await soulZap.getZapDataBondNative(
      dex,
      amount.toString(),
      BOND_ADDRESS,
      allowedPriceImpactPercentage,
      recipient
    )

    //Error handling
    if (!zapDataBond.success) {
      // Log or handle the error appropriately
      console.error(zapDataBond.error)
      throw new Error('Error getting zap data')
    }

    // Data to possibly show on UI
    console.dir(zapDataBond.data.zapParams, { depth: null })
    zapDataBond.data.tokenInUsdPrice
    zapDataBond.data.tokenOutUsdPrice
    zapDataBond.data.zapParams.path0.amountOut
    zapDataBond.data.zapParams.path1.amountOut
    zapDataBond.data.zapParams.liquidityPath.lpAmount
    console.log(`Encoded tx: ${zapDataBond.data.encodedTx}`)

    // Actual zap tx different options
    const zapTx = await soulZap.zapBond(
      { zapParams: zapDataBond.data.zapParams, feeSwapPath: zapDataBond.data.feeSwapPath },
      zapDataBond.data.zapParamsBonds
    )
    if (!zapTx.success) {
      // Log or handle the error appropriately
      console.error('errors with', zapTx.error)
      throw new Error('Error zapping')
    } else {
      console.dir({ zapTx }, { depth: null })
    }

    //Or own variation
    // const soulZapContract = soulZap.getZapContract()
    // const tx: TransactionRequest = {
    //   to: soulZapContract,
    //   data: zapDataBond.data.encodedTx,
    //   value: zapDataBond.data.zapParams.amountIn,
    // }
    // await signer.sendTransaction(tx)
  })
})

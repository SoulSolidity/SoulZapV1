/**
 * hardhat-network-helpers:
 * `mine`: Increase block height
 * `time`: Adjust block timestamp
 */
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployRoutingFixture, deployZapFixture } from '../test/fixtures'
/**
 * hardhat-chai-matchers reference
 * https://hardhat.org/hardhat-chai-matchers/docs/reference
 *
 * The @nomicfoundation/hardhat-chai-matchers plugin is meant to be a drop-in replacement
 * for the @nomiclabs/hardhat-waffle plugin
 *
 * https://hardhat.org/hardhat-chai-matchers/docs/migrate-from-waffle
 *
 * VSCode + Hardhat:
 * https://marketplace.visualstudio.com/items?itemName=NomicFoundation.hardhat-solidity
 */
import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../scripts/deploy/deploy.config'
import { WHALE_ADDRESS_POLYGON } from './utils/constants'
import { unlockSigner } from './utils/accountHelper'

describe('Fork: SoulZap', function () {
  /**
   * Configurable fixture to use for each test file.
   *
   * As only one fixture can be used per test. This fixture intends to batch multiple contract
   * deployment functions into a single fixture.
   *
   * Fixtures improve test efficiency by reusing the same setup in every test.
   * loadFixture() runs this setup once, snapshots that state,
   * and resets the Hardhat Network to that snapshot for every test.
   */
  async function fixture() {
    // Contracts are deployed using the first signer/account by default
    const accounts = await ethers.getSigners()
    const activeAccounts = accounts.slice(0, 9)
    const [owner, zapReceiver] = activeAccounts
    // Impersonate whale
    const whaleSigner = await unlockSigner(WHALE_ADDRESS_POLYGON, '10000')
    // Polygon Onchain Tokens
    const USDC = await ethers.getContractAt('IERC20', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174')

    const chain: DeployableNetworks = 'polygon'
    const { wNative, admin, dexInfo, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig(chain)
    const zapDeploymentApeBond = await deployZapFixture(ethers, chain)
    const routingDeploymentApeBond = await deployRoutingFixture(
      ethers,
      chain,
      zapDeploymentApeBond.soulZap.address,
      dexInfo.ApeBond?.router!
    )
    const routingDeploymentQuickSwap = await deployRoutingFixture(
      ethers,
      chain,
      zapDeploymentApeBond.soulZap.address,
      dexInfo.QuickSwap?.router!
    )

    return {
      soulZap: zapDeploymentApeBond.soulZap,
      soulAccessRegistry: zapDeploymentApeBond.soulAccessRegistry,
      soulFeeManager: zapDeploymentApeBond.soulFeeManager,
      soulZap_ApeBond_Lens: routingDeploymentApeBond.soulZap_Lens,
      soulZap_Quick_Lens: routingDeploymentQuickSwap.soulZap_Lens,
      accounts: { whaleSigner, owner, zapReceiver, activeAccounts },
      tokens: { USDC },
    }
  }

  describe('LPs', function () {
    it('ApeBond USDC -> APE USDT-MATIC LP', async function () {
      const {
        soulAccessRegistry,
        soulFeeManager,
        soulZap,
        soulZap_ApeBond_Lens,
        soulZap_Quick_Lens,
        accounts: { whaleSigner, zapReceiver },
        tokens: { USDC },
      } = await loadFixture(fixture)
      const amount = '1000000'

      const bestRoute = await soulZap_ApeBond_Lens.getZapData(
        USDC.address,
        amount,
        '0x65D43B64E3B31965Cd5EA367D4c2b94c03084797',
        0,
        zapReceiver.address
      )

      await USDC.connect(whaleSigner).approve(soulZap.address, amount)
      const zapTx = await whaleSigner.sendTransaction({
        to: soulZap.address, // Address of the contract
        data: bestRoute.encodedTx,
      })
    })

    it('ApeBond NATIVE -> Quickswap USDT-IXT', async function () {
      const {
        soulAccessRegistry,
        soulFeeManager,
        soulZap,
        soulZap_ApeBond_Lens,
        soulZap_Quick_Lens,
        accounts: { whaleSigner, zapReceiver },
      } = await loadFixture(fixture)
      const amount = '1000000'

      const bestRoute = await soulZap_ApeBond_Lens.getZapDataBondNative(
        amount,
        '0xefE300c0d5c4A6F3106B28668082689b4e18B8D1',
        0,
        zapReceiver.address
      )
      console.log(JSON.stringify(bestRoute))

      // await usdc.approve(soulZap.address, amount)
      const zapTx = await whaleSigner.sendTransaction({
        to: soulZap.address, // Address of the contract
        data: bestRoute.encodedTx,
        value: amount,
      })
    })
  })
})

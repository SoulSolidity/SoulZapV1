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

describe('SoulZap', function () {
  const USDC = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'

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
    const chain: DeployableNetworks = 'polygon'
    const { wNative, admin, dexInfo, feeCollector, proxyAdminAddress } = getDeployConfig(chain)
    // TODO: Pulling from ApeBond hop tokens
    const hopTokens = dexInfo.ApeBond?.hopTokens || []
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

    // Add the router to the whitelist
    await zapDeploymentApeBond.soulZap.setRouterWhitelist(await routingDeploymentApeBond.soulZap_Lens.router(), true)

    return {
      soulZap: zapDeploymentApeBond.soulZap,
      soulAccessRegistry: zapDeploymentApeBond.soulAccessRegistry,
      soulFeeManager: zapDeploymentApeBond.soulFeeManager,
      soulZap_ApeBond_Lens: routingDeploymentApeBond.soulZap_Lens,
      soulZap_Quick_Lens: routingDeploymentQuickSwap.soulZap_Lens,
      settings: { DEFAULT_OFFSET: 60 * 20 }
    }
  }

  describe('LPs', function () {
    it('ApeBond Native -> APE USDT-MATIC LP', async function () {
      const { soulAccessRegistry, soulFeeManager, soulZap, soulZap_ApeBond_Lens, soulZap_Quick_Lens, settings } =
        await loadFixture(fixture)
      const signer = ethers.provider.getSigner()
      const amount = '1000000000000000000'

      const bestRoute = await soulZap_ApeBond_Lens.getZapDataNative(
        amount,
        '0x65D43B64E3B31965Cd5EA367D4c2b94c03084797',
        0,
        '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
        settings.DEFAULT_OFFSET
      )
      console.log(JSON.stringify(bestRoute))
      const zapTx = await signer.sendTransaction({
        to: soulZap.address, // Address of the contract
        data: bestRoute.encodedTx,
        value: amount
      })
    })

    it('ApeBond USDC -> APE USDT-MATIC LP', async function () {
      const { soulAccessRegistry, soulFeeManager, soulZap, soulZap_ApeBond_Lens, soulZap_Quick_Lens, settings } =
        await loadFixture(fixture)
      const signer = ethers.provider.getSigner()
      const amount = '1000000'
      console.log(await signer.getAddress())

      const usdc = await ethers.getContractAt('ERC20', USDC)

      const accountToImpersonate = '0xf89d7b9c864f589bbF53a82105107622B35EaA40'
      await ethers.provider.send('hardhat_impersonateAccount', [accountToImpersonate])
      const fakeSigner = await ethers.getSigner(accountToImpersonate)
      console.log('go')
      const balance = await usdc.balanceOf(accountToImpersonate)
      console.log(balance.toString())
      await usdc.connect(fakeSigner).transfer(await signer.getAddress(), amount)

      console.log('done')

      const bestRoute = await soulZap_ApeBond_Lens.getZapData(
        USDC,
        amount,
        '0x65D43B64E3B31965Cd5EA367D4c2b94c03084797',
        0,
        '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
        settings.DEFAULT_OFFSET
      )
      console.log(JSON.stringify(bestRoute))
      await usdc.approve(soulZap.address, amount)
      const zapTx = await signer.sendTransaction({
        to: soulZap.address, // Address of the contract
        data: bestRoute.encodedTx,
      })
    })

    it('QS Native -> APE USDT-MATIC LP', async function () {
      const { soulAccessRegistry, soulFeeManager, soulZap, soulZap_ApeBond_Lens, soulZap_Quick_Lens, settings } =
        await loadFixture(fixture)
      const signer = ethers.provider.getSigner()
      const amount = '1000000000000000000'

      const bestRoute = await soulZap_Quick_Lens.getZapDataNative(
        amount,
        '0x604229c960e5CACF2aaEAc8Be68Ac07BA9dF81c3',
        0,
        '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
        settings.DEFAULT_OFFSET
      )
      console.log(JSON.stringify(bestRoute))
      const zapTx = await signer.sendTransaction({
        to: soulZap.address, // Address of the contract
        data: bestRoute.encodedTx,
        value: amount,
      })
    })

    it('QS USDC -> APE USDT-MATIC LP', async function () {
      const { soulAccessRegistry, soulFeeManager, soulZap, soulZap_ApeBond_Lens, soulZap_Quick_Lens, settings } =
        await loadFixture(fixture)
      const signer = ethers.provider.getSigner()
      const amount = '1000000'
      console.log(await signer.getAddress())

      const usdc = await ethers.getContractAt('ERC20', USDC)

      const accountToImpersonate = '0xf89d7b9c864f589bbF53a82105107622B35EaA40'
      await ethers.provider.send('hardhat_impersonateAccount', [accountToImpersonate])
      const fakeSigner = await ethers.getSigner(accountToImpersonate)
      console.log('go')
      const balance = await usdc.balanceOf(accountToImpersonate)
      console.log(balance.toString())
      await usdc.connect(fakeSigner).transfer(await signer.getAddress(), amount)

      console.log('done')

      const bestRoute = await soulZap_Quick_Lens.getZapData(
        USDC,
        amount,
        '0x604229c960e5CACF2aaEAc8Be68Ac07BA9dF81c3',
        0,
        '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
        settings.DEFAULT_OFFSET
      )
      console.log(JSON.stringify(bestRoute))
      await usdc.approve(soulZap.address, amount)
      const zapTx = await signer.sendTransaction({
        to: soulZap.address, // Address of the contract
        data: bestRoute.encodedTx,
      })
    })
  })
})

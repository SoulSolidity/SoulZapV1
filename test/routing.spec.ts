/**
 * hardhat-network-helpers:
 * `mine`: Increase block height
 * `time`: Adjust block timestamp
 */
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { deployRoutingFixture } from './fixtures'
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
import { getDeployConfig } from '../scripts/deploy/deploy.config'

describe('Routing', function () {
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
    const { wNative, admin, dexInfo, hopTokens, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig('polygon')
    const routingDeploymentApeBond = await deployRoutingFixture(ethers, dexInfo.ApeBond?.router!);
    const routingDeploymentQuickSwap = await deployRoutingFixture(ethers, dexInfo.QuickSwap?.router!);
    return { routingDeploymentApeBond, routingDeploymentQuickSwap }
  }

  describe('Test best path routing', function () {
    it('Should work', async function () {
      const { routingDeploymentApeBond, routingDeploymentQuickSwap } = await loadFixture(fixture)
      console.log('deployed at:', routingDeploymentApeBond.soulZap_Lens.address)
      console.log('deployed at:', routingDeploymentQuickSwap.soulZap_Lens.address)
      const bestRoute = await routingDeploymentApeBond.soulZap_Lens.getZapDataNative('1000000000000000000', '0x65D43B64E3B31965Cd5EA367D4c2b94c03084797', 0, '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2');
      // const bestRoute = await routingDeploymentApeBond.soulZap_Lens.getBestRoute('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', '1000000000000000000', 0, 0);
      console.log(JSON.stringify(bestRoute));
      // const bestRouteQS = await routingDeploymentQuickSwap.soulZap_Lens.getBestRoute('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', '1000000000000000000', 0, 0);
      // console.log(JSON.stringify(bestRouteQS));
      // const bestRoute = await soulZap_Lens.getZapDataNative('1000000000000000000', '0x304e57c752E854E9A233Ae82fcC42F7568b81180', 1, '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2');
      // console.log(bestRoute);
    })
  })
}) 

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
    const routingDeployment = await deployRoutingFixture(ethers)
    return { ...routingDeployment }
  }

  describe('Test best path routing', function () {
    it('Should work', async function () {
      const { soulZap_Lens } = await loadFixture(fixture)
      console.log('deployed at:', soulZap_Lens.address)
      // const bestRoute = await soulZap_Lens.getBestRoute('0x5d47bAbA0d66083C52009271faF3F50DCc01023C', '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', '100000000000000000000', 0);
      const bestRoute = await soulZap_Lens.getZapDataNative('1000000000000000000', '0x4f9763e745381472a75965E3431782741D607952', 1, '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2');
      // console.log(bestRoute);
      console.log(JSON.stringify(bestRoute));
    })
  })
}) 

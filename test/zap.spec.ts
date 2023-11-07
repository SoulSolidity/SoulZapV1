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

  describe('Test', function () {
    it('Should work', async function () {
      const { soulZap_Lens } = await loadFixture(fixture)
      const bestRoute = await soulZap_Lens.getPairLength('0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6');
      // const bestRoute = await soulZap_Lens.getBestRoute('0x603c7f932ED1fc6575303D8Fb018fDCBb0f39a95', '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', "100000000000000000");
      console.log(bestRoute);
    })
  })
})

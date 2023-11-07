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
      const bestRoute = await soulZap_Lens.getZapData('0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', '100000000000000000000', '0xB12413a70efd97B827201a071285fBFfCAC436Bc', 0, '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2');
      // console.log(bestRoute);
      console.log(JSON.stringify(bestRoute));
    })
  })
}) 

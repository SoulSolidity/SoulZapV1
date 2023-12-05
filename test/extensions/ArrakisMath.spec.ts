import { ethers } from 'hardhat'
// https://hardhat.org/hardhat-network-helpers/docs/reference
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import '@nomicfoundation/hardhat-chai-matchers'

import { dynamicFixture } from '../fixtures'
import { ERC20, ArrakisMath_Test } from '../../typechain-types'
import { formatBNValueToString } from '../utils'
import { logger } from 'ethers'

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
  const arrakisMath_Test = await ethers.deployContract('ArrakisMath_Test') as ArrakisMath_Test

  type InputsType = {
    _inputAmount: number,
    _underlying0: number,
    _underlying1: number,
    _weightedPrice0: number,
    _weightedPrice1: number,
  }
  
  const inputs_0: InputsType = {
    _inputAmount: 1_000_000,
    _underlying0: 1_000_000,
    _underlying1: 1_000_000,
    _weightedPrice0: 1_000_000,
    _weightedPrice1: 1_000_000,
  }
  const inputs_1: InputsType = {
    _inputAmount: 1_000_000_000,
    _underlying0: 1_000_000_000_000_000,
    _underlying1: 1_000_000,
    _weightedPrice0: 1_000_000_000,
    _weightedPrice1: 1_000_000,
  }

  const inputs_2: InputsType = {
    _inputAmount: 1_000_000,
    _underlying0: 1_000_000,
    _underlying1: 1_000_000,
    _weightedPrice0: 1_000_000,
    _weightedPrice1: 1_000_000,
  }

  return { arrakisMath_Test, accounts, inputs: {inputs_0, inputs_1, inputs_2} }
}

describe('ArrakisMath_Test', function () {
  it('inputs_0', async () => {
    logger.info('inputs_0')
    const { arrakisMath_Test, inputs: {inputs_0, inputs_1} } = await loadFixture(fixture)

    
    const getSwapRatio_0_return = await arrakisMath_Test.getSwapRatio_0(...Object.values(inputs_0) as [number, number, number, number, number])
    const getSwapRatio_1_return = await arrakisMath_Test.getSwapRatio_1(...Object.values(inputs_0) as [number, number, number, number, number])

    console.dir({
      getSwapRatio_0_return: formatBNValueToString(getSwapRatio_0_return),
      getSwapRatio_1_return: formatBNValueToString(getSwapRatio_1_return),
    })

    expect(getSwapRatio_0_return.amount0).to.equal(getSwapRatio_1_return.amount0)
    expect(getSwapRatio_0_return.amount1).to.equal(getSwapRatio_1_return.amount1)
  })

  it('inputs_1', async () => {
    logger.info('inputs_1')
    const { arrakisMath_Test, inputs: {inputs_1} } = await loadFixture(fixture)

    
    const getSwapRatio_0_return = await arrakisMath_Test.getSwapRatio_0(...Object.values(inputs_1) as [number, number, number, number, number])
    const getSwapRatio_1_return = await arrakisMath_Test.getSwapRatio_1(...Object.values(inputs_1) as [number, number, number, number, number])

    console.dir({
      getSwapRatio_0_return: formatBNValueToString(getSwapRatio_0_return),
      getSwapRatio_1_return: formatBNValueToString(getSwapRatio_1_return),
    })

    expect(getSwapRatio_0_return.amount0).to.equal(getSwapRatio_1_return.amount0)
    expect(getSwapRatio_0_return.amount1).to.equal(getSwapRatio_1_return.amount1)
  })
})

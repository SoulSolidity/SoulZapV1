import { ethers } from 'hardhat'
// https://hardhat.org/hardhat-network-helpers/docs/reference
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import '@nomicfoundation/hardhat-chai-matchers'

import { deployDexAndHopTokens } from './fixtures/deployDexAndHopTokens'
import { deployZap_UniV2_Extended_V1 } from './fixtures/deployZap_Mock'

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
  const [owner, feeTo, tokensOwner] = accounts

  const dexAndHopTokens_deployment = await deployDexAndHopTokens(ethers, [owner, feeTo, tokensOwner])
  const {
    uniV2Dex: { mockWBNB, dexRouter, dexFactory },
    baseTokens: { hopTokens },
  } = dexAndHopTokens_deployment

  const ZapUniV2_Extended_V1_deployment = await deployZap_UniV2_Extended_V1(
    ethers,
    owner.address,
    mockWBNB.address,
    dexRouter.address,
    hopTokens.map((token) => token.address)
  )

  return {
    dexAndHopTokens_deployment,
    ZapUniV2_Extended_V1_deployment,
    accounts: [owner, feeTo, tokensOwner],
  }
}

describe('SoulZap_UniV2.sol Tests', function () {
  it('Should be able to load fixture', async () => {
    const loadedFixture = await loadFixture(fixture)

    expect(loadedFixture).to.not.be.undefined
  })
})

import { ethers } from 'hardhat'
// https://hardhat.org/hardhat-network-helpers/docs/reference
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import '@nomicfoundation/hardhat-chai-matchers'

import { deployDexAndHopTokens } from './fixtures/deployDexAndHopTokens'
import { deployZap_UniV2_Extended_V1 } from './fixtures/deployZap_Mock'
import { formatBNValueToString } from './utils'
import { ether } from './fixtures/UniV2/deployUniV2Dex'

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
  const [owner, feeTo, tokensOwner, zapReceiver] = accounts

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
    hopTokens.map((token) => token.address),
    hopTokens[0].address //feeToken
  )

  return {
    dexAndHopTokens_deployment,
    ZapUniV2_Extended_V1_deployment,
    accounts: [owner, feeTo, tokensOwner, zapReceiver],
  }
}

describe('SoulZap_UniV2.sol Tests', function () {
  it('Should be able to load fixture', async () => {
    const loadedFixture = await loadFixture(fixture)

    expect(loadedFixture).to.not.be.undefined
  })

  it('Should be able to zap all input tokens', async () => {
    const {
      dexAndHopTokens_deployment: {
        baseTokens: { inputTokens },
        pairs,
      },
      ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
      accounts: [owner, feeTo, tokensOwner, zapReceiver],
    } = await loadFixture(fixture)

    const inputAmount = ether('.001')
    const slippage = 100 // 1%
    const inputToken = inputTokens[0]
    const lpToken = pairs.hopLpPairs[5]

    // TODO: hardcoded
    const zapData = await soulZap_Lens.getZapData(
      inputToken.address,
      inputAmount,
      lpToken.address,
      slippage,
      zapReceiver.address
    )

    // FIXME: log
    console.dir(
      {
        zapData: formatBNValueToString(zapData),
        inputToken: inputToken.address,
        inputAmount: formatBNValueToString(inputAmount),
        lpToken: lpToken.address,
        slippage: formatBNValueToString(slippage),
        zapReceiver: zapReceiver.address,
      },
      { depth: 4 }
    )

    // Check zapReceiver balance before
    const beforeBalance = await lpToken.balanceOf(zapReceiver.address)
    console.dir({ beforeBalance: formatBNValueToString(beforeBalance) })

    // Your code here
    await inputTokens[0].connect(tokensOwner).approve(soulZap.address, inputAmount)
    // FIXME: log
    console.log(`Sending Zap Transaction`)
    await tokensOwner.sendTransaction({ to: soulZap.address, data: zapData.encodedTx })

    // Check zapReceiver balance after
    const afterBalance = await lpToken.balanceOf(zapReceiver.address)
    console.dir({ afterBalance: formatBNValueToString(afterBalance) })
    // Assert that afterBalance is greater than beforeBalance
    expect(afterBalance).to.be.gt(beforeBalance)
    // FIXME: log
    console.dir('Zap Successful')
  })
})

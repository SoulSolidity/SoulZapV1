import { ethers } from 'hardhat'
// https://hardhat.org/hardhat-network-helpers/docs/reference
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import '@nomicfoundation/hardhat-chai-matchers'

import { deployDexAndHopTokens } from './fixtures/deployDexAndHopTokens'
import { deployZap_UniV2_Extended_V1 } from './fixtures/deployZap_Mock'
import {
  ADDRESS_NATIVE,
  createERC20BalanceSnapshotter,
  createNativeBalanceSnapshotter,
  formatBNValueToString,
  getContractGetterSnapshot,
} from './utils'
import { ether } from './fixtures/UniV2/deployUniV2Dex'
import { fixture } from './SoulZap_UniV2.spec'

describe('SoulZap_UniV2 - Swap Native Output', function () {
  it('Should be able to load fixture', async () => {
    const loadedFixture = await loadFixture(fixture)

    expect(loadedFixture).to.not.be.undefined
  })

  /// -----------------------------------------------------------------------
  /// Zap Functions
  /// -----------------------------------------------------------------------

  /// -----------------------------------------------------------------------
  /// Swap Functions
  /// -----------------------------------------------------------------------

  describe('Swap Functions', function () {
    it('Should be able to swap native input tokens', async () => {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        snapshotters: { takeNativeBalanceSnapshot },
        accounts: [owner, feeTo, tokensOwner, zapReceiver],
      } = await loadFixture(fixture)

      const inputAmount = ether('.001')
      const slippage = 100 // 1%
      const inputToken = inputTokens[0]
      const outputToken = ADDRESS_NATIVE

      await takeNativeBalanceSnapshot()

      // TODO: hardcoded
      const swapData = await soulZap_Lens.getSwapData(
        inputToken.address,
        inputAmount,
        outputToken,
        slippage,
        zapReceiver.address
      )

      // FIXME: log
      console.dir(
        {
          swapData: formatBNValueToString(swapData),
          inputToken: inputToken.address,
          inputAmount: formatBNValueToString(inputAmount),
          outputToken: outputToken,
          slippage: formatBNValueToString(slippage),
          zapReceiver: zapReceiver.address,
        },
        { depth: 4 }
      )

      await inputToken.connect(tokensOwner).approve(soulZap.address, inputAmount)
      await tokensOwner.sendTransaction({
        to: soulZap.address,
        data: swapData.encodedTx,
        value: 0,
        // value: inputToken == ADDRESS_NATIVE ? inputAmount : 0,
      })

      const lastNativeSnapshot = await takeNativeBalanceSnapshot()

      expect(lastNativeSnapshot[zapReceiver.address].balanceDiff).to.be.gt(0)
    })
  })
})

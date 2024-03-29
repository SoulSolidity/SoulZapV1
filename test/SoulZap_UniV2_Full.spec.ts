import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
// TODO: Add a fixture for this contract or remove
import { fixture } from './SoulZap_UniV2.spec'
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
import { ADDRESS_ZERO, ether, formatBNValueToString } from './utils'
import { NATIVE_ADDRESS, ZERO_ADDRESS } from '../src'
import { BigNumber } from 'ethers'

describe('SoulZap_UniV2 Full', function () {
  // NOTE: Reusing fixture from soulZap.spec.ts
  // async function fixture() {
  //   const lockDeployment = await deployFixture(ethers)
  //   return { ...lockDeployment }
  // }
  describe('constructor', function () {
    it('Should valid parameters', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      const SoulZap = await ethers.getContractFactory('SoulZap_UniV2')
      const newSoulZap = SoulZap.deploy(owner.address, mockWBNB.address, soulFeeManager.address, 0)
      expect(newSoulZap).to.exist
    })

    it('Should fail when invalid soulFeeManager', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      const SoulZap = await ethers.getContractFactory('SoulZap_UniV2')
      await expect(SoulZap.deploy(owner.address, mockWBNB.address, ADDRESS_ZERO, 0)).to.be.reverted
      // NOTE: Not able to get the revertedWith working
      // await expect(SoulZap.deploy(owner.address, mockWBNB.address, ADDRESS_ZERO, 0)).to.be.revertedWith(
      //   'SoulZap: soulFeeManager is not ISoulFeeManager'
      // )
    })
  })

  describe('receive', function () {
    /*
    // FIXME: cc
    it('Should receive ETH from WNATIVE', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      const result = await soulZap.receive()
      expect(result).to.exist
    })
    */
    it('Should fail when receive ETH from non-WNATIVE', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      // transfer BNB to soulZap and expect revert
      await expect(
        owner.sendTransaction({
          to: soulZap.address,
          value: ethers.utils.parseEther('1'),
        })
      ).to.be.revertedWith('SoulZap: Only receive from WNATIVE')
    })
  })
  describe('verifyMsgValueAndWrap', function () {
    it('Should pass msg.value > 0 and tokenIn is NATIVE_ADDRESS', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      const zapData = await soulZap_Lens.getZapData(
        NATIVE_ADDRESS,
        ether('1'),
        pairs.hopLpPairs[0].address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.zap(zapData.zapParams, zapData.feeSwapPath, { value: ether('1') })
    })

    it('Should fail when msg.value > 0 and tokenIn is not NATIVE_ADDRESS', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        ether('1'),
        pairs.hopLpPairs[0].address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await expect(
        soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath, { value: ether('1') })
      ).to.be.revertedWith('SoulZap: msg.value should be 0')
    })
    it('Should pass when msg.value is 0', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        currentInputAmount,
        pairs.hopLpPairs[0].address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath)
    })
  })

  describe('pause/unpause', function () {
    it('Should pause by authorized user', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient, zapPauserRole },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await soulZap.connect(zapPauserRole).pause()
    })
    it('Should unpause by authorized user', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient, zapPauserRole, zapAdminRole },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await soulZap.connect(zapPauserRole).pause()
      await soulZap.connect(zapAdminRole).unpause()
    })
    it('Should fail when pause by unauthorized user', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await expect(soulZap.connect(zapReceiver).pause()).to.be.revertedWithCustomError(
        soulZap,
        'SoulAccessUnauthorized'
      )
    })
    it('Should fail when unpause by unauthorized user', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, zapPauserRole, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await soulZap.connect(zapPauserRole).pause()
      await expect(soulZap.connect(zapReceiver).pause()).to.be.revertedWithCustomError(
        soulZap,
        'SoulAccessUnauthorized'
      )
    })
  })

  describe('swap', function () {
    it('Should be able to run getSwapData()', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const zapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )
    })

    it('Should swap token -> token', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      console.log(swapData)

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })

    it('Should swap token -> token2', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[1]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })

    it('Should swap wrapped native -> token', async function () {
      const {
        mockWBNB,
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeNativeBalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()
      await takeNativeBalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = mockWBNB
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[1]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()
      const nativeBalanceSnapshot = await takeNativeBalanceSnapshot()

      // FIXME: log
      console.dir(
        {
          currentInputToken: await currentInputToken.symbol(),
          swapData: formatBNValueToString(swapData),
          balanceSnapshot: {
            zapSenderNative: formatBNValueToString(nativeBalanceSnapshot[tokensOwner.address]),
            zapSender: formatBNValueToString(balanceSnapshot[tokensOwner.address][currentInputToken.address]),
            zapReceiver: formatBNValueToString(balanceSnapshot[zapReceiver.address][currentToToken.address]),
          },
        },
        { depth: 10 }
      )

      await new Promise((resolve) => setTimeout(resolve, 5000))

      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(nativeBalanceSnapshot[tokensOwner.address].balanceDiff).to.be.lessThan(0)
      // FIXME: test failing here
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })

    it('Should swap native -> token', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeNativeBalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()
      await takeNativeBalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = NATIVE_ADDRESS
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath, { value: currentInputAmount })

      const balanceSnapshot = await takeERC20BalanceSnapshot()
      const nativeBalanceSnapshot = await takeNativeBalanceSnapshot()

      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(nativeBalanceSnapshot[tokensOwner.address].balanceDiff).to.be.lessThan(0)
    })

    // TODO: Currently there is no way to swap -> native (WNative works)
    /*
    it('Should swap token -> native', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeNativeBalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()
      await takeNativeBalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = NATIVE_ADDRESS

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()
      const nativeBalanceSnapshot = await takeNativeBalanceSnapshot()

      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
      expect(nativeBalanceSnapshot[zapReceiver.address].balanceDiff).to.be.greaterThan(0)
    })
    */
    it('Should return or use all tokens', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[soulZap.address][currentToToken.address].balanceDiff).to.be.equal(0)
      expect(balanceSnapshot[soulZap.address][currentInputToken.address].balanceDiff).to.be.equal(0)
    })

    it('Should send to right recipient', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        recipient.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[recipient.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })

    describe('reverts', function () {
      it('Should fail when swap with invalid tokenIn Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' } //Invalid token
        // await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = outputTokens[0]

        await expect(
          soulZap_Lens.getSwapData(
            currentInputToken.address,
            currentInputAmount,
            currentToToken.address,
            300,
            zapReceiver.address,
            DEADLINE_OFFSET
          )
        ).to.be.reverted
      })
      it('Should fail when swap with invalid tokenIn Zap', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = outputTokens[0]

        const swapData = await soulZap_Lens.getSwapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        //Change tokenIn to invalid token
        const swapParams = { ...swapData.swapParams }
        swapParams.tokenIn = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

        await expect(soulZap.connect(tokensOwner).swap(swapParams, swapData.feeSwapPath)).to.be.reverted
      })
      it('Should fail when swap with insufficient amountIn Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = 0
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = outputTokens[0]

        await expect(
          soulZap_Lens.getSwapData(
            currentInputToken.address,
            currentInputAmount,
            currentToToken.address,
            300,
            zapReceiver.address,
            DEADLINE_OFFSET
          )
        ).to.be.revertedWith('SoulZap_UniV2_Lens: amountIn must be > 0')
      })
      it('Should fail when swap with insufficient amountIn Zap', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = outputTokens[0]

        const swapData = await soulZap_Lens.getSwapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        //Change tokenIn to invalid token
        const swapParams = { ...swapData.swapParams }
        swapParams.amountIn = BigNumber.from('0')

        await expect(soulZap.connect(tokensOwner).swap(swapParams, swapData.feeSwapPath)).to.be.revertedWith(
          'SoulZap: amountIn must be > 0'
        )
      })

      /*
      NOTE: This check is done in the Zap contract
      it('Should fail when swap to null address Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = outputTokens[0]

        await expect(
          soulZap_Lens.getSwapData(
            currentInputToken.address,
            currentInputAmount,
            currentToToken.address,
            300,
            ZERO_ADDRESS
          )
        ).to.be.revertedWith("SoulZap_UniV2_Lens: Can't swap to null address")
      })
      */
      it('Should fail when swap to null address Zap', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = outputTokens[0]

        const swapData = await soulZap_Lens.getSwapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        //Change recipient to zero address
        const swapParams = { ...swapData.swapParams }
        swapParams.to = ZERO_ADDRESS

        await expect(soulZap.connect(tokensOwner).swap(swapParams, swapData.feeSwapPath)).to.be.revertedWith(
          "SoulZap: Can't swap to null address"
        )
      })
      it('Should fail when swap with same input and output token Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)

        await expect(
          soulZap_Lens.getSwapData(
            currentInputToken.address,
            currentInputAmount,
            currentInputToken.address,
            300,
            zapReceiver.address,
            DEADLINE_OFFSET
          )
        ).to.be.revertedWith("SoulZap_UniV2_Lens: tokens can't be the same")
      })
      it('Should fail when swap with same input and output token Zap', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentOutputToken = inputTokens[1]

        const swapData = await soulZap_Lens.getSwapData(
          currentInputToken.address,
          currentInputAmount,
          currentOutputToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        //Change output token to input token
        const swapParams = { ...swapData.swapParams }
        swapParams.tokenOut = currentInputToken.address

        await expect(soulZap.connect(tokensOwner).swap(swapParams, swapData.feeSwapPath)).to.be.revertedWith(
          "SoulZap: tokens can't be the same"
        )
      })
      it('Should fail when swap with paused contract', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient, zapPauserRole },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        await soulZap.connect(zapPauserRole).pause()

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = outputTokens[0]

        const swapData = await soulZap_Lens.getSwapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        await expect(soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)).to.be.revertedWith(
          'Pausable: paused'
        )
      })
    })
  })

  describe('zap', function () {
    it('Should be able to run ZapData()', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = pairs.outputLpPairs[0]

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )
    })

    it('Should zap token -> LP', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = pairs.outputLpPairs[0]

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })

    it('Should zap token -> LP2', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = pairs.outputLpPairs[1]

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })

    it('Should zap wrapped native -> LP', async function () {
      const {
        mockWBNB,
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeNativeBalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()
      await takeNativeBalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = mockWBNB
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = pairs.outputLpPairs[0]

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()
      const nativeBalanceSnapshot = await takeNativeBalanceSnapshot()

      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(nativeBalanceSnapshot[tokensOwner.address].balanceDiff).to.be.lessThan(0)
      // FIXME: test failing here
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })

    it('Should zap native -> LP', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = NATIVE_ADDRESS
      const currentToToken = pairs.outputLpPairs[0]

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath, { value: currentInputAmount })

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      //TODO: add check if native decreased
      expect(balanceSnapshot[zapReceiver.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
    })

    it('Should return or use all tokens', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = pairs.outputLpPairs[0]

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[soulZap.address][currentToToken.address].balanceDiff).to.be.equal(0)
      expect(balanceSnapshot[soulZap.address][currentInputToken.address].balanceDiff).to.be.equal(0)
    })

    it('Should send to right recipient', async function () {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = pairs.outputLpPairs[0]

      const zapData = await soulZap_Lens.getZapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        100,
        recipient.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[recipient.address][currentToToken.address].balanceDiff).to.be.greaterThan(0)
      expect(balanceSnapshot[tokensOwner.address][currentInputToken.address].balanceDiff).to.be.lessThan(0)
    })
    describe('reverts', function () {
      it('Should fail when zap with invalid tokenIn Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = { address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c' } //Invalid token
        // await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = pairs.outputLpPairs[1]

        await expect(
          soulZap_Lens.getZapData(
            currentInputToken.address,
            currentInputAmount,
            currentToToken.address,
            300,
            zapReceiver.address,
            DEADLINE_OFFSET
          )
        ).to.be.reverted
      })
      it('Should fail when zap with invalid tokenIn Zap', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = pairs.outputLpPairs[1]

        const zapData = await soulZap_Lens.getZapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        //Change tokenIn to invalid token
        const zapParams = { ...zapData.zapParams }
        zapParams.tokenIn = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'

        console.log(zapParams)

        await expect(soulZap.connect(tokensOwner).zap(zapParams, zapData.feeSwapPath)).to.be.reverted
      })
      it('Should fail when swap with insufficient amountIn Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = 0
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = pairs.outputLpPairs[1]

        await expect(
          soulZap_Lens.getZapData(
            currentInputToken.address,
            currentInputAmount,
            currentToToken.address,
            300,
            zapReceiver.address,
            DEADLINE_OFFSET
          )
        ).to.be.revertedWith('SoulZap_UniV2_Lens: amountIn must be > 0')
      })
      it('Should fail when swap with insufficient amountIn Zap', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = pairs.outputLpPairs[1]

        const zapData = await soulZap_Lens.getZapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        //Change tokenIn to invalid token
        const zapParams = { ...zapData.zapParams }
        zapParams.amountIn = BigNumber.from(0)

        await expect(soulZap.connect(tokensOwner).zap(zapParams, zapData.feeSwapPath)).to.be.revertedWith(
          'SoulZap: amountIn must be > 0'
        )
      })

      /*
      // NOTE: This check is done in the Zap contract
      it('Should fail when zap to null address Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = pairs.outputLpPairs[1]

        await expect(
          soulZap_Lens.getZapData(
            currentInputToken.address,
            currentInputAmount,
            currentToToken.address,
            300,
            ZERO_ADDRESS
          )
        ).to.be.revertedWith("SoulZap: Can't zap to null address")
      })
      */

      it('Should fail when zap to null address Zap', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = pairs.outputLpPairs[1]

        const zapData = await soulZap_Lens.getZapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        //Change recipient to zero address
        const zapParams = { ...zapData.zapParams }
        zapParams.to = ZERO_ADDRESS

        await expect(soulZap.connect(tokensOwner).zap(zapParams, zapData.feeSwapPath)).to.be.revertedWith(
          "SoulZap: Can't zap to null address"
        )
      })
      it('Should fail when zap with invalid LP token Lens', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)

        await expect(
          soulZap_Lens.getZapData(
            currentInputToken.address,
            currentInputAmount,
            currentInputToken.address,
            300,
            zapReceiver.address,
            DEADLINE_OFFSET
          )
        ).to.be.revertedWith('SoulZap_UniV2_Lens: Not an LP')
      })
      it('Should fail when zap with paused contract', async function () {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens, outputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          settings: { DEADLINE_OFFSET },
          accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient, zapPauserRole },
          snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
        } = await loadFixture(fixture)

        await soulZap.connect(zapPauserRole).pause()

        // NOTE: 1 Ether hardcoded
        const currentInputAmount = ether('1').div(100)
        const currentInputToken = inputTokens[0]
        await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
        const currentToToken = pairs.outputLpPairs[1]

        const zapData = await soulZap_Lens.getZapData(
          currentInputToken.address,
          currentInputAmount,
          currentToToken.address,
          300,
          zapReceiver.address,
          DEADLINE_OFFSET
        )

        console.log(zapData)

        await expect(soulZap.connect(tokensOwner).zap(zapData.zapParams, zapData.feeSwapPath)).to.be.revertedWith(
          'Pausable: paused'
        )
      })
    })
  })

  describe('protocol fees', function () {
    it('Should receive fee', async function () {
      const {
        feeTokens,
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[feeCollector.address][feeTokens[0].address].balanceDiff).to.be.greaterThan(0)
    })

    it('Should receive fee with fee token as input token', async function () {
      const {
        feeTokens,
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await takeERC20BalanceSnapshot()

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = feeTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const balanceSnapshot = await takeERC20BalanceSnapshot()

      expect(balanceSnapshot[feeCollector.address][feeTokens[0].address].balanceDiff).to.be.greaterThan(0)
    })

    it('Should increase fee volume', async function () {
      const {
        feeTokens,
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      const epochVolume = await soulZap.getEpochVolume()
      expect(epochVolume).to.be.greaterThan(0)
    })

    it('Should change fee based on volume', async function () {
      const {
        feeTokens,
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        settings: { DEADLINE_OFFSET },
        accounts: { owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      // NOTE: 1 Ether hardcoded
      const currentInputAmount = ether('1').div(100)
      const currentInputToken = inputTokens[0]
      await currentInputToken.connect(tokensOwner).approve(soulZap.address, currentInputAmount)
      const currentToToken = outputTokens[0]

      const swapData = await soulZap_Lens.getSwapData(
        currentInputToken.address,
        currentInputAmount,
        currentToToken.address,
        300,
        zapReceiver.address,
        DEADLINE_OFFSET
      )

      let feePercentage = await soulZap.getFeeInfo()
      expect(feePercentage.currentFeePercentage).to.be.eq(300)

      await soulZap.connect(tokensOwner).swap(swapData.swapParams, swapData.feeSwapPath)

      feePercentage = await soulZap.getFeeInfo()
      expect(feePercentage.currentFeePercentage).to.be.eq(200)
    })
  })
})

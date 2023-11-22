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
export async function fixture() {
  // Contracts are deployed using the first signer/account by default
  const accounts = await ethers.getSigners()
  const activeAccounts = accounts.slice(0, 9)
  const [owner, feeTo, tokensOwner, zapReceiver, feeCollector, recipient, zapAdminRole, zapPauserRole, feeManagerRole] =
    activeAccounts

  const dexAndHopTokens_deployment = await deployDexAndHopTokens(ethers, [owner, feeTo, tokensOwner])
  const {
    uniV2Dex: { mockWBNB, dexRouter, dexFactory },
    baseTokens: { hopTokens, inputTokens, outputTokens },
    pairs: { hopLpPairs, inputLpPairs, outputLpPairs },
  } = dexAndHopTokens_deployment

  /**
   * Setup Tokens
   */
  const allTokens = [
    mockWBNB,
    ...hopTokens,
    ...inputTokens,
    ...outputTokens,
    ...hopLpPairs,
    ...inputLpPairs,
    ...outputLpPairs,
  ]

  /**
   * Setup Zap Contracts
   */
  // TODO: Use stable
  const feeTokens = [hopTokens[2]]
  const ZapUniV2_Extended_V1_deployment = await deployZap_UniV2_Extended_V1(
    ethers,
    owner.address,
    mockWBNB.address,
    dexRouter.address,
    hopTokens.map((token) => token.address),
    feeCollector.address,
    feeTokens.map((token) => token.address)
  )
  const { soulZap, soulAccessRegistry, soulAccessRoles, soulZap_Lens, soulFeeManager } = ZapUniV2_Extended_V1_deployment

  await soulAccessRegistry.connect(owner).setRoleAdminByName('SOUL_ZAP_ADMIN_ROLE', 'ADMIN_ROLE')
  await soulAccessRegistry.connect(owner).grantRole(soulAccessRoles.SOUL_ZAP_ADMIN_ROLE, zapAdminRole.address)
  await soulAccessRegistry.connect(owner).setRoleAdminByName('SOUL_ZAP_PAUSER_ROLE', 'SOUL_ZAP_ADMIN_ROLE')
  await soulAccessRegistry.connect(zapAdminRole).grantRole(soulAccessRoles.SOUL_ZAP_PAUSER_ROLE, zapPauserRole.address)

  await soulAccessRegistry.connect(owner).setRoleAdminByName('FEE_MANAGER_ROLE', 'ADMIN_ROLE')
  await soulAccessRegistry.connect(owner).grantRoleName('FEE_MANAGER_ROLE', feeManagerRole.address)
  /**
   * Setup Snapshotters
   */
  const accountsToSnapshot = [
    ...activeAccounts.map((x) => {
      return x.address
    }),
    soulZap.address,
  ]

  const takeNativeBalanceSnapshot = createNativeBalanceSnapshotter(ethers, accountsToSnapshot)
  const takeERC20BalanceSnapshot = createERC20BalanceSnapshotter(
    ethers,
    accountsToSnapshot,
    allTokens.map((token) => token.address)
  )
  await takeERC20BalanceSnapshot()

  const takeFeeSnapshot = async () => await getContractGetterSnapshot(soulZap, ['getFeeInfo'])

  return {
    feeTokens,
    mockWBNB,
    dexAndHopTokens_deployment,
    ZapUniV2_Extended_V1_deployment,
    accounts: {
      owner,
      feeTo,
      tokensOwner,
      zapReceiver,
      feeCollector,
      recipient,
      zapAdminRole,
      zapPauserRole,
      feeManagerRole,
    },
    snapshotters: {
      takeNativeBalanceSnapshot,
      takeERC20BalanceSnapshot,
      takeFeeSnapshot,
    },
  }
}

describe('SoulZap_UniV2.sol Tests', function () {
  it('Should be able to load fixture', async () => {
    const loadedFixture = await loadFixture(fixture)

    expect(loadedFixture).to.not.be.undefined
  })

  /// -----------------------------------------------------------------------
  /// Zap Functions
  /// -----------------------------------------------------------------------

  describe('Zap Functions', function () {
    it('Should get zapData', async () => {
      const {
        dexAndHopTokens_deployment: {
          baseTokens: { inputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
        accounts: { zapReceiver },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      const inputAmount = ether('.001')
      const slippage = 100 // 1%
      const inputToken = ADDRESS_NATIVE
      const lpToken = pairs.hopLpPairs[5]

      const zapData = await soulZap_Lens.getZapData(
        inputToken,
        inputAmount,
        lpToken.address,
        slippage,
        zapReceiver.address
      )

      const lastSnapshot = await takeERC20BalanceSnapshot()

      expect(zapData).to.not.be.undefined

      const feeInfo = formatBNValueToString(await takeFeeSnapshot())

      it('Should be able to zap all input tokens', async () => {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          accounts: { tokensOwner, zapReceiver },
        } = await loadFixture(fixture)

        const inputAmount = ether('.001')
        const slippage = 100 // 1%
        const inputToken = inputTokens[0]
        const lpToken = pairs.hopLpPairs[5]

        const zapData = await soulZap_Lens.getZapData(
          inputToken.address,
          inputAmount,
          lpToken.address,
          slippage,
          zapReceiver.address
        )

        // Check zapReceiver balance before
        const beforeBalance = await lpToken.balanceOf(zapReceiver.address)
        console.dir({ beforeBalance: formatBNValueToString(beforeBalance) })

        // Your code here
        await inputTokens[0].connect(tokensOwner).approve(soulZap.address, inputAmount)

        await tokensOwner.sendTransaction({
          to: soulZap.address,
          data: zapData.encodedTx,
          value: inputToken.address == ADDRESS_NATIVE ? inputAmount : 0,
        })

        // Check zapReceiver balance after
        const afterBalance = await lpToken.balanceOf(zapReceiver.address)
        console.dir({ afterBalance: formatBNValueToString(afterBalance) })
        // Assert that afterBalance is greater than beforeBalance
        expect(afterBalance).to.be.gt(beforeBalance)
      })

      it('Should be able to zap native input tokens', async () => {
        const {
          dexAndHopTokens_deployment: {
            baseTokens: { inputTokens },
            pairs,
          },
          ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens },
          accounts: { owner, feeTo, tokensOwner, zapReceiver },
        } = await loadFixture(fixture)

        const inputAmount = ether('.001')
        const slippage = 100 // 1%
        const inputToken = ADDRESS_NATIVE
        const lpToken = pairs.hopLpPairs[5]

        const zapData = await soulZap_Lens.getZapData(
          inputToken,
          inputAmount,
          lpToken.address,
          slippage,
          zapReceiver.address
        )

        // Check zapReceiver balance before
        const beforeBalance = await lpToken.balanceOf(zapReceiver.address)
        console.dir({ beforeBalance: formatBNValueToString(beforeBalance) })

        // Your code here
        await inputTokens[0].connect(tokensOwner).approve(soulZap.address, inputAmount)

        await tokensOwner.sendTransaction({
          to: soulZap.address,
          data: zapData.encodedTx,
          value: inputToken == ADDRESS_NATIVE ? inputAmount : 0,
        })

        // Check zapReceiver balance after
        const afterBalance = await lpToken.balanceOf(zapReceiver.address)
        console.dir({ afterBalance: formatBNValueToString(afterBalance) })
        // Assert that afterBalance is greater than beforeBalance
        expect(afterBalance).to.be.gt(beforeBalance)
      })
    })

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
          accounts: { owner, feeTo, tokensOwner, zapReceiver },
        } = await loadFixture(fixture)

        const inputAmount = ether('.001')
        const slippage = 100 // 1%
        const inputToken = ADDRESS_NATIVE
        const outputToken = inputTokens[0]

        const swapData = await soulZap_Lens.getSwapData(
          inputToken,
          inputAmount,
          outputToken.address,
          slippage,
          zapReceiver.address
        )

        // Check zapReceiver balance before
        const beforeBalance = await outputToken.balanceOf(zapReceiver.address)
        console.dir({ beforeBalance: formatBNValueToString(beforeBalance) })

        await tokensOwner.sendTransaction({
          to: soulZap.address,
          data: swapData.encodedTx,
          value: inputToken == ADDRESS_NATIVE ? inputAmount : 0,
        })

        // Check zapReceiver balance after
        const afterBalance = await outputToken.balanceOf(zapReceiver.address)
        console.dir({ afterBalance: formatBNValueToString(afterBalance) })
        // Assert that afterBalance is greater than beforeBalance
        expect(afterBalance).to.be.gt(beforeBalance)
      })
    })
  })
})

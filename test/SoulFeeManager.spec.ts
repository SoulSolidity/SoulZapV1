import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
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
import { ADDRESS_ZERO, ether } from './utils'
import { NATIVE_ADDRESS, ZERO_ADDRESS } from '../src'

describe('SoulFeeManager', function () {
  // NOTE: Reusing fixture from soulZap.spec.ts
  // async function fixture() {
  //   const lockDeployment = await deployFixture(ethers)
  //   return { ...lockDeployment }
  // }
  it('Should valid parameters', async function () {
    const {
      dexAndHopTokens_deployment: {
        uniV2Dex: { mockWBNB },
        baseTokens: { inputTokens, outputTokens },
        pairs,
      },
      ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
      accounts: { owner },
      snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
    } = await loadFixture(fixture)

    const SoulZap = await ethers.getContractFactory('SoulZap_UniV2')
    const newSoulZap = SoulZap.deploy(owner.address, mockWBNB.address, soulFeeManager.address, 0)
    expect(newSoulZap).to.exist
  })

  it('Should change fee collector', async function () {
    const {
      dexAndHopTokens_deployment: {
        uniV2Dex: { mockWBNB },
        baseTokens: { inputTokens, outputTokens },
        pairs,
      },
      ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
      accounts: { owner, recipient: notOwner, feeManagerRole },
      snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
    } = await loadFixture(fixture)

    await soulFeeManager.connect(feeManagerRole).setFeeCollector(notOwner.address)
    expect(await soulFeeManager.getFeeCollector()).to.equal(notOwner.address)
  })

  it('Should change fee and volume threshold', async function () {
    const {
      dexAndHopTokens_deployment: {
        uniV2Dex: { mockWBNB },
        baseTokens: { inputTokens, outputTokens },
        pairs,
      },
      ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
      accounts: { recipient, zapAdminRole, zapPauserRole, feeManagerRole },
      snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
    } = await loadFixture(fixture)

    const newVolumes = [100, 200, 300]
    const newFees = [1, 2, 3]
    await soulFeeManager.connect(feeManagerRole).setVolumeFeeThresholds(newVolumes, newFees)

    for (let i = 0; i < newVolumes.length; i++) {
      const threshold = await soulFeeManager.volumeFeeThresholds(i)
      expect(threshold.volume).to.equal(newVolumes[i])
      expect(threshold.fee).to.equal(newFees[i])
    }
  })

  it('Should add valid fee token', async function () {
    const {
      dexAndHopTokens_deployment: {
        uniV2Dex: { mockWBNB },
        baseTokens: { inputTokens, outputTokens, hopTokens },
        pairs,
      },
      ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
      accounts: { owner, feeTo, tokensOwner, zapReceiver: notOwner, feeManagerRole },
      snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
    } = await loadFixture(fixture)

    await soulFeeManager.connect(feeManagerRole).addValidFeeTokens([hopTokens[0].address])

    expect(await soulFeeManager.isFeeToken(hopTokens[0].address)).to.be.true
  })

  it('Should remove valid fee token', async function () {
    const {
      dexAndHopTokens_deployment: {
        uniV2Dex: { mockWBNB },
        baseTokens: { inputTokens, outputTokens, hopTokens },
        pairs,
      },
      ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
      accounts: { owner, zapReceiver: notOwner, feeManagerRole },
      snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
    } = await loadFixture(fixture)

    await soulFeeManager.connect(feeManagerRole).addValidFeeTokens([hopTokens[0].address])

    expect(await soulFeeManager.isFeeToken(hopTokens[0].address)).to.be.true

    await soulFeeManager.connect(feeManagerRole).removeValidFeeTokens([hopTokens[0].address])

    expect(await soulFeeManager.isFeeToken(hopTokens[0].address)).to.be.false
  })

  describe('reverts', () => {
    it('Should fail when adding existing fee token', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens, hopTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
        accounts: { zapAdminRole, feeManagerRole },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await expect(
        soulFeeManager.connect(feeManagerRole).addValidFeeTokens([hopTokens[2].address])
      ).to.be.revertedWithCustomError(soulFeeManager, 'SoulFeeManager_NoFeeTokensAdded')
    })

    it('Should fail when removing non-existing fee token', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens, hopTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
        accounts: { feeManagerRole },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await soulFeeManager.connect(feeManagerRole).removeValidFeeTokens([hopTokens[0].address])
    })

    it('Should fail when adding invalid fee volumes', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
        accounts: { owner, feeManagerRole },

        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      let invalidVolumes = [0, 100, 5000]
      let invalidFees = [1, 2]

      await expect(
        soulFeeManager.connect(feeManagerRole).setVolumeFeeThresholds(invalidVolumes, invalidFees)
      ).to.be.revertedWith('Volumes and fees should have same length')

      invalidVolumes = [0, 6000, 5000]
      invalidFees = [1, 2, 4]

      await expect(
        soulFeeManager.connect(feeManagerRole).setVolumeFeeThresholds(invalidVolumes, invalidFees)
      ).to.be.revertedWith('Volume not in ascending order')

      invalidVolumes = [0, 100, 5000]
      invalidFees = [1, 2, 10001]

      await expect(
        soulFeeManager.connect(feeManagerRole).setVolumeFeeThresholds(invalidVolumes, invalidFees)
      ).to.be.revertedWith('Fee exceeds max fee')
    })

    it('Should fail when changing fee collector by non-restricted address', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
        accounts: { recipient: notOwner },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      await expect(soulFeeManager.connect(notOwner).setFeeCollector(notOwner.address)).to.be.revertedWithCustomError(
        soulFeeManager,
        'SoulAccessUnauthorized'
      )
    })

    it('Should fail when changing fee thresholds by non-restricted address', async function () {
      const {
        dexAndHopTokens_deployment: {
          uniV2Dex: { mockWBNB },
          baseTokens: { inputTokens, outputTokens },
          pairs,
        },
        ZapUniV2_Extended_V1_deployment: { soulZap, soulZap_Lens, soulFeeManager },
        accounts: { zapReceiver: notOwner },
        snapshotters: { takeERC20BalanceSnapshot, takeFeeSnapshot },
      } = await loadFixture(fixture)

      const newVolumes = [100, 200, 300]
      const newFees = [1, 2, 3]

      await expect(
        soulFeeManager.connect(notOwner).setVolumeFeeThresholds(newVolumes, newFees)
      ).to.be.revertedWithCustomError(soulFeeManager, 'SoulAccessUnauthorized')
    })
  })
})

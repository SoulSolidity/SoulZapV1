import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers } from 'hardhat'
import {
  ADDRESS_NATIVE,
  ADDRESS_ZERO,
  createERC20BalanceSnapshotter,
  createNativeBalanceSnapshotter,
  ether,
} from './utils'
import { WNativeMock } from '../typechain-types'
import { deploySoulFeeDistributor } from './fixtures/deployFeeDistributor'
import { deploySoulAccessRegistry } from './fixtures/deployRegistry'
import { getUniswapV2ContractFactories } from './fixtures/UniV2/deployUniV2Dex'
import { anyUint, anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import exp from 'constants'

export async function fixture() {
  // Contracts are deployed using the first signer/account by default
  const accounts = await ethers.getSigners()
  const activeAccounts = accounts.slice(0, 9)
  const beneficiaries = accounts.slice(17, 20)
  const [adminRole, feeTo, tokensOwner, zapReceiver, feeCollector, recipient, feeManagerRole, distributorRole] =
    activeAccounts

  // deploy soul access registry
  const { soulAccessRegistry, soulAccessRegistrySnapshot } = await deploySoulAccessRegistry(ethers, [
    adminRole,
    undefined,
  ])

  // Setup Registry Roles
  await soulAccessRegistry.connect(adminRole).setRoleAdminByName('SOUL_DISTRIBUTOR_ROLE', 'ADMIN_ROLE')
  await soulAccessRegistry.connect(adminRole).grantRoleName('SOUL_DISTRIBUTOR_ROLE', distributorRole.address)

  await soulAccessRegistry.connect(adminRole).setRoleAdminByName('FEE_MANAGER_ROLE', 'ADMIN_ROLE')
  await soulAccessRegistry.connect(adminRole).grantRoleName('FEE_MANAGER_ROLE', feeManagerRole.address)

  // const feeManagerHasRole = await soulAccessRegistry.hasRoleName('FEE_MANAGER_ROLE', feeManagerRole.address)
  // console.dir({ feeManagerHasRole, feeManagerRole: feeManagerRole.address })

  // Deploy mock tokens
  const { WNative } = await getUniswapV2ContractFactories(ethers)
  const mockWBNB = (await WNative.connect(adminRole).deploy()) as WNativeMock
  const distributionToken = await (
    await ethers.getContractFactory('ERC20Mock')
  ).deploy('Distribution Token', 'DST', 18, ether(1_000_000_000))

  // Setup Soul Fee Distributor
  const allocations = [3000, 4000, 3000]
  const { soulFeeDistributor, soulFeeDistributorSnapshot } = await deploySoulFeeDistributor(
    ethers,
    [adminRole, undefined],
    [soulAccessRegistry.address, beneficiaries.map((b) => b.address), allocations, mockWBNB.address]
  )

  /**
   * Setup Snapshotters
   */
  const accountsToSnapshot = [
    ...[...activeAccounts, ...beneficiaries].map((x) => {
      return x.address
    }),
    soulFeeDistributor.address,
  ]
  const takeNativeBalanceSnapshot = createNativeBalanceSnapshotter(ethers, accountsToSnapshot)
  await takeNativeBalanceSnapshot()
  const takeERC20BalanceSnapshot = createERC20BalanceSnapshotter(ethers, accountsToSnapshot, [
    distributionToken.address,
  ])
  await takeERC20BalanceSnapshot()

  return {
    contracts: {
      soulAccessRegistry,
      soulFeeDistributor,
      distributionToken,
      mockWBNB,
    },
    accounts: {
      adminRole,
      feeTo,
      tokensOwner,
      zapReceiver,
      feeCollector,
      recipient,
      feeManagerRole,
      distributorRole,
      beneficiaries,
    },
    snapshotters: {
      takeNativeBalanceSnapshot,
      takeERC20BalanceSnapshot,
      soulAccessRegistrySnapshot,
      soulFeeDistributorSnapshot,
    },
  }
}

describe('SoulFeeDistributor', function () {
  describe('setBeneficiaryAllocation', function () {
    it('Should set allocation for beneficiary', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)

      const beneficiaryAddress = beneficiaries[0].address
      const allocationPoints = 1000

      // Set allocation for the beneficiary
      const tx = await soulFeeDistributor
        .connect(feeManagerRole)
        .setBeneficiaryAllocation(beneficiaryAddress, allocationPoints)
      await tx.wait()

      // Check if the event was emitted
      await expect(tx)
        .to.emit(soulFeeDistributor, 'BeneficiaryUpdated')
        .withArgs(beneficiaryAddress, allocationPoints, anyUint)

      // Retrieve the beneficiary details and check if they match the expected values
      const [beneficiary, points, percentage] = await soulFeeDistributor.getBeneficiaryAtIndex(0)
      expect(beneficiary).to.equal(beneficiaryAddress)
      expect(points).to.equal(allocationPoints)
      // The percentage is calculated as allocationPoints / totalAllocationPoints, which should be checked accordingly
    })

    it('Should revert when should revert if called by non-admin', async function () {
      it('Should set allocation for beneficiary', async function () {
        const {
          contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
          accounts: {
            adminRole,
            feeTo,
            tokensOwner,
            zapReceiver,
            feeCollector,
            recipient,
            feeManagerRole,
            distributorRole,
            beneficiaries,
          },
          snapshotters: {
            takeNativeBalanceSnapshot,
            takeERC20BalanceSnapshot,
            soulAccessRegistrySnapshot,
            soulFeeDistributorSnapshot,
          },
        } = await loadFixture(fixture)

        const beneficiaryAddress = beneficiaries[0].address
        const allocationPoints = 1000

        await expect(
          soulFeeDistributor.connect(feeTo).setBeneficiaryAllocation(beneficiaryAddress, allocationPoints)
        ).to.be.revertedWith('Unauthorized')
      })
    })
  })

  describe('distributeFees', function () {
    it('Should emit when should distribute ERC20 fees correctly', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)

      // Deposit some tokens into the contract for distribution
      // Assuming `distributionToken` is an ERC20 token with a `mint` function
      const mintAmount = ether('100')
      await distributionToken.mint(mintAmount)
      await distributionToken.transfer(soulFeeDistributor.address, mintAmount)

      await expect(soulFeeDistributor.connect(distributorRole).distributeFees([distributionToken.address]))
        .to.emit(soulFeeDistributor, 'Distribution')
        .withArgs(anyValue, distributionToken.address, anyValue) // Replace `anyValue` with specific args if needed
    })

    it('Should emit when should distribute native currency correctly', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)

      const nativeTokens = [ADDRESS_NATIVE, ADDRESS_ZERO]

      for (let i = 0; i < nativeTokens.length; i++) {
        await takeNativeBalanceSnapshot()
        const nativeToken = nativeTokens[i]

        // The amount of native tokens to send, wrapped in the utility function to handle big numbers
        const amountToSend = ether('1')
        // Sending native tokens to the `soulFeeDistributor` contract
        const tx = await adminRole.sendTransaction({
          to: soulFeeDistributor.address,
          value: amountToSend,
        })
        const nativeSnapshot = await takeNativeBalanceSnapshot()
        // Check that the native tokens arrived
        expect(nativeSnapshot[soulFeeDistributor.address].balanceDiff).to.be.greaterThan(0)

        await expect(soulFeeDistributor.connect(distributorRole).distributeFees([nativeToken]))
          .to.emit(soulFeeDistributor, 'DistributionNative')
          .withArgs(anyValue, anyValue) // Replace `anyValue` with specific args if needed

        const nativeSnapshot2 = await takeNativeBalanceSnapshot()
        beneficiaries.forEach((beneficiary) => {
          expect(nativeSnapshot2[beneficiary.address].balanceDiff).to.be.greaterThan(0)
        })
        expect(nativeSnapshot2[soulFeeDistributor.address].latestBalance).to.be.equal(0)
      }
    })

    it('Should revert when should revert if no funds were distributed', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)

      await expect(soulFeeDistributor.connect(distributorRole).distributeFees([ADDRESS_NATIVE])).to.be.revertedWith(
        'No funds were distributed'
      )
    })

    it('Should revert when should revert if called by non-distributor', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)

      // Deposit some tokens into the contract for distribution
      // Assuming `distributionToken` is an ERC20 token with a `mint` function
      const mintAmount = ether('100')
      await distributionToken.mint(mintAmount)
      await distributionToken.transfer(soulFeeDistributor.address, mintAmount)

      await expect(soulFeeDistributor.connect(recipient).distributeFees([distributionToken.address])).to.revertedWith(
        'Unauthorized'
      )
    })

    it('Should unwrap wrapped native tokens correctly', async function () {
      const {
        contracts: { soulFeeDistributor, mockWBNB },
        accounts: { adminRole, distributorRole, beneficiaries },
        snapshotters: { takeNativeBalanceSnapshot },
      } = await loadFixture(fixture)

      // Wrap native tokens into wnative
      const wrapAmount = ether('10')
      await mockWBNB.deposit({ value: wrapAmount })
      // Transfer wrapped tokens to the distributor
      await mockWBNB.transfer(soulFeeDistributor.address, wrapAmount)

      // Distribute fees
      const distributeTx = await soulFeeDistributor.connect(distributorRole).distributeFees([mockWBNB.address])
      await distributeTx.wait()

      // Check that the wrapped tokens are unwrapped and distributed
      const nativeSnapshot = await takeNativeBalanceSnapshot()
      for (const beneficiary of beneficiaries) {
        const balanceDiff = nativeSnapshot[beneficiary.address].balanceDiff
        expect(balanceDiff).to.be.gt(0, `Beneficiary ${beneficiary.address} did not receive unwrapped native tokens`)
      }

      // Check that the distributor's wrapped token balance is 0 after distribution
      const distributorWnativeBalance = await mockWBNB.balanceOf(soulFeeDistributor.address)
      expect(distributorWnativeBalance).to.equal(0, 'Distributor still has a wrapped native token balance')
    })
  })

  describe('getBeneficiaryAtIndex', function () {
    it('Should should return beneficiary details correctly', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)

      for (let i = 0; i < beneficiaries.length; i++) {
        const [beneficiary, ,] = await soulFeeDistributor.getBeneficiaryAtIndex(i)
        expect(beneficiary).to.equal(beneficiaries[i].address)
      }
    })

    it('Should revert when should revert if index is out of bounds', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)
      await expect(soulFeeDistributor.getBeneficiaryAtIndex(beneficiaries.length + 1)).to.be.revertedWith(
        'Index out of bounds'
      )
    })
  })

  describe('getTotalBeneficiaries', function () {
    it('Should should return total number of beneficiaries', async function () {
      const {
        contracts: { soulAccessRegistry, soulFeeDistributor, distributionToken, mockWBNB },
        accounts: {
          adminRole,
          feeTo,
          tokensOwner,
          zapReceiver,
          feeCollector,
          recipient,
          feeManagerRole,
          distributorRole,
          beneficiaries,
        },
        snapshotters: {
          takeNativeBalanceSnapshot,
          takeERC20BalanceSnapshot,
          soulAccessRegistrySnapshot,
          soulFeeDistributorSnapshot,
        },
      } = await loadFixture(fixture)

      const totalBeneficiaries = await soulFeeDistributor.getTotalBeneficiaries()
      expect(totalBeneficiaries).to.be.equal(beneficiaries.length)
    })
  })
})

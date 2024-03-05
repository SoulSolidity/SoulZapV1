import { ethers } from 'hardhat'
// https://hardhat.org/hardhat-network-helpers/docs/reference
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import '@nomicfoundation/hardhat-chai-matchers'

import { dynamicFixture } from './fixtures'
import { SoulAccessRegistry } from '../typechain-types'
import { ADDRESS_DEAD, getContractGetterSnapshot } from './utils'
import { TransparentUpgradeableProxy__factory } from '../typechain-types/factories/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'
import { deploySoulAccessRegistry } from './fixtures/deployRegistry'

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
  const [admin, manager, notAdmin, proxyAdmin] = await ethers.getSigners()

  const { soulAccessRegistry, soulAccessRegistryImplementation, soulAccessRegistrySnapshot } =
    await deploySoulAccessRegistry(ethers, [admin, proxyAdmin])

  const soulAccessManagedMock = await (
    await ethers.getContractFactory('SoulAccessManagedMock')
  ).deploy(soulAccessRegistry.address)

  return {
    contracts: { soulAccessRegistry, soulAccessRegistryImplementation, soulAccessManagedMock },
    snapshotters: { soulAccessRegistrySnapshot },
    accounts: { admin, manager, notAdmin },
  }
}

describe('SoulAccessRegistry', function () {
  it('Should verify that two roles have the correct access.', async () => {
    const {
      contracts: { soulAccessRegistry, soulAccessManagedMock },
      snapshotters: { soulAccessRegistrySnapshot },
      accounts: { admin, manager, notAdmin },
    } = await loadFixture(fixture)

    await soulAccessRegistry.connect(admin).setRoleAdminByName('SOUL_ACCESS_REGISTRY_ROLE', 'ADMIN_ROLE')
    await soulAccessRegistry.connect(admin).grantRoleName('SOUL_ACCESS_REGISTRY_ROLE', manager.address)
    console.dir({ soulAccessRegistrySnapshot: await soulAccessRegistrySnapshot() })

    const doSomethingSensitive_0 = await soulAccessManagedMock.somethingSensitiveCount()
    await soulAccessManagedMock.connect(manager).doSomethingSensitive()
    const doSomethingSensitive_1 = await soulAccessManagedMock.somethingSensitiveCount()
    expect(doSomethingSensitive_1).to.be.greaterThan(doSomethingSensitive_0)

    await expect(soulAccessManagedMock.connect(notAdmin).doSomethingSensitive()).to.be.revertedWithCustomError(
      soulAccessManagedMock,
      'SoulAccessUnauthorized'
    )
  })
})

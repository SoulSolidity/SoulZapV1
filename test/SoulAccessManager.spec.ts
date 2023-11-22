import { ethers } from 'hardhat'
// https://hardhat.org/hardhat-network-helpers/docs/reference
import { mine, time, loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import '@nomicfoundation/hardhat-chai-matchers'

import { dynamicFixture } from './fixtures'
import { AccessManagedMock, SoulAccessRegistry } from '../typechain-types'
import { getContractGetterSnapshot } from './utils'

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
  const [admin, manager, notAdmin] = await ethers.getSigners()

  const soulAccessRegistry = await (await ethers.getContractFactory('SoulAccessRegistry')).deploy()
  await soulAccessRegistry.initialize(admin.address)
  const soulAccessRegistrySnapshot = async () =>
    await getContractGetterSnapshot(soulAccessRegistry, [
      {
        functionName: 'roleNameExists',
        functionArgs: ['SOUL_ACCESS_REGISTRY_ROLE'],
      },
      {
        functionName: 'getRoleNameByIndex',
        functionArgs: ['0'],
      },
      {
        functionName: 'roleNameExists',
        functionArgs: ['SOUL_ACCESS_REGISTRY_ROLE'],
      },
      {
        functionName: 'getRoleNameByIndex',
        functionArgs: ['1'],
      },
    ])

  const soulAccessRegistryMock = await (
    await ethers.getContractFactory('SoulAccessRegistryMock')
  ).deploy(soulAccessRegistry.address)

  return {
    contracts: { soulAccessRegistry, soulAccessRegistryMock },
    snapshotters: { soulAccessRegistrySnapshot },
    accounts: { admin, manager, notAdmin },
  }
}

describe('SoulAccessRegistry', function () {
  it('Should be able to load fixture', async () => {
    const {
      contracts: { soulAccessRegistry, soulAccessRegistryMock },
      snapshotters: { soulAccessRegistrySnapshot },
      accounts: { admin, manager, notAdmin },
    } = await loadFixture(fixture)

    await soulAccessRegistry.connect(admin).setRoleAdminByName('SOUL_ACCESS_REGISTRY_ROLE', 'ADMIN_ROLE')
    await soulAccessRegistry.connect(admin).grantRoleName('SOUL_ACCESS_REGISTRY_ROLE', manager.address)
    console.dir({ soulAccessRegistrySnapshot: await soulAccessRegistrySnapshot() })

    const doSomethingSensitive_0 = await soulAccessRegistryMock.somethingSensitiveCount()
    await soulAccessRegistryMock.connect(manager).doSomethingSensitive()
    const doSomethingSensitive_1 = await soulAccessRegistryMock.somethingSensitiveCount()
    expect(doSomethingSensitive_1).to.be.greaterThan(doSomethingSensitive_0)

    await expect(soulAccessRegistryMock.connect(notAdmin).doSomethingSensitive()).to.be.revertedWithCustomError(
      soulAccessRegistryMock,
      'SoulAccessUnauthorized'
    )
  })
})

import { ethers } from 'hardhat'
import { TransparentUpgradeableProxy__factory, SoulAccessRegistry } from '../../typechain-types'
import { ADDRESS_DEAD, getContractGetterSnapshot } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

export async function deploySoulAccessRegistry(
  _ethers: typeof ethers,
  [admin, proxyAdmin]: [SignerWithAddress, SignerWithAddress | undefined]
) {
  const proxyAdminAddress = proxyAdmin?.address || ADDRESS_DEAD
  // Deploy the implementation contract
  const soulAccessRegistryImplementation = await (await ethers.getContractFactory('SoulAccessRegistry')).deploy()
  // Deploy the proxy contract
  const TransparentUpgradeableProxy = (await ethers.getContractFactory(
    'TransparentUpgradeableProxy'
  )) as TransparentUpgradeableProxy__factory
  const proxy = await TransparentUpgradeableProxy.deploy(
    soulAccessRegistryImplementation.address,
    proxyAdminAddress,
    '0x'
  )
  // Cast the proxy to the interface of the implementation to call initialize
  const soulAccessRegistry = (await ethers.getContractAt('SoulAccessRegistry', proxy.address)) as SoulAccessRegistry
  await soulAccessRegistry.initialize(admin.address)

  const soulAccessRegistrySnapshot = async () => {
    return await getContractGetterSnapshot(soulAccessRegistry, [
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
        functionArgs: ['ADMIN_ROLE'],
      },
      {
        functionName: 'getRoleNameByIndex',
        functionArgs: ['1'],
      },
    ])
  }

  return { soulAccessRegistry, soulAccessRegistryImplementation, soulAccessRegistrySnapshot }
}

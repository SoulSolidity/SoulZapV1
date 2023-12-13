import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { SoulAccessRegistry } from '../../typechain-types'
import { TransparentUpgradeableProxy__factory } from '../../typechain-types/factories/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'
import { ADDRESS_DEAD } from '../utils'
export async function deployZapFixture(_ethers: typeof ethers, chain: DeployableNetworks) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, adminAddress, dexInfo, feeCollector } = getDeployConfig(chain)
  const [owner, otherAccount] = await _ethers.getSigners()

  const soulAccessRegistryImplementation = await (await ethers.getContractFactory('SoulAccessRegistry')).deploy()
  const TransparentUpgradeableProxy = (await ethers.getContractFactory(
    'TransparentUpgradeableProxy'
  )) as TransparentUpgradeableProxy__factory
  const proxy = await TransparentUpgradeableProxy.deploy(soulAccessRegistryImplementation.address, ADDRESS_DEAD, '0x')

  // Cast the proxy to the interface of the implementation to call initialize
  const soulAccessRegistry = (await ethers.getContractAt('SoulAccessRegistry', proxy.address)) as SoulAccessRegistry
  await soulAccessRegistry.initialize(adminAddress)

  const SoulFeeManager = await _ethers.getContractFactory('SoulFeeManager')
  // NOTE: Fixed fee volume using wNative as fee token
  const volumes = [0]
  const fees = [300]
  const soulFeeManager = await SoulFeeManager.deploy(soulAccessRegistry.address, [wNative], feeCollector, volumes, fees)
  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')

  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(soulAccessRegistry.address, wNative, soulFeeManager.address, 0)

  return { soulAccessRegistry, soulFeeManager, soulZap }
}

import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { ZERO_ADDRESS } from '../../src'
import { ChainId } from '../../src/constants'
import { SoulAccessRegistry__factory } from '../../typechain-types'
export async function deployZapFixture(_ethers: typeof ethers, chain: DeployableNetworks) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, admin, dexInfo, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig(chain)
  const [owner, otherAccount] = await _ethers.getSigners()

  const SoulAccessRegistry = (await _ethers.getContractFactory('SoulAccessRegistry')) as SoulAccessRegistry__factory
  const soulAccessRegistry = await SoulAccessRegistry.deploy(true)
  await soulAccessRegistry.initialize(admin)
  // TODO: Currently using mock contract
  const SoulFeeManager = await _ethers.getContractFactory('SoulFeeManager')
  // NOTE: Fixed fee volume using wNative as fee token
  const volumes = [0]
  const fees = [300]
  const soulFeeManager = await SoulFeeManager.deploy(soulAccessRegistry.address, [wNative], feeCollector, volumes, fees)
  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')

  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(soulAccessRegistry.address, wNative, soulFeeManager.address, 0)

  return { soulAccessRegistry, soulFeeManager, soulZap }
}

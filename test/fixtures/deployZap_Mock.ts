import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { logger } from '../../hardhat/utils'
import { SoulAccessRegistry, SoulFeeManager__factory, SoulZap_UniV2_Extended_V1__factory } from '../../typechain-types'
import { TransparentUpgradeableProxy } from '../../typechain-types/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'
import { TransparentUpgradeableProxy__factory } from '../../typechain-types/factories/artifacts/@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol'
import { ADDRESS_DEAD } from '../utils'

export async function deployZapFixture_Fork(_ethers: typeof ethers, chain: DeployableNetworks, feeTokens: string[]) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, adminAddress, dexInfo, feeCollector } = getDeployConfig(chain)
  const [owner, otherAccount] = await _ethers.getSigners()

  const { soulAccessRegistry, soulFeeManager } = await deployZapSetup_Mock(
    _ethers,
    adminAddress,
    feeCollector,
    feeTokens
  )

  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')
  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(soulAccessRegistry.address, wNative, soulFeeManager.address, 0)

  return { soulAccessRegistry, soulFeeManager, soulZap }
}

export async function deployZapSetup_Mock(
  _ethers: typeof ethers,
  accessManagerAdmin: string,
  feeCollector: string,
  feeTokens: string[]
) {
  const soulAccessRegistryImplementation = await (await ethers.getContractFactory('SoulAccessRegistry')).deploy()
  const TransparentUpgradeableProxy = (await ethers.getContractFactory(
    'TransparentUpgradeableProxy'
  )) as TransparentUpgradeableProxy__factory
  const proxy = await TransparentUpgradeableProxy.deploy(soulAccessRegistryImplementation.address, ADDRESS_DEAD, '0x')

  // Cast the proxy to the interface of the implementation to call initialize
  const soulAccessRegistry = (await ethers.getContractAt('SoulAccessRegistry', proxy.address)) as SoulAccessRegistry
  await soulAccessRegistry.initialize(accessManagerAdmin)

  // NOTE: Can support multiple fee tokens, only passing 1
  const SoulFeeManager = (await _ethers.getContractFactory('SoulFeeManager')) as SoulFeeManager__factory
  const volumes = [0, 10]
  const fees = [300, 200]
  const soulFeeManager = await SoulFeeManager.deploy(soulAccessRegistry.address, feeTokens, feeCollector, volumes, fees)

  return { soulAccessRegistry, soulFeeManager }
}

export async function deployZap_UniV2_Extended_V1(
  _ethers: typeof ethers,
  adminAddress: string,
  wNativeAddress: string,
  routerAddress: string,
  hopTokens: string[],
  feeCollector: string,
  feeTokens: string[]
) {
  logger.log(`Deploying deployZapSetup_Mock`, '📈')
  const { soulAccessRegistry, soulFeeManager } = await deployZapSetup_Mock(
    _ethers,
    adminAddress,
    feeCollector,
    feeTokens
  )

  logger.log(`Deploying SoulZap_UniV2_Extended_V1`, '📈')
  const SoulZap_UniV2_Extended_V1 = (await _ethers.getContractFactory(
    'SoulZap_UniV2_Extended_V1'
  )) as SoulZap_UniV2_Extended_V1__factory
  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(
    soulAccessRegistry.address,
    wNativeAddress,
    soulFeeManager.address,
    0
  )
  // NOTE: need to whitelist router to be able to zap/swap. This is done at at higher level currently in the fixture function.
  // await soulZap.setRouterWhitelist(routerAddress, true);

  // Setting up role access for SoulZap
  const [SOUL_ZAP_PAUSER_ROLE, SOUL_ZAP_ADMIN_ROLE] = await Promise.all([
    soulZap.SOUL_ZAP_PAUSER_ROLE(),
    soulZap.SOUL_ZAP_ADMIN_ROLE(),
  ])

  logger.log(`Deploying Zap_UniV2_Extended_V1_Lens`, '📈')
  const SoulZap_UniV2_Extended_V1_Lens = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1_Lens')
  const soulZap_Lens = await SoulZap_UniV2_Extended_V1_Lens.deploy(soulZap.address, routerAddress, hopTokens)

  return {
    soulAccessRegistry,
    soulAccessRoles: {
      SOUL_ZAP_PAUSER_ROLE,
      SOUL_ZAP_ADMIN_ROLE,
    },
    soulFeeManager,
    soulZap,
    soulZap_Lens,
  }
}

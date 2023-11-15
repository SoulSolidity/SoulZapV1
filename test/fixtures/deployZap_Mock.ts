import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { ZERO_ADDRESS } from '../../src'
import { ChainId } from '../../src/constants'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { logger } from '../../hardhat/utils'

export async function deployZapFixture_Fork(_ethers: typeof ethers, chain: DeployableNetworks) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, admin, dexInfo, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig(chain)
  const [owner, otherAccount] = await _ethers.getSigners()

  const { soulAccessManager, soulFeeManager } = await deployZapSetup_Mock(_ethers, admin)

  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')
  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(soulAccessManager.address, wNative, soulFeeManager.address, 0)

  return { soulAccessManager, soulFeeManager, soulZap }
}

export async function deployZapSetup_Mock(_ethers: typeof ethers, accessManagerAdmin: string) {
  const SoulAccessManager = await _ethers.getContractFactory('SoulAccessManager')
  const soulAccessManager = await SoulAccessManager.deploy(accessManagerAdmin)

  const SoulFeeManager = await _ethers.getContractFactory('SoulFeeManagerMock')
  const soulFeeManager = await SoulFeeManager.deploy()

  return { soulAccessManager, soulFeeManager }
}

export async function deployZap_UniV2_Extended_V1(
  _ethers: typeof ethers,
  adminAddress: string,
  wNativeAddress: string,
  routerAddress: string,
  hopTokens: string[]
) {
  logger.log(`Deploying Zap_UniV2_Extended_V1`, '📈')
  const { soulAccessManager, soulFeeManager } = await deployZapSetup_Mock(_ethers, adminAddress)

  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')

  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(
    soulAccessManager.address,
    wNativeAddress,
    soulFeeManager.address,
    0
  )

  const SoulZap_UniV2_Extended_Lens_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_Lens_V1')
  const soulZap_Lens = await SoulZap_UniV2_Extended_Lens_V1.deploy(soulZap.address, routerAddress, hopTokens)

  return { soulAccessManager, soulFeeManager, soulZap, soulZap_Lens }
}

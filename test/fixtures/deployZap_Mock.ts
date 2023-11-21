import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { ZERO_ADDRESS } from '../../src'
import { ChainId, WRAPPED_NATIVE } from '../../src/constants'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { logger } from '../../hardhat/utils'

export async function deployZapFixture_Fork(_ethers: typeof ethers, chain: DeployableNetworks, feeTokens: string[]) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, admin, dexInfo, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig(chain)
  const [owner, otherAccount] = await _ethers.getSigners()

  const { soulAccessManager, soulFeeManager } = await deployZapSetup_Mock(_ethers, admin, feeCollector, feeTokens)

  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')
  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(soulAccessManager.address, wNative, soulFeeManager.address, 0)

  return { soulAccessManager, soulFeeManager, soulZap }
}

export async function deployZapSetup_Mock(
  _ethers: typeof ethers,
  accessManagerAdmin: string,
  feeCollector: string,
  feeTokens: string[]
) {
  const SoulAccessManager = await _ethers.getContractFactory('SoulAccessManager')
  const soulAccessManager = await SoulAccessManager.deploy(accessManagerAdmin)

  // NOTE: Can support multiple fee tokens, only passing 1
  const SoulFeeManager = await _ethers.getContractFactory('SoulFeeManager')
  // NOTE: Fixed fee volume
  const volumes = [0]
  const fees = [300]
  const soulFeeManager = await SoulFeeManager.deploy(soulAccessManager.address, feeTokens, feeCollector, volumes, fees)

  return { soulAccessManager, soulFeeManager }
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
  logger.log(`Deploying Zap_UniV2_Extended_V1`, '📈')
  const { soulAccessManager, soulFeeManager } = await deployZapSetup_Mock(
    _ethers,
    adminAddress,
    feeCollector,
    feeTokens
  )

  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')
  const soulZap = await SoulZap_UniV2_Extended_V1.deploy(
    soulAccessManager.address,
    wNativeAddress,
    soulFeeManager.address,
    0
  )

  const SoulZap_UniV2_Extended_V1_Lens = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1_Lens')
  const soulZap_Lens = await SoulZap_UniV2_Extended_V1_Lens.deploy(soulZap.address, routerAddress, hopTokens)

  return { soulAccessManager, soulFeeManager, soulZap, soulZap_Lens }
}

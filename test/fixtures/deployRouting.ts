import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { ZERO_ADDRESS } from '../../src'
export async function deployRoutingFixture(_ethers: typeof ethers, router: string) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, admin, dexInfo, hopTokens, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig('polygon')
  const [owner, otherAccount] = await _ethers.getSigners()

  const SoulAccessManager = await _ethers.getContractFactory('SoulAccessManager')
  const soulAccessManager = await SoulAccessManager.deploy(admin)

  const SoulFeeManager = await _ethers.getContractFactory('SoulFeeManager')
  const soulFeeManager = await SoulFeeManager.deploy()

  const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')
  const soulZap_UniV2_Extended_V1 = await SoulZap_UniV2_Extended_V1.deploy(
    soulAccessManager.address, wNative, soulFeeManager.address, 0
  )

  const SoulZap_Lens = await _ethers.getContractFactory('SoulZap_UniV2_Lens')
  const soulZap_Lens = await SoulZap_Lens.deploy(
    soulAccessManager.address,
    soulFeeManager.address,
    soulZap_UniV2_Extended_V1.address,
    wNative,
    hopTokens[0],
    router,
    hopTokens
  )

  return { soulZap_Lens, owner, otherAccount }
}

import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { ZERO_ADDRESS } from '../../src'
export async function deployRoutingFixture(_ethers: typeof ethers, chain: DeployableNetworks, souZapAddress: string, router: string) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, admin, dexInfo, hopTokens, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig(chain)
  const [owner, otherAccount] = await _ethers.getSigners()

  const SoulZap_Lens = await _ethers.getContractFactory('SoulZap_UniV2_Extended_Lens_V1')
  const soulZap_Lens = await SoulZap_Lens.deploy(
    souZapAddress,
    wNative,
    hopTokens[0],
    router,
    hopTokens
  )

  return { soulZap_Lens, owner, otherAccount }
}
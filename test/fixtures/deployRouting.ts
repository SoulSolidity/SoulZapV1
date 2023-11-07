import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
export async function deployRoutingFixture(_ethers: typeof ethers) {
  // Contracts are deployed using the first signer/account by default
  const { wNative, adminAddress, dexInfo, hopTokens, feeCollector, protocolFee, proxyAdminAddress } = getDeployConfig('bsc')
  const [owner, otherAccount] = await _ethers.getSigners()

  const SoulZap_Lens = await _ethers.getContractFactory('SoulZapFullV1_Lens')

  const soulZap_Lens = await SoulZap_Lens.deploy(
    wNative,
    [dexInfo.ApeBond?.factory!, dexInfo.PancakeSwap?.factory!],
    [dexInfo.ApeBond?.router!, dexInfo.PancakeSwap?.router!],
    hopTokens,
  )

  return { soulZap_Lens, owner, otherAccount }
}

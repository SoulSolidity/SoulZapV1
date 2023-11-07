// import { ethers, network } from 'hardhat'
// import { DeployableNetworks, getDeployConfig } from '../../scripts/deploy/deploy.config'

// export async function deployRoutingFixture(_ethers: typeof ethers) {
//   const currentNetwork = network.name as DeployableNetworks

//   const { wNative, feeCollector, protocolFee } = getDeployConfig(currentNetwork)

//   // Contracts are deployed using the first signer/account by default
//   const [owner, otherAccount] = await _ethers.getSigners()

//   const SoulZap = await _ethers.getContractFactory('SoulZapFullV1')
//   const soulZap = await SoulZap.deploy(wNative, feeCollector, protocolFee)

//   return { soulZap, owner, otherAccount }
// }

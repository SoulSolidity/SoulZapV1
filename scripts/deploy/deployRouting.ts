import { ethers, network } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from './deploy.config'
import { DeployManager } from './DeployManager'

/**
 * // NOTE: This is an example of the default hardhat deployment approach.
 * This project takes deployments one step further by assigning each deployment
 * its own task in ../tasks/ organized by date.
 */
// TODO: Preferred to deploy Lens and Zap together.
async function main() {
  const currentNetwork = network.name as DeployableNetworks
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  const { wNative, adminAddress, dexInfo, SoulZap_UniV2 } = getDeployConfig(currentNetwork, accounts)
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  if (!SoulZap_UniV2 || SoulZap_UniV2 == '0x') {
    throw new Error('No SoulFee contract address found. deploy it first and/or add to config')
  }

  const currentDexInfo = dexInfo.ApeBond
  if (!currentDexInfo) {
    throw new Error('No Dex Info found. Please add to config')
  }

  const SoulZap_UniV2_Extended_V1_Lens = 'SoulZap_UniV2_Extended_V1_Lens'
  const RoutingContract = await ethers.getContractFactory(SoulZap_UniV2_Extended_V1_Lens)
  const routingContract = await deployManager.deployContractFromFactory(
    RoutingContract,
    [SoulZap_UniV2, currentDexInfo.router, currentDexInfo.hopTokens, { gasPrice: '100000000000' }],
    SoulZap_UniV2_Extended_V1_Lens // Pass in contract name to log contract
  )
  console.log('SoulZap_UniV2_Lens contract deployed at:', routingContract.address)

  await delay(20000)
  // await deployManager.addDeployedContract('20231031-bsc-deployment.json')
  await deployManager.verifyContracts()
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

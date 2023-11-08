import { ethers, network } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from './deploy.config'
import { DeployManager } from './DeployManager'

/**
 * // NOTE: This is an example of the default hardhat deployment approach.
 * This project takes deployments one step further by assigning each deployment
 * its own task in ../tasks/ organized by date.
 */
async function main() {
  const currentNetwork = network.name as DeployableNetworks
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  const { wNative, adminAddress, dexInfo, hopTokens, soulFee } = getDeployConfig(currentNetwork, accounts)
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  if (!soulFee || soulFee == '0x') {
    throw new Error('No SoulFee contract address found. deploy it first and/or add to config')
  }
  const SoulZapFullV1_Lens = 'SoulZapFullV1_Lens'
  const RoutingContract = await ethers.getContractFactory(SoulZapFullV1_Lens)
  const routingContract = await deployManager.deployContractFromFactory(
    RoutingContract,
    [wNative, [dexInfo.ApeBond?.factory!], [dexInfo.ApeBond?.router!], hopTokens, soulFee],
    SoulZapFullV1_Lens // Pass in contract name to log contract
  )
  console.log('Lens contract deployed at:', routingContract.address)

  await delay(20000);
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

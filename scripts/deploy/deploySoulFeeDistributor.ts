import { ethers, network } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from './deploy.config'
import { DeployManager } from './DeployManager'
import { convertAddressesToExplorerLinksByNetwork } from '../../hardhat/utils'
import { delay } from '../utils'

/**
 * // NOTE: This is an example of the default hardhat deployment approach.
 * This project takes deployments one step further by assigning each deployment
 * its own task in ../tasks/ organized by date.
 */
async function main() {
  const currentNetwork = network.name as DeployableNetworks
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  // const { wNative, adminAddress } = getDeployConfig(currentNetwork, accounts)
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  const SoulFeeDistributor = await ethers.getContractFactory('SoulFeeDistributor')
  // NOTE: Initializer for this contract is disabled
  const soulFeeDistributor = await deployManager.deployContractFromFactory(SoulFeeDistributor, [], 'SoulFeeDistributor')

  const output = convertAddressesToExplorerLinksByNetwork(
    {
      SoulFeeDistributor: soulFeeDistributor.address,
    },
    currentNetwork
  )

  console.dir(output, { depth: 5 })

  delay(20000)

  await deployManager.verifyContracts()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

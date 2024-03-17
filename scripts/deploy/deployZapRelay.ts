import { ethers, network } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from './deploy.config'
import { DeployManager } from './DeployManager'
import { writeObjectToTsFile } from '../utils/files'
import { convertAddressesToExplorerLinksByNetwork, logger } from '../../hardhat/utils'
import { delay } from '../utils'
import { ZERO_ADDRESS } from '../../src'

/**
 * // NOTE: This is an example of the default hardhat deployment approach.
 * This project takes deployments one step further by assigning each deployment
 * its own task in ../tasks/ organized by date.
 */
async function main() {
  const currentNetwork = network.name as DeployableNetworks
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  const deployConfig = getDeployConfig(currentNetwork, accounts)
  const { wNative, adminAddress, feeCollector, soulFeeManager, soulAccessRegistry, volumesAndFees, feeTokens } =
    deployConfig
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  const SoulZapRouter_name = 'SoulZapRouter'
  const SoulZapRouter = await ethers.getContractFactory(SoulZapRouter_name)
  const soulZapRouter = await deployManager.deployContractFromFactory(
    SoulZapRouter,
    [ZERO_ADDRESS],
    SoulZapRouter_name
  )
  console.log('SoulZapRouter contract deployed at:', soulZapRouter.address)

  const output = convertAddressesToExplorerLinksByNetwork(
    {
      SoulZapRouter: soulZapRouter.address,
      deployConfig,
      NEXT_STEPS: {
        step0: 'nothing',
      },
    },
    currentNetwork
  )
  console.dir(output, { depth: 5 })
  await writeObjectToTsFile(__dirname + `/deployment-${currentNetwork}.ts`, 'deployment', output)

  await delay(20000)
  // await deployManager.addDeployedContract('20231122-polygon-deployment.json')
  await deployManager.verifyContracts()
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

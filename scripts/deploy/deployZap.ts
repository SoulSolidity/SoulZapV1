import { ethers, network } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from './deploy.config'
import { DeployManager } from './DeployManager'
import { writeObjectToTsFile } from '../utils/files'
import { convertAddressesToExplorerLinksByNetwork, logger } from '../../hardhat/utils'
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
  const deployConfig = getDeployConfig(currentNetwork, accounts)
  const { wNative, adminAddress, feeCollector, soulFeeManager, soulAccessRegistry, volumesAndFees, feeTokens } =
    deployConfig
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  let soulAccessRegistryAddress = soulAccessRegistry
  if (!soulAccessRegistry || soulAccessRegistry == '0x') {
    logger.log(`Deploying SoulAccessRegistry...`, '🔧')
    const SoulAccessRegistry = 'SoulAccessRegistry'
    const SoulAccessRegistryContract = await ethers.getContractFactory(SoulAccessRegistry)
    const soulAccessRegistryContract = await deployManager.deployContractFromFactory(
      SoulAccessRegistryContract,
      [],
      SoulAccessRegistry
    )
    await soulAccessRegistryContract.initialize(adminAddress)
    soulAccessRegistryAddress = soulAccessRegistryContract.address
  } else {
    logger.log(`Using existing SoulAccessRegistry at ${soulAccessRegistryAddress}`, '🔄')
  }

  let soulFeeManagerAddress = soulFeeManager
  if (!soulFeeManager || soulFeeManager == '0x') {
    logger.log(`Deploying soulFeeManager...`, '🔧')
    const SoulFeeManager = 'SoulFeeManager'
    const SoulFeeManagerContract = await ethers.getContractFactory(SoulFeeManager)
    const soulFeeManagerContract = await deployManager.deployContractFromFactory(
      SoulFeeManagerContract,
      [soulAccessRegistryAddress!, feeTokens, feeCollector, volumesAndFees.volumes, volumesAndFees.fees],
      SoulFeeManager
    )
    soulFeeManagerAddress = soulFeeManagerContract.address
  } else {
    logger.log(`Using existing SoulFeeManager at ${soulFeeManagerAddress}`, '🔄')
  }

  await delay(20000)

  const SoulZap_UniV2_Extended_V1_name = 'SoulZap_UniV2_Extended_V1'
  const SoulZap_UniV2_Extended_V1 = await ethers.getContractFactory(SoulZap_UniV2_Extended_V1_name)
  const soulZap_UniV2_Extended_V1 = await deployManager.deployContractFromFactory(
    SoulZap_UniV2_Extended_V1,
    [soulAccessRegistryAddress!, wNative, soulFeeManagerAddress!, 0],
    SoulZap_UniV2_Extended_V1_name
  )
  console.log('SoulZap_UniV2 contract deployed at:', soulZap_UniV2_Extended_V1.address)

  const output = convertAddressesToExplorerLinksByNetwork(
    {
      SoulZap_UniV2_Extended_V1: soulZap_UniV2_Extended_V1.address,
      deployConfig,
      NEXT_STEPS: {
        step0: 'Whitelist router contracts',
        step1: 'Whitelist bond contracts',
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

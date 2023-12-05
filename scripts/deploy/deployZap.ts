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
  const {
    wNative,
    admin,
    dexInfo,
    feeCollector,
    soulFeeManager,
    soulAccessRegistry,
    protocolFee,
    maxFee,
    volumesAndFees,
  } = getDeployConfig(currentNetwork, accounts)
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  let soulAccessRegistryAddress = soulAccessRegistry
  if (!soulAccessRegistry || soulAccessRegistry == '0x') {
    const SoulAccessRegistry = 'SoulAccessRegistry'
    const SoulAccessRegistryContract = await ethers.getContractFactory(SoulAccessRegistry)
    const soulAccessRegistryContract = await deployManager.deployContractFromFactory(
      SoulAccessRegistryContract,
      [true],
      SoulAccessRegistry
    )
    await soulAccessRegistryContract.initialize(admin)
    soulAccessRegistryAddress = soulAccessRegistryContract.address
  }
  console.log('SoulAccessManager contract at:', soulAccessRegistryAddress)

  let soulFeeManagerAddress = soulFeeManager
  if (!soulFeeManager || soulFeeManager == '0x') {
    const SoulFeeManager = 'SoulFeeManager'
    const SoulFeeManagerContract = await ethers.getContractFactory(SoulFeeManager)
    const soulFeeManagerContract = await deployManager.deployContractFromFactory(
      SoulFeeManagerContract,
      [
        soulAccessRegistryAddress!,
        [dexInfo.ApeBond?.hopTokens[0]!],
        feeCollector,
        volumesAndFees.volumes,
        volumesAndFees.fees,
      ],
      SoulFeeManager
    )
    soulFeeManagerAddress = soulFeeManagerContract.address
  }
  console.log('SoulFeeManager contract at:', soulFeeManagerAddress)

  const SoulZap_UniV2 = 'SoulZap_UniV2_Extended_V1'
  const RoutingContract = await ethers.getContractFactory(SoulZap_UniV2)
  const routingContract = await deployManager.deployContractFromFactory(
    RoutingContract,
    [soulAccessRegistryAddress!, wNative, soulFeeManagerAddress!, 0],
    SoulZap_UniV2 // Pass in contract name to log contract
  )
  console.log('SoulZap_UniV2 contract deployed at:', routingContract.address)

  await delay(20000);
  // await deployManager.addDeployedContract('20231122-polygon-deployment.json')
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

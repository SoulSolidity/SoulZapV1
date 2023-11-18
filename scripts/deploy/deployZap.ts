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
  const { wNative, admin, dexInfo, feeCollector, soulFeeManager, soulAccessManager, protocolFee, maxFee } = getDeployConfig(currentNetwork, accounts)
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  let soulAccessManagerAddress = soulAccessManager;
  if (!soulAccessManager || soulAccessManager == '0x') {
    const SoulAccessManager = 'SoulAccessManager'
    const SoulAccessManagerContract = await ethers.getContractFactory(SoulAccessManager)
    const soulAccessManagerContract = await deployManager.deployContractFromFactory(
      SoulAccessManagerContract,
      [admin],
      SoulAccessManager
    )
    soulAccessManagerAddress = soulAccessManagerContract.address;
  }
  console.log('SoulAccessManager contract at:', soulAccessManagerAddress)

  let soulFeeManagerAddress = soulFeeManager;
  if (!soulFeeManager || soulFeeManager == '0x') {
    const SoulFeeManager = 'SoulFeeManager'
    const SoulFeeManagerContract = await ethers.getContractFactory(SoulFeeManager)
    const soulFeeManagerContract = await deployManager.deployContractFromFactory(
      SoulFeeManagerContract,
      [[dexInfo.ApeBond?.hopTokens[0]], admin, soulAccessManagerAddress],
      SoulFeeManager
    )
    soulFeeManagerAddress = soulFeeManagerContract.address;
  }
  console.log('SoulFeeManager contract at:', soulFeeManagerAddress)

  const SoulZap_UniV2 = 'SoulZap_UniV2_Extended_V1'
  const RoutingContract = await ethers.getContractFactory(SoulZap_UniV2)
  const routingContract = await deployManager.deployContractFromFactory(
    RoutingContract,
    [soulAccessManager, wNative, soulFeeManagerAddress],
    SoulZap_UniV2 // Pass in contract name to log contract
  )
  console.log('SoulZap_UniV2 contract deployed at:', routingContract.address)

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

import { ethers, network } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from './deploy.config'
import { DeployManager } from './DeployManager'
import { writeObjectToTsFile } from '../utils/files'
import { convertAddressesToExplorerLinksByNetwork } from '../../hardhat/utils'

async function main() {
  const currentNetwork = network.name as DeployableNetworks
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  const deployConfig = getDeployConfig(currentNetwork, accounts)
  const { wNative, adminAddress, dexInfo, SoulZap_UniV2 } = deployConfig
  // Optionally pass in signer to deploy contracts
  const deployManager = await DeployManager.create(accounts[0])

  if (!SoulZap_UniV2 || SoulZap_UniV2 == '0x') {
    throw new Error('No SoulZap_UniV2 contract address found. deploy it first and/or add to config')
  }

  // TODO: Only using ApeBond
  // const currentDexInfo = dexInfo.ApeBond
  const currentDexInfo = dexInfo.QuickSwap
  if (!currentDexInfo) {
    throw new Error('No Dex Info found. Please add to config')
  }

  const SoulZap_UniV2_Extended_V1_Lens_name = 'SoulZap_UniV2_Extended_V1_Lens'
  const SoulZap_UniV2_Extended_V1_Lens = await ethers.getContractFactory(SoulZap_UniV2_Extended_V1_Lens_name)
  const soulZap_UniV2_Extended_V1_Lens = await deployManager.deployContractFromFactory(
    SoulZap_UniV2_Extended_V1_Lens,
    [SoulZap_UniV2, currentDexInfo.router, currentDexInfo.hopTokens],
    SoulZap_UniV2_Extended_V1_Lens_name // Pass in contract name to log contract
  )
  console.log('SoulZap_UniV2_Lens contract deployed at:', soulZap_UniV2_Extended_V1_Lens.address)

  const output = convertAddressesToExplorerLinksByNetwork(
    {
      SoulZap_UniV2_Extended_V1_Lens: soulZap_UniV2_Extended_V1_Lens.address,
      currentDexInfo,
      deployConfig,
    },
    currentNetwork
  )
  console.dir(output, { depth: 5 })
  await writeObjectToTsFile(__dirname + `/deployment-${currentNetwork}`, 'deployment', output)

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

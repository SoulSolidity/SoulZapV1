import { ContractFactory, Signer, utils } from 'ethers'
import { network, run } from 'hardhat'
import { logger } from '../../hardhat/utils/logger'
import fs from 'fs'
import { DEPLOYMENTS_BASE_DIR } from './deploy.config'

/*
This is a TypeScript class called `DeployManager` that is used to deploy contracts, verify them and save the deployment details to a file. The class has the following methods:

- `deployContractFromFactory`: This method deploys a contract from a given ContractFactory instance by calling its `deploy` method with the provided parameters. It then saves the deployment details to an array of objects called `contracts` and calls the `saveContractsToFile` method to save the details to a file.
- `verifyContracts`: This method verifies all the contracts in the `contracts` array by calling the Hardhat `verify:verify` task with the contract's address and constructor arguments.
- `saveContractsToFile`: This method saves the deployment details of all the contracts in the `contracts` array to a JavaScript file with a name that includes the current date and network name.

The `DeployManager` class imports the following modules:

- `ethers`: A library for interacting with Ethereum.
- `hardhat`: A development environment for building, testing, and deploying smart contracts.
- `logger`: A custom logger module for logging messages to the console.
- `fs`: A Node.js module for working with the file system.

The class also defines a property called `baseDir` which is set to the current directory by default, and an array of objects called `contracts` which stores the deployment details of all the contracts deployed using this class.
*/

/**
 * Returns the verification command for a smart contract deployment.
 *
 * @param {ContractDetails} contractDetails - The contract details object (Assumes verificationScript is missing).
 * @returns {string} - The verification command string.
 */
function getVerificationCommand(contractDetails: ContractDetails): string {
  const { address, constructorArguments } = contractDetails
  const constructorArgsString = constructorArguments.map((arg) => `'${arg.toString()}'`).join(' ')
  const verificationCommand = `npx hardhat verify --network ${network.name} ${address} ${constructorArgsString}`
  return verificationCommand
}

interface ContractDetails {
  name: string
  address: string
  encodedConstructorArgs: string
  constructorArguments: any[]
  verificationCommand: string
}

export class DeployManager {
  signer?: Signer
  baseDir: string
  deployedContracts: ContractDetails[] = []

  private constructor(signer?: Signer, baseDir = DEPLOYMENTS_BASE_DIR) {
    logger.log(`Setting up DeployManager. Your simple and friendly contract deployment, uhhh, manager.`, `👋🤓`)
    this.baseDir = baseDir
    this.signer = signer ? signer : undefined
    logger.log(`Deployment information will be saved in: ${baseDir}`, `💾`)
  }
  // Using a static method to create an instance of the class to log the signer address if available
  static async create(signer?: Signer, baseDir = DEPLOYMENTS_BASE_DIR): Promise<DeployManager> {
    const instance = new DeployManager(signer, baseDir)
    if (instance.signer) {
      logger.log(`Signer address: ${await instance.signer.getAddress()}`, `🖊️`)
    }
    return instance
  }

  async deployContractFromFactory<C extends ContractFactory>(
    contract: C,
    params: Parameters<C['deploy']>,
    name = 'Contract' // TODO: Provide better fallback naming
  ): Promise<ReturnType<C['deploy']>> {
    logger.logHeader(`Deploying ${name}`, `🚀`)
    // Get the balance of the account before deployment
    const balanceBefore = await this.signer?.getBalance()
    const balanceBeforeInEther = utils.formatEther(balanceBefore || 0)
    logger.log(`Balance before deployment: ${balanceBeforeInEther} ETH`, `💰`)
    // Deploy contract with signer if available
    const contractInstance = this.signer
      ? await contract.connect(this.signer).deploy(...params)
      : await contract.deploy(...params)
    let encodedConstructorArgs = ''
    try {
      encodedConstructorArgs = contractInstance.interface.encodeDeploy(params)
    } catch {
      // NOTE: The encode fails when the deploy options are passed in. So we pop the last element and try again.
      params.pop()
      encodedConstructorArgs = contractInstance.interface.encodeDeploy(params)
    }
    await contractInstance.deployed()

    logger.success(`Deployed ${name} at ${contractInstance.address}`)
    // Save deployment details
    const deployedContractDetails: ContractDetails = {
      name: name,
      address: contractInstance.address,
      encodedConstructorArgs,
      constructorArguments: params,
      verificationCommand: '',
    }

    try {
      deployedContractDetails.verificationCommand = getVerificationCommand(deployedContractDetails)
    } catch (e: any) {
      console.error(
        `Failed to generate verification command for deployedContractDetails: ${deployedContractDetails} with error: ${e}`
      )
    }

    this.deployedContracts.push(deployedContractDetails)
    this.saveContractsToFile()

    return contractInstance as ReturnType<C['deploy']>
  }

  addDeployedContract(filePath: string) {
    try {
      const deployedContractDetails = fs.readFileSync('deployments/' + filePath, { encoding: 'utf8' })
      this.deployedContracts.push(...JSON.parse(deployedContractDetails))
    } catch (error) {
      logger.error(`Failed reading contract details: ${error}`)
    }
  }

  async verifyContracts() {
    for (const contract of this.deployedContracts) {
      logger.logHeader(`Verifying ${contract.name} at ${contract.address}`, ` 🔍`)
      try {
        // https://hardhat.org/hardhat-runner/plugins/nomiclabs-hardhat-etherscan#using-programmatically
        await run('verify:verify', {
          address: contract.address,
          constructorArguments: contract.constructorArguments,
        })
        logger.success(`Verified ${contract.name} at ${contract.address}`)
      } catch (error) {
        logger.error(`Failed trying to verify ${contract.name} at ${contract.address}: ${error}`)
      }
    }
  }

  saveContractsToFile() {
    logger.log(`Saving contract details to file.`, `💾`)

    const paramsString = JSON.stringify(this.deployedContracts, null, 2) // The 'null, 2' arguments add indentation for readability
    // Write the string to a file
    const dateString = new Date().toISOString().slice(0, 10).replace(/-/g, '') // e.g. 20230330
    const networkName = network.name

    const filePath = this.baseDir + `/${dateString}-${networkName}-deployment.js`
    try {
      fs.writeFileSync(filePath, `module.exports = ${paramsString};`)
      logger.success(`Contract details saved to ${filePath}!`)
    } catch (error) {
      logger.error(`Failed saving contract details to file: ${error}`)
    }
  }
}

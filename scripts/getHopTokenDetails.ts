// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
import hre, { config, ethers } from 'hardhat'
import { multicallDynamicAbiIndexedCalls, AbiCall } from '@defifofum/multicall'
import ERC20Mock_Artifact from '../artifacts/contracts/mocks/ERC20Mock.sol/ERC20Mock.json'
import { getExplorerUrlForNetwork } from '../hardhat.config'
import { Networks } from '../hardhat'
import { writeObjectToTsFile } from './utils/files'

async function main() {
  console.dir({ task: 'Get Hop Tokens', networkName: hre.network.name })
  let currentNetwork = hre.network.name as Networks

  // TODO: Can pull this in from deploy.config
  console.log(`:warning: Currently using hardcoded Polygon hop tokens.`)
  currentNetwork = 'polygon' // TODO: hardcode for now
  const explorerUrl = getExplorerUrlForNetwork(currentNetwork)
  const tokenAddresses = [
    '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', //USDC
    '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', //WMATIC
    '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', //ETH
    '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', //BTC
    '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', //USDT
    '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', //DAI
  ]

  // setup multicall
  const callDataArray: AbiCall[][] = []
  for (const address of tokenAddresses) {
    const callDataPerToken: AbiCall[] = []
    callDataPerToken.push({
      address: address, // Address of the contract to call
      functionName: 'name', // Name of the contract function to call
      params: [], // Provide an array of args which map to arg0, arg1, argN
      abi: ERC20Mock_Artifact.abi,
    })
    callDataPerToken.push({
      address: address, // Address of the contract to call
      functionName: 'symbol', // Name of the contract function to call
      params: [], // Provide an array of args which map to arg0, arg1, argN
      abi: ERC20Mock_Artifact.abi,
    })
    callDataPerToken.push({
      address: address, // Address of the contract to call
      functionName: 'decimals', // Name of the contract function to call
      params: [], // Provide an array of args which map to arg0, arg1, argN
      abi: ERC20Mock_Artifact.abi,
    })
    callDataArray.push(callDataPerToken)
  }
  //
  const returnedData = await multicallDynamicAbiIndexedCalls(
    // rpcUrl, // RPC url. ChainId is inferred from this to point to the proper contract
    // TODO: Hardcoded for now
    `https://polygon.llamarpc.com`,
    callDataArray, // Call[]
    {
      maxCallsPerTx: 1000, // This param defaults to 1000. It sets the max batch limit per multicall call
      //   customMulticallAddress: '0x45b673A3a4bEa062e7cEF9149a0F2277B00c83b4', // Polygon address
    }
  )

  // Pull addresses out of return data
  const cleanedData = returnedData?.map((dataArray, index) => {
    return {
      address: tokenAddresses[index],
      bscscanUrl: explorerUrl(tokenAddresses[index]),
      // Values are returned as an array for each return value. We are pulling out the singular balance variable here
      name: dataArray[0].toString(),
      symbol: dataArray[1].toString(),
      decimals: dataArray[2].toString(),
    }
  })

  console.dir({ cleanedData }, { depth: null })
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  await writeObjectToTsFile(__dirname + `/hopTokens-${currentNetwork}-${date}`, 'hopTokensInfo', cleanedData)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

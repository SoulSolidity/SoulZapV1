import hre, { ethers } from 'hardhat'
import { Contract } from 'ethers'
import { writeObjectToTsFile } from './utils/files'

import { hopTokensInfo } from '../test/fixtures/token-info/hopTokens-polygon-20231114'

// Add the interface for UniswapV2 Factory and Pair
const UniswapV2FactoryABI = ['function getPair(address tokenA, address tokenB) external view returns (address pair)']
const UniswapV2PairABI = [
  'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
]

async function getPairInfo(factoryAddress: string, tokenA: string, tokenB: string): Promise<any> {
  const factoryContract = new ethers.Contract(factoryAddress, UniswapV2FactoryABI, hre.ethers.provider)
  const pairAddress = await factoryContract.getPair(tokenA, tokenB)
  if (pairAddress === ethers.constants.AddressZero) {
    return null // Pair does not exist
  }
  const pairContract = new ethers.Contract(pairAddress, UniswapV2PairABI, hre.ethers.provider)
  const reserves = await pairContract.getReserves()
  return {
    pairAddress: pairAddress,
    reserve0: reserves.reserve0.toString(),
    reserve1: reserves.reserve1.toString(),
    blockTimestampLast: reserves.blockTimestampLast,
  }
}

async function main() {
  const tokenAddresses = hopTokensInfo

  // Quickswap Polygon Factory
  const uniswapV2FactoryAddress = '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32'

  const pairPromises = []
  for (let i = 0; i < tokenAddresses.length; i++) {
    for (let j = i + 1; j < tokenAddresses.length; j++) {
      pairPromises.push(
        getPairInfo(uniswapV2FactoryAddress, tokenAddresses[i].address, tokenAddresses[j].address).then((pairInfo) => {
          if (pairInfo) {
            return {
              tokenA: tokenAddresses[i],
              tokenB: tokenAddresses[j],
              ...pairInfo,
            }
          }
          return null
        })
      )
    }
  }

  console.log('Getting pair info...')
  const pairData = (await Promise.all(pairPromises)).filter((info) => info !== null)

  console.dir({ pairData }, { depth: null })
  // Write the pairData to a file or handle as needed
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  await writeObjectToTsFile(__dirname + `/pairInfo-${hre.network.name}-${date}`, 'pairInfo', pairData)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

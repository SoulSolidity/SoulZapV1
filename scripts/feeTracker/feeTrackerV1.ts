import { ethers, network } from 'hardhat'
import axios from 'axios'
import { ZAP_ADDRESS, Project } from '../../src/constants'

import SoulZap_UniV2_Extended_V1_ABI from "../../src/ABI/SoulZap_UniV2_Extended_V1_ABI.json"
import { BigNumber } from 'ethers'
import { getEnv } from '../../hardhat/utils'
import { DeployableNetworks } from '../deploy/deploy.config'
import { ChainId } from '@defifofum/multicall/dist/config'

/**
 * // NOTE: This is an example of the default hardhat deployment approach.
 * This project takes deployments one step further by assigning each deployment
 * its own task in ../tasks/ organized by date.
 */
async function main() {
  const currentNetwork = network.name as DeployableNetworks
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  const provider = new ethers.providers.JsonRpcProvider(getEnv(currentNetwork.toUpperCase() + "_RPC_URL"));
  // Create an instance of the ethers.js contract interface
  console.log("START")

  const polygonStartBlock = "50825993"
  const polygonEndBlock = "66341325"
  const bscStartBlock = "34261484"
  const bscEndBlock = "45505914"

  //FIXME: use currentNetwork
  let chainId: ChainId = 137
  if (currentNetwork == 'polygon') {
    chainId = 137
  } else if (currentNetwork == 'bsc') {
    chainId = 56
  }
  const zapAddress = ZAP_ADDRESS[Project.APEBOND][chainId]
  if (!zapAddress) {
    throw new Error("No zap address found for chain: " + chainId)
  }

  const scanName = currentNetwork == 'polygon' ? 'polygonscan' : 'bscscan'

  let apiKey = process.env.POLYGONSCAN_API_KEY
  if (currentNetwork == 'bsc') {
    apiKey = process.env.BSCSCAN_API_KEY
  }

  const startBlock = currentNetwork == 'polygon' ? polygonStartBlock : bscStartBlock
  const endBlock = currentNetwork == 'polygon' ? polygonEndBlock : bscEndBlock
  let currentBlock = startBlock
  let stop = false;

  const txHashes = []

  while (!stop) {
    const url = `https://api.${scanName}.com/api?module=logs&action=getLogs` +
      `&fromBlock=${currentBlock}` +
      `&toBlock=${endBlock}` +
      `&address=${zapAddress}` +
      "&topic0=0x1368402a506ccc1c7ac016a83cb662991aec2765beef4d5442d8a98cad234455" +
      `&apikey=${apiKey}`

    console.log('start')
    console.log(url)
    const events = await axios.get(url)
    currentBlock = BigInt(events.data.result[events.data.result.length - 1].blockNumber).toString()

    console.log(currentBlock)
    console.log(events.data.result.length)

    if (events.data.result.length < 1000) {
      stop = true;
    }

    txHashes.push(...events.data.result.map((x: any) => { return x.transactionHash }))
  }

  console.log('txHashes.length', txHashes.length)

  const getDatabaseDataUrl = "http://localhost:4000/bills/txlookup"

  let totalDollarValue = 0;
  // Split txHashes into chunks of 100
  const chunkSize = 100;
  for (let i = 0; i < txHashes.length; i += chunkSize) {
    const chunk = txHashes.slice(i, i + chunkSize);
    const response = await axios.post(getDatabaseDataUrl, {
      txHashes: chunk
    });
    console.log(`Response for chunk ${i / chunkSize + 1}:`, response.data.length);
    for (let j = 0; j < response.data.length; j++) {
      const bill = response.data[j]
      totalDollarValue += bill.dollarValue
      if (response.data[j].dollarValue > 1000) {
        console.log('totalDollarValue', response.data[j].transactionHash, response.data[j].dollarValue)
      }
    }
  }
  console.log('TOTAL DOLLAR VALUE', totalDollarValue)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

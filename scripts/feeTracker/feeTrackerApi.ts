import { ethers, network } from 'hardhat'
import axios from 'axios'
import { ZAP_ADDRESS, Project, ZAP_ADDRESS_V2 } from '../../src/constants'

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
  const currentNetwork = network.name
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  const provider = new ethers.providers.JsonRpcProvider(getEnv(currentNetwork.toUpperCase() + "_RPC_URL"));
  // Create an instance of the ethers.js contract interface
  console.log("START")

  const polygonStartBlock = "56716704"
  const polygonEndBlock = "66370980"
  const bscStartBlock = "38523869"
  const bscEndBlock = "45527880"
  const baseStartBlock = "16043418"
  const baseEndBlock = "24688709"
  const arbitrumStartBlock = "242030371"
  const arbitrumEndBlock = "292584123"
  const ethereumStartBlock = "20590605"
  const ethereumEndBlock = "21565378"
  const lineaStartBlock = "4806246"
  const lineaEndBlock = "14247771"

  //FIXME: use currentNetwork
  let chainId: number = 137
  if (currentNetwork == 'polygon') {
    chainId = 137
  } else if (currentNetwork == 'bsc') {
    chainId = 56
  } else if (currentNetwork == 'linea') {
    chainId = 59144
  } else if (currentNetwork == 'base') {
    chainId = 8453
  } else if (currentNetwork == 'arbitrum') {
    chainId = 42161
  } else if (currentNetwork == 'ethereum') {
    chainId = 1
  }


  const zapAddress = ZAP_ADDRESS_V2[Project.APEBOND][chainId]
  if (!zapAddress) {
    throw new Error("No zap address found for chain: " + chainId)
  }

  const scanNames: { [key: string]: string } = {
    polygon: 'polygonscan.com',
    bsc: 'bscscan.com',
    base: 'basescan.org',
    arbitrum: 'arbiscan.io',
    ethereum: 'etherscan.io',
    linea: 'lineascan.build',
  };

  const scanName = scanNames[currentNetwork] || 'bscscan'; // Default to 'bscscan' if network not found

  let apiKey = process.env.POLYGONSCAN_API_KEY
  if (currentNetwork == 'bsc') {
    apiKey = process.env.BSCSCAN_API_KEY
  } else if (currentNetwork == 'base') {
    apiKey = process.env.BASESCAN_API_KEY
  } else if (currentNetwork == 'arbitrum') {
    apiKey = process.env.ARBISCAN_API_KEY
  } else if (currentNetwork == 'ethereum') {
    apiKey = process.env.ETHERSCAN_API_KEY
  } else if (currentNetwork == 'linea') {
    apiKey = process.env.LINEASCAN_API_KEY
  }

  const blockRanges = {
    polygon: { start: polygonStartBlock, end: polygonEndBlock },
    bsc: { start: bscStartBlock, end: bscEndBlock },
    base: { start: baseStartBlock, end: baseEndBlock },
    arbitrum: { start: arbitrumStartBlock, end: arbitrumEndBlock },
    ethereum: { start: ethereumStartBlock, end: ethereumEndBlock },
    linea: { start: lineaStartBlock, end: lineaEndBlock },
    // Add other networks here as needed
  };

  const { start, end } = blockRanges[currentNetwork as keyof typeof blockRanges] || { start: polygonStartBlock, end: polygonEndBlock };
  const startBlock = start;
  const endBlock = end;
  let currentBlock = startBlock
  let stop = false;

  const txHashes = []

  while (!stop) {
    const url = `https://api.${scanName}/api?module=logs&action=getLogs` +
      `&fromBlock=${currentBlock}` +
      `&toBlock=${endBlock}` +
      `&address=${zapAddress}` +
      "&topic0=0x1ba5b6ed656994657175705961138c96bd8ec133c35817fa85903f450129e0b1" +
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

    const foundTxHashes = response.data.map((bill: any) => bill.transactionHash);
    const notFoundTxHashes = chunk.filter(txHash => !foundTxHashes.includes(txHash));
    if (notFoundTxHashes.length > 0) {
      console.log('Transactions not found for:', notFoundTxHashes);
    }

    console.log(`Response for chunk ${i / chunkSize + 1}:`, response.data.length);
    for (let j = 0; j < response.data.length; j++) {
      const bill = response.data[j]
      totalDollarValue += bill.dollarValue
      if (response.data[j].dollarValue > 5000) {
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

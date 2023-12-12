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

  const apiKey = process.env.POLYGONSCAN_API_KEY

  const url = "https://api.polygonscan.com/api?module=logs&action=getLogs" +
    "&fromBlock=50825993" +
    "&toBlock=51006514" +
    `&address=${zapAddress}` +
    "&topic0=0x1368402a506ccc1c7ac016a83cb662991aec2765beef4d5442d8a98cad234455" +
    `&apikey=${apiKey}`

  const events = await axios.get(url)

  const tokens: { [key: string]: { amount: BigNumber, amountNormalized: string, tokenName: string, usdPrice: number } } = {}

  const paramTypes = [
    '(address,uint256,address,address,(address,uint8,address[],uint256,uint256),(address,uint8,address[],uint256,uint256),(address,uint8,uint256,uint256,uint256),address,uint256)',
    'address',
    'uint256',
  ];

  for (let i = 0; i < events.data.result.length; i++) {
    const element = events.data.result[i];
    const decodedParams = ethers.utils.defaultAbiCoder.decode(paramTypes, element.data);

    const tokenAddress = decodedParams[0][0];
    const tokenQuantity = decodedParams[0][1];

    if (tokens[tokenAddress]) {
      // Token already exists, add the quantity to it
      tokens[tokenAddress].amount = tokens[tokenAddress].amount.add(tokenQuantity);
    } else {
      // Token doesn't exist, initialize it with the quantity
      tokens[tokenAddress] = { amount: tokenQuantity, amountNormalized: "0", tokenName: "", usdPrice: 0 };
    }
  }

  const tokenAddressToIdMapping: { [key: string]: string } = {
    "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270": "matic-network",
    "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619": "ethereum",
    "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063": "usd-coin",
    "0xc2132D05D31c914a87C6611C10748AEb04B58e8F": "tether",
    "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174": "dai",
  }

  let coingeckoUrl = "https://api.coingecko.com/api/v3/simple/price?&vs_currencies=usd&ids=";
  const values = Object.values(tokenAddressToIdMapping);
  const concatenatedString = values.join(',');
  coingeckoUrl += concatenatedString
  const apiData = await axios.get(coingeckoUrl)

  let totalUsdAmount = 0;

  for (const key of Object.keys(tokens)) {
    const amount = tokens[key].amount;

    const erc20Contract = new ethers.Contract(key, [
      'function name() view returns (string)',
      'function decimals() view returns (uint8)'
    ], provider);

    let decimals = 0;
    let name = "Not Found";
    try {
      decimals = await erc20Contract.decimals();
      name = await erc20Contract.name();
    } catch (error) {
      console.error('Error fetching token decimals:', error);
    }

    const usdValue = apiData.data[tokenAddressToIdMapping[key]];
    if (usdValue) {
      tokens[key].usdPrice = usdValue.usd;
      totalUsdAmount += usdValue.usd * parseInt(ethers.utils.formatUnits(amount, decimals));
    } else {
      console.log("CoinGecko id not added yet")
    }
    tokens[key].tokenName = name;
    tokens[key].amountNormalized = ethers.utils.formatUnits(amount, decimals);
  }

  console.log(tokens)
  console.log("Total USD as of now: ", totalUsdAmount)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

import { ethers } from 'hardhat'
import axios from 'axios'
import { ZAP_ADDRESS, Project } from '../../src/constants'

import SoulZap_UniV2_Extended_V1_ABI from "../../src/ABI/SoulZap_UniV2_Extended_V1_ABI.json"
import { BigNumber } from 'ethers'
import { getEnv } from '../../hardhat/utils'

/**
 * // NOTE: This is an example of the default hardhat deployment approach.
 * This project takes deployments one step further by assigning each deployment
 * its own task in ../tasks/ organized by date.
 */
async function main() {
  // const currentNetwork = network.name as DeployableNetworks
  // Optionally pass in accounts to be able to use them in the deployConfig
  const accounts = await ethers.getSigners()
  const provider = new ethers.providers.JsonRpcProvider(getEnv("POLYGON_RPC_URL"));
  // Create an instance of the ethers.js contract interface
  console.log("START")

  //FIXME: use currentNetwork
  const zapAddress = ZAP_ADDRESS[Project.APEBOND][137]

  const apiKey = process.env.POLYGONSCAN_API_KEY

  const url = "https://api.polygonscan.com/api?module=logs&action=getLogs" +
    "&fromBlock=50825993" +
    "&toBlock=51006514" +
    `&address=${zapAddress}` +
    "&topic0=0x1368402a506ccc1c7ac016a83cb662991aec2765beef4d5442d8a98cad234455" +
    `&apikey=${apiKey}`

  const events = await axios.get(url)

  const tokens: { [key: string]: { amount: BigNumber, amountNormalized: string, tokenName: string } } = {}

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
      tokens[tokenAddress] = { amount: tokenQuantity, amountNormalized: "0", tokenName: "" };
    }
  }

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

    // console.log(key, amount, 'Decimals:', decimals);
    tokens[key].tokenName = name;
    tokens[key].amountNormalized = ethers.utils.formatUnits(amount, decimals);
  }

  console.log(tokens)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})

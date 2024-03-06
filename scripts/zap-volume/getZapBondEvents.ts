import { MoralisService } from './MoralisService'
import { DeployableNetworks } from '../deploy/deploy.config'

const ZapBondAbi = {
  anonymous: false,
  inputs: [
    {
      components: [
        {
          internalType: 'contract IERC20',
          name: 'tokenIn',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'amountIn',
          type: 'uint256',
        },
        {
          internalType: 'address',
          name: 'token0',
          type: 'address',
        },
        {
          internalType: 'address',
          name: 'token1',
          type: 'address',
        },
        {
          components: [
            {
              internalType: 'address',
              name: 'swapRouter',
              type: 'address',
            },
            {
              internalType: 'enum ISoulZap_UniV2.SwapType',
              name: 'swapType',
              type: 'uint8',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountOutMin',
              type: 'uint256',
            },
          ],
          internalType: 'struct ISoulZap_UniV2.SwapPath',
          name: 'path0',
          type: 'tuple',
        },
        {
          components: [
            {
              internalType: 'address',
              name: 'swapRouter',
              type: 'address',
            },
            {
              internalType: 'enum ISoulZap_UniV2.SwapType',
              name: 'swapType',
              type: 'uint8',
            },
            {
              internalType: 'address[]',
              name: 'path',
              type: 'address[]',
            },
            {
              internalType: 'uint256',
              name: 'amountOut',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountOutMin',
              type: 'uint256',
            },
          ],
          internalType: 'struct ISoulZap_UniV2.SwapPath',
          name: 'path1',
          type: 'tuple',
        },
        {
          components: [
            {
              internalType: 'address',
              name: 'lpRouter',
              type: 'address',
            },
            {
              internalType: 'enum ISoulZap_UniV2.LPType',
              name: 'lpType',
              type: 'uint8',
            },
            {
              internalType: 'uint256',
              name: 'amountAMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'amountBMin',
              type: 'uint256',
            },
            {
              internalType: 'uint256',
              name: 'lpAmount',
              type: 'uint256',
            },
          ],
          internalType: 'struct ISoulZap_UniV2.LiquidityPath',
          name: 'liquidityPath',
          type: 'tuple',
        },
        {
          internalType: 'address',
          name: 'to',
          type: 'address',
        },
        {
          internalType: 'uint256',
          name: 'deadline',
          type: 'uint256',
        },
      ],
      indexed: false,
      internalType: 'struct ISoulZap_UniV2.ZapParams',
      name: 'zapParams',
      type: 'tuple',
    },
    {
      indexed: false,
      internalType: 'contract ICustomBillRefillable',
      name: 'bond',
      type: 'address',
    },
    {
      indexed: false,
      internalType: 'uint256',
      name: 'maxPrice',
      type: 'uint256',
    },
  ],
  name: 'ZapBond',
  type: 'event',
}

export const getZapBondEvents = async (
  network: DeployableNetworks,
  zapBondAddress: string,
  fromBlock: number,
  toBlock: number
) => {
  const moralis = MoralisService.getInstance()

  // ZapBond Event
  const topic = '0x1368402a506ccc1c7ac016a83cb662991aec2765beef4d5442d8a98cad234455'

  type ZapBondEventData = {
    zapParams: string
    bond: string
    maxPrice: string
  }

  const zapBondEvents = await moralis.getAllContractEvents<ZapBondEventData>({
    address: zapBondAddress,
    chain: moralis.getEvmChain(network),
    topic,
    abi: ZapBondAbi,
    fromBlock,
    toBlock,
  })

  /*
      struct ZapParams {
        IERC20 tokenIn;
        uint256 amountIn;
        address token0;
        address token1;
        SwapPath path0;
        SwapPath path1;
        LiquidityPath liquidityPath;
        address to;
        uint256 deadline;
    }
  */

  // TODO: commented code
  // console.dir({ sampleEvent: zapBondEvents[0], eventLength: zapBondEvents.length }, { depth: null })
  // await writeObjectToTsFile(__dirname + `/output/ZapBondEvents-Polygon`, `zapBondEvents`, zapBondEvents)

  return zapBondEvents
}

/*
// example:
getZapBondEvents('polygon', '0x133141571DC83783d7c05138af8aA9cc2189c1A7', 50825993, 53197954)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
*/

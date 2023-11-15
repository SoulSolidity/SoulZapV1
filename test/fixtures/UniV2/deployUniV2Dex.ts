import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { HardhatEthersHelpers } from 'hardhat/types'
import { logger } from '../../../hardhat/utils/logger'
// Setup DEX Contracts
// https://etherscan.io/address/0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f#code

import UniswapV2Factory_Artifact from '../../../artifacts-external/uniswap-v2/UniswapV2Factory.json'
import UniswapV2Router_Artifact from '../../../artifacts-external/uniswap-v2/UniswapV2Router02.json'
import UniswapV2Pair_Artifact from '../../../artifacts-external/uniswap-v2/UniswapV2Pair.json'

// Setup Token Contracts
import ERC20Mock_Artifact from '../../../artifacts/contracts/mocks/ERC20Mock.sol/ERC20Mock.json'
import WNativeMock_Artifact from '../../../artifacts/contracts/mocks/WNativeMock.sol/WNativeMock.json'

// Import Contract Types
import {
  UniswapV2Factory__factory,
  UniswapV2Router02__factory,
  UniswapV2Pair,
  UniswapV2Pair__factory,
  ERC20Mock,
  ERC20Mock__factory,
  WNativeMock__factory,
  UniswapV2Router02,
  WNativeMock,
  UniswapV2Factory,
} from '../../../typechain-types'
import { BigNumber, BigNumberish, utils } from 'ethers'

export const ether = (value: string) => utils.parseUnits(value, 'ether')

/**
 * This function is used to get the contract factories for UniswapV2.
 * It uses the HardhatEthersHelpers to get the contract factories.
 *
 * @param _ethers - The HardhatEthersHelpers instance
 * @returns An object containing the contract factories for UniswapV2Factory, UniswapV2Router, UniswapV2Pair, ERC20Mock, and WNative
 */
async function getUniswapV2ContractFactories(_ethers: HardhatEthersHelpers) {
  const UniswapV2Factory = (await _ethers.getContractFactory(
    UniswapV2Factory_Artifact.abi,
    UniswapV2Factory_Artifact.bytecode
  )) as UniswapV2Factory__factory

  const UniswapV2Router = (await _ethers.getContractFactory(
    UniswapV2Router_Artifact.abi,
    UniswapV2Router_Artifact.bytecode
  )) as UniswapV2Router02__factory

  const UniswapV2Pair = (await _ethers.getContractFactory(
    UniswapV2Pair_Artifact.abi,
    UniswapV2Pair_Artifact.bytecode
  )) as UniswapV2Pair__factory

  const ERC20Mock = (await _ethers.getContractFactory(
    ERC20Mock_Artifact.abi,
    ERC20Mock_Artifact.bytecode
  )) as ERC20Mock__factory

  const WNative = (await _ethers.getContractFactory(
    WNativeMock_Artifact.abi,
    WNativeMock_Artifact.bytecode
  )) as WNativeMock__factory

  return {
    UniswapV2Factory,
    UniswapV2Router,
    UniswapV2Pair,
    ERC20Mock,
    WNative,
  }
}

/**
 * Deploys the Uniswap V2 DEX contracts.
 *
 * @param _ethers - HardhatEthersHelpers instance
 * @param owner - The owner of the contracts
 * @param feeTo - The address to which the fees will be sent
 * @returns An object containing the deployed UniswapV2Factory, UniswapV2Router, and WNative contracts
 */
export async function deployUniV2Dex(
  _ethers: HardhatEthersHelpers,
  [owner, feeTo]: [SignerWithAddress, SignerWithAddress]
) {
  logger.log(`Deploying UniV2Dex`, '📈')
  const { UniswapV2Factory, UniswapV2Router, WNative } = await getUniswapV2ContractFactories(_ethers)

  // Setup DEX factory
  const dexFactory = (await UniswapV2Factory.connect(owner).deploy(feeTo.address)) as UniswapV2Factory
  // Setup pairs
  const mockWBNB = (await WNative.connect(owner).deploy()) as WNativeMock
  const dexRouter = (await UniswapV2Router.connect(owner).deploy(
    dexFactory.address,
    mockWBNB.address
  )) as UniswapV2Router02

  return {
    dexFactory,
    dexRouter,
    mockWBNB,
  }
}

export interface TokenLpInfo {
  token0: ERC20Mock
  token0Amount: BigNumberish
  token1: ERC20Mock
  token1Amount: BigNumberish
}

export async function createTokenLpInfo(
  token0: ERC20Mock,
  token1: ERC20Mock,
  decimalAmountPerToken: BigNumber
): Promise<TokenLpInfo> {
  const token0Decimals = await token0.decimals()
  const token1Decimals = await token1.decimals()
  return {
    token0,
    token0Amount: decimalAmountPerToken.mul(BigNumber.from(10).pow(token0Decimals)),
    token1,
    token1Amount: decimalAmountPerToken.mul(BigNumber.from(10).pow(token1Decimals)),
  }
}

/**
 * Creates liquidity pairs on Uniswap V2.
 *
 * @param _ethers - HardhatEthersHelpers instance
 * @param tokensOwner - The owner of the tokens
 * @param toAddress - The address to which the liquidity tokens will be sent
 * @param dexRouter - The Uniswap V2 router contract instance
 * @param pairsToCreate - An array of TokenLpInfo objects, each containing the two tokens and their amounts to be added to the liquidity pool
 * @returns An array of UniswapV2Pair contract instances representing the created liquidity pairs
 */
export async function createLPPairs(
  _ethers: HardhatEthersHelpers,
  [tokensOwner]: [SignerWithAddress],
  dexRouter: UniswapV2Router02,
  pairsToCreate: TokenLpInfo[]
) {
  const { UniswapV2Factory, UniswapV2Pair } = await getUniswapV2ContractFactories(_ethers)
  const dexFactory = await UniswapV2Factory.attach(await dexRouter.factory())

  const createdDexPairs: UniswapV2Pair[] = []
  for (let index = 0; index < pairsToCreate.length; index++) {
    const pairInfo = pairsToCreate[index]
    const { token0, token0Amount, token1, token1Amount } = pairInfo
    await token0.connect(tokensOwner).approve(dexRouter.address, token0Amount)
    await token1.connect(tokensOwner).approve(dexRouter.address, token1Amount)

    await dexRouter.connect(tokensOwner).addLiquidity(
      token0.address, // tokenA
      token1.address, // tokenB
      token0Amount, // amountAMin
      token1Amount, // amountBMin
      0, // amountTokenMin
      0, // amountETHMin
      tokensOwner.address, // to
      '9999999999' // deadline
    )
    const pairCreated = await UniswapV2Pair.attach(await dexFactory.getPair(token0.address, token1.address))
    // NOTE: Log
    // logger.log(`pairCreated: ${pairCreated.address}`, '🍐')
    createdDexPairs.push(pairCreated)
  }

  // NOTE: Alternative way to create pairs directly through UniswapV2Factory
  // Create an initial pair
  // await dexFactory.createPair(mockWBNB.address, mockToken.address);
  // const pairCreated = await UniswapV2Pair.at(await dexFactory.allPairs(index));

  // // Obtain LP Tokens
  // await mockWBNB.transfer(pairCreated.address, WBNB_BASE_BALANCE);
  // await mockToken.transfer(pairCreated.address, TOKEN_BASE_BALANCE);
  // await pairCreated.mint(alice);

  return createdDexPairs
}

export async function deployUniV2Dex_WithMockTokens(
  _ethers: HardhatEthersHelpers,
  [owner, feeTo, toAddress]: [SignerWithAddress, SignerWithAddress, SignerWithAddress],
  numPairs: number,
  { TOKEN_BASE_BALANCE = ether('1000000'), WBNB_BASE_BALANCE = ether('1') } = {}
) {
  const { UniswapV2Pair, ERC20Mock } = await getUniswapV2ContractFactories(_ethers)
  const { dexFactory, dexRouter, mockWBNB } = await deployUniV2Dex(_ethers, [owner, feeTo])

  const mockTokens: ERC20Mock[] = []
  const dexPairs: UniswapV2Pair[] = []
  for (let index = 0; index < numPairs; index++) {
    // Mint pair token
    const mockToken = (await ERC20Mock.connect(owner).deploy(
      `Mock Token ${index}`,
      `MOCK-${index}`,
      18,
      TOKEN_BASE_BALANCE
    )) as ERC20Mock

    await mockToken.connect(owner).approve(dexRouter.address, TOKEN_BASE_BALANCE)

    await dexRouter.connect(owner).addLiquidityETH(
      mockToken.address, // token
      TOKEN_BASE_BALANCE, // amountTokenDesired
      0, // amountTokenMin
      0, // amountETHMin
      toAddress.address, // to
      '9999999999', // deadline
      {
        value: WBNB_BASE_BALANCE, // Adding ETH liquidity which gets exchanged for WETH
      }
    )

    const pairCreated = await UniswapV2Pair.attach(await dexFactory.getPair(mockToken.address, mockWBNB.address))

    // NOTE: Alternative way to create pairs directly through UniswapV2Factory
    // Create an initial pair
    // await dexFactory.createPair(mockWBNB.address, mockToken.address);
    // const pairCreated = await UniswapV2Pair.at(await dexFactory.allPairs(index));

    // // Obtain LP Tokens
    // await mockWBNB.transfer(pairCreated.address, WBNB_BASE_BALANCE);
    // await mockToken.transfer(pairCreated.address, TOKEN_BASE_BALANCE);
    // await pairCreated.mint(alice);

    dexPairs.push(pairCreated)
    mockTokens.push(mockToken)
  }

  return {
    dexFactory,
    dexRouter,
    mockWBNB,
    mockTokens,
    dexPairs,
  }
}

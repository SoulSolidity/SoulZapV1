import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, BigNumberish } from 'ethers'
import { deployMockTokens } from './deployTokens'

// TODO: Currently only pulling in a single file
// NOTE: Created from from ./scripts/getHopeTokenDetails.ts
import { hopTokensPairInfo } from './token-info/hopTokenPairInfo-polygon-20231121'
import { hopTokensInfo, inputTokensInfo, outputTokensInfo } from './token-info/hopTokens-polygon-20231114'
import { createLPPairs, createTokenLpInfo_Decimal, deployUniV2Dex, TokenLpInfo } from './UniV2/deployUniV2Dex'
import { ERC20Mock, UniswapV2Router02 } from '../../typechain-types'
import { logger } from '../../hardhat/utils'
import { ether } from '../utils'

// TODO: Add native pairs
export async function deployDexAndHopTokens(
  _ethers: typeof ethers,
  [owner, feeTo, tokenOwner]: [SignerWithAddress, SignerWithAddress, SignerWithAddress],
  { initialSupply = BigNumber.from(1e12) } = {}
) {
  const uniV2Dex = await deployUniV2Dex(_ethers, [owner, feeTo])

  const totalAvailableSupply = initialSupply.div(2)
  // TODO: Only dividing by 1000 for now. Edit: not anymore because not enough native for mockWBNB pairs. adding 50 per token per lp now
  const availableSupplyPerToken = totalAvailableSupply.div(1e10)

  // --------------------------------------------------
  // NOTE: Pairing all hop tokens together
  // --------------------------------------------------
  // Hop tokens
  const hopTokens = await deployMockTokens(_ethers, [tokenOwner], hopTokensInfo, { initialSupply })
  const hopTokensMapping: { [symbol: string]: ERC20Mock } = {}
  await Promise.all(
    hopTokens.map(async (hopToken) => {
      const symbol = await hopToken.symbol()
      logger.log(`Deployed ${symbol} hop token`, '🍺')
      hopTokensMapping[symbol.toLowerCase()] = hopToken
    })
  )

  //Add wNative to mock tokens
  hopTokens.push(uniV2Dex.mockWBNB as any) // NOTE: any type because of type mismatch between ERC20Mock and WNativeMock
  await uniV2Dex.mockWBNB.deposit({ value: ether(9_000_000) })
  await uniV2Dex.mockWBNB.transfer(tokenOwner.address, ether(9_000_000))

  /*
  // NOTE: This is the original code that creates pairs between hop tokens
  // Create pairs between hop tokens
  const hopTokenLpInfos: TokenLpInfo[] = []
  for (let i = 0; i < hopTokens.length; i++) {
    // This nested loop prevents the creation of duplicate pairs: j = i + 1
    for (let j = i + 1; j < hopTokens.length; j++) {
      if (i === j) continue
      const tokenLpInfo = await createTokenLpInfo(hopTokens[i], hopTokens[j], availableSupplyPerToken)
      hopTokenLpInfos.push(tokenLpInfo)
    }
  }
  logger.log(`Creating hop token lp pairs`, '🍐')
  const hopLpPairs = await createLPPairs(_ethers, [tokenOwner], uniV2Dex.dexRouter, hopTokenLpInfos)
  */

  // --------------------------------------------------
  // NOTE: Pairing and adding liquidity based on sorted hopTokensPairInfo
  // --------------------------------------------------
  const hopTokenLpInfos: TokenLpInfo[] = []
  for (const pairInfo of hopTokensPairInfo) {
    // Find the mock tokens that correspond to the real tokens in the pair info
    const tokenA = hopTokensMapping[pairInfo.tokenA.symbol.toLowerCase()]
    const tokenB = hopTokensMapping[pairInfo.tokenB.symbol.toLowerCase()]

    if (!tokenA || !tokenB) {
      logger.log(`Token not found for pair: ${pairInfo.tokenA.symbol}-${pairInfo.tokenB.symbol}`, '⚠️')
      continue
    }

    // Sort the tokens to determine token0 and token1
    const [token0, token1] = [tokenA, tokenB].sort((a, b) =>
      a.address.toLowerCase().localeCompare(b.address.toLowerCase())
    )
    const reserve0 =
      token0.address === tokenA.address ? BigNumber.from(pairInfo.reserve0) : BigNumber.from(pairInfo.reserve1)
    const reserve1 =
      token1.address === tokenB.address ? BigNumber.from(pairInfo.reserve1) : BigNumber.from(pairInfo.reserve0)

    await token0.connect(tokenOwner).mint(reserve0)
    await token1.connect(tokenOwner).mint(reserve1)

    // Create the liquidity pair info
    const tokenLpInfo: TokenLpInfo = {
      token0,
      token0Amount: reserve0,
      token1,
      token1Amount: reserve1,
    }
    hopTokenLpInfos.push(tokenLpInfo)
  }

  logger.log(`Adding liquidity to hop token pairs`, '💧')
  const hopLpPairs = await createLPPairs(_ethers, [tokenOwner], uniV2Dex.dexRouter, hopTokenLpInfos)

  // --------------------------------------------------
  // NOTE: Pairing input tokens one by one with hop tokens ascending
  // --------------------------------------------------
  // Input tokens
  const inputTokens = await deployMockTokens(_ethers, [tokenOwner], inputTokensInfo, { initialSupply })
  // Create pairs with hop tokens and input tokens
  const inputTokenLpInfos: TokenLpInfo[] = []
  for (let i = 0; i < inputTokens.length; i++) {
    const tokenLpInfo = await createTokenLpInfo_Decimal(
      hopTokens[i % hopTokens.length],
      inputTokens[i],
      availableSupplyPerToken
    )
    inputTokenLpInfos.push(tokenLpInfo)
  }
  logger.log(`Creating input token -> hop token lp pairs`, '🍐')
  const inputLpPairs = await createLPPairs(_ethers, [tokenOwner], uniV2Dex.dexRouter, inputTokenLpInfos)

  // --------------------------------------------------
  // NOTE: Pairing output tokens one by one with hop tokens descending
  // --------------------------------------------------
  // Output tokens
  const outputTokens = await deployMockTokens(_ethers, [tokenOwner], outputTokensInfo, { initialSupply })
  // Create pairs with hop tokens and output tokens
  const outputTokenLpInfos: TokenLpInfo[] = []
  for (let i = outputTokens.length - 1; i >= 0; i--) {
    const tokenLpInfo = await createTokenLpInfo_Decimal(
      hopTokens[i % hopTokens.length],
      outputTokens[i],
      availableSupplyPerToken
    )
    outputTokenLpInfos.push(tokenLpInfo)
  }
  logger.log(`Creating output token -> hop token lp pairs`, '🍐')
  const outputLpPairs = await createLPPairs(_ethers, [tokenOwner], uniV2Dex.dexRouter, outputTokenLpInfos)

  return {
    uniV2Dex,
    baseTokens: {
      hopTokens,
      inputTokens,
      outputTokens,
    },
    pairs: {
      hopLpPairs,
      inputLpPairs,
      outputLpPairs,
    },
  }
}

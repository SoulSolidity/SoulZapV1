import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, BigNumberish } from 'ethers'
import { deployMockTokens } from './deployTokens'

// TODO: Currently only pulling in a single file
// NOTE: Created from from ./scripts/getHopeTokenDetails.ts
import { hopTokensInfo, inputTokensInfo, outputTokensInfo } from './hopTokens/hopTokens-polygon-20231114'
import { createLPPairs, createTokenLpInfo, deployUniV2Dex, TokenLpInfo } from './UniV2/deployUniV2Dex'
import { ERC20Mock, UniswapV2Router02 } from '../../typechain-types'
import { logger } from '../../hardhat/utils'

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
  //Add wNative to mock tokens
  hopTokens.push(uniV2Dex.mockWBNB)
  await uniV2Dex.mockWBNB.deposit({ value: '900000000000000000000' })
  await uniV2Dex.mockWBNB.transfer(tokenOwner.address, '900000000000000000000')

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

  // --------------------------------------------------
  // NOTE: Pairing input tokens one by one with hop tokens ascending
  // --------------------------------------------------
  // Input tokens
  const inputTokens = await deployMockTokens(_ethers, [tokenOwner], inputTokensInfo, { initialSupply })
  // Create pairs with hop tokens and input tokens
  const inputTokenLpInfos: TokenLpInfo[] = []
  for (let i = 0; i < inputTokens.length; i++) {
    const tokenLpInfo = await createTokenLpInfo(
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
    const tokenLpInfo = await createTokenLpInfo(
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

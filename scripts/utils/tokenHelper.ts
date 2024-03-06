import { ethers } from 'hardhat'
import { getErrorMessage } from './getErrorMessage'
import { logger } from '../../hardhat/utils'

// Creates a closure to cache the decimals values for token addresses
export const getDecimalsForTokenAddress = (() => {
  const tokenDecimalsCache: { [address: string]: number } = {}

  return async (tokenAddress: string): Promise<number> => {
    if (tokenDecimalsCache[tokenAddress]) {
      return tokenDecimalsCache[tokenAddress]
    }

    try {
      const tokenContract = new ethers.Contract(
        tokenAddress,
        [
          // ERC-20 Decimals ABI
          'function decimals() view returns (uint8)',
        ],
        ethers.provider
      )

      const decimals = await tokenContract.decimals()
      tokenDecimalsCache[tokenAddress] = decimals
      return decimals
    } catch (error) {
      logger.warn(`getDecimalsForToken:: Error pulling token decimals: ${getErrorMessage(error)}`)
      // Optionally return 18 if there is an error
      return 18
    }
  }
})()

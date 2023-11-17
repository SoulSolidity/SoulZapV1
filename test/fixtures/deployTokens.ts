import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { BigNumber, BigNumberish } from 'ethers'
import { ERC20Mock } from '../../typechain-types'

interface TokenInfo {
  address?: string
  bscscanUrl?: string
  name: string
  symbol: string
  decimals: string
}

/**
 * @typedef {Object} TokenInfo
 * @property {string} [address] - The address of the token.
 * @property {string} [bscscanUrl] - The BscScan URL of the token.
 * @property {string} name - The name of the token.
 * @property {string} symbol - The symbol of the token.
 * @property {string} decimals - The decimals of the token.
 */

export async function deployMockTokens(
  _ethers: typeof ethers,
  [toAddress]: [SignerWithAddress],
  mockTokenInfo: TokenInfo[],
  { initialSupply = BigNumber.from(1e12) } = {}
) {
  const ERC20Mock = await _ethers.getContractFactory('ERC20Mock')
  const mockTokens: ERC20Mock[] = []

  // NOTE: Only using name, symbol, and decimals from TokenInfo
  for (const token of mockTokenInfo) {
    const tokenInitialSupply = initialSupply.mul(BigNumber.from(10).pow(token.decimals))
    const mockToken = (await ERC20Mock.deploy(
      `Mock ${token.name}`,
      `Mock-${token.symbol}`,
      token.decimals,
      // Raising the initial supply to the power of the token decimals
      tokenInitialSupply
    )) as ERC20Mock
    if (toAddress) {
      await mockToken.transfer(toAddress.address, tokenInitialSupply)
    }
    mockTokens.push(mockToken)
  }

  return mockTokens
}

/*
// Usage example for deployMockTokens function
// Import the required modules and the function
import { ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { deployMockTokens } from './deployTokens'

async function main() {
  // Define the mock token information
  const mockTokenInfo = [
    {
      name: 'Test Token',
      symbol: 'TT',
      decimals: '18'
    }
  ]

  // Define the options
  const options = {
    holder: <SignerWithAddress>, // replace with the holder's address
    initialSupply: ethers.BigNumber.from('1000000000000000000') // 1 token
  }

  // Deploy the mock tokens
  const mockTokens = await deployMockTokens(ethers, mockTokenInfo, options)

  // Log the deployed mock tokens
  console.log('Deployed mock tokens:', mockTokens)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
*/

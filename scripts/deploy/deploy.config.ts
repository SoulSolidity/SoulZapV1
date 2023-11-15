import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Networks } from '../../hardhat'
import path from 'path'

// Define a base directory for deployments
export const DEPLOYMENTS_BASE_DIR = path.resolve(__dirname, '../../deployments')

/**
 * Get the deploy config for a given network
 * @param network
 * @returns
 */
export const getDeployConfig = (network: DeployableNetworks, signers?: SignerWithAddress[]): DeploymentVariables => {
  const config = deployableNetworkConfig[network]
  if (!config) {
    throw new Error(`No deploy config for network ${network}`)
  }
  return config(signers)
}

/**
 * Extract networks as deployments are needed
 *
 * NOTE: Add networks as needed
 */
export type DeployableNetworks = Extract<Networks, 'bsc' | 'polygon' | 'bscTestnet'>

/**
 * Deployment Variables for each network
 *
 * NOTE: Update variables as needed
 */
interface DeploymentVariables {
  proxyAdminAddress: string
  adminAddress: string | SignerWithAddress
  admin: string
  wNative: string
  dexInfo: Partial<Record<Dex, { factory: string; router: string; hopTokens: string[] }>>
  feeCollector: string
  protocolFee: number
  maxFee: number
  soulFee?: string
}

export const enum Dex {
  ApeBond = 'ApeBond',
  PancakeSwap = 'PancakeSwap',
  QuickSwap = 'QuickSwap',
}

const deployableNetworkConfig: Record<DeployableNetworks, (signers?: SignerWithAddress[]) => DeploymentVariables> = {
  bsc: (signers?: SignerWithAddress[]) => {
    return {
      proxyAdminAddress: '0x',
      // NOTE: Example of extracting signers
      adminAddress: signers?.[0] || '0x',
      admin: '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
      wNative: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      dexInfo: {
        [Dex.ApeBond]: {
          factory: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
          router: '0xcF0feBd3f17CEf5b47b0cD257aCf6025c5BFf3b7',
          hopTokens: [
            '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', //USDC
            '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', //WBNB
            '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', //ETH
            '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', //BUSD
            '0x55d398326f99059fF775485246999027B3197955', //USDT
            '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', //DAI
          ],
        },
        [Dex.PancakeSwap]: {
          factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
          router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
          hopTokens: [
            '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', //USDC
            '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', //WBNB
            '0x2170Ed0880ac9A755fd29B2688956BD959F933F8', //ETH
            '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', //BUSD
            '0x55d398326f99059fF775485246999027B3197955', //USDT
            '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3', //DAI
          ],
        },
      },
      feeCollector: '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
      protocolFee: 300,
      maxFee: 1000,
      soulFee: '0x',
    }
  },
  polygon: (signers?: SignerWithAddress[]) => {
    return {
      proxyAdminAddress: '0x',
      // NOTE: Example of extracting signers
      adminAddress: signers?.[0] || '0x',
      admin: '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
      wNative: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      dexInfo: {
        [Dex.ApeBond]: {
          factory: '0xCf083Be4164828f00cAE704EC15a36D711491284',
          router: '0xC0788A3aD43d79aa53B09c2EaCc313A787d1d607',
          hopTokens: [
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', //USDC
            '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', //WMATIC
            '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', //ETH
            '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', //BTC
            '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', //USDT
            '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', //DAI
          ],
        },
        [Dex.QuickSwap]: {
          factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
          router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',
          hopTokens: [
            '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', //USDC
            '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', //WMATIC
            '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619', //ETH
            '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6', //BTC
            '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', //USDT
            '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', //DAI
          ],
        },
      },
      feeCollector: '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
      protocolFee: 300,
      maxFee: 1000,
      soulFee: '0x',
    }
  },
  bscTestnet: (signers?: SignerWithAddress[]) => {
    return {
      proxyAdminAddress: '0x',
      adminAddress: signers?.[0] || '0x',
      admin: '',
      wNative: '0x',
      dexInfo: {
        ApeBond: {
          factory: '',
          router: '',
          hopTokens: [],
        },
      },
      feeCollector: '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2',
      protocolFee: 300,
      maxFee: 1000,
      soulFee: '0x',
    }
  },
}

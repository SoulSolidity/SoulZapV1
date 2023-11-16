export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
// export const MSG_SENDER = "0x0000000000000000000000000000000000000001";
// export const ADDRESS_THIS = "0x0000000000000000000000000000000000000002";
export const NATIVE_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

export enum SwapType {
  V2 = 0,
}

export enum LPType {
  V2 = 0,
}

export enum ChainId {
  MAINNET = 1,
  BNB = 56,
  POLYGON = 137,
  ARBITRUM_ONE = 42161,
}

export enum Project {
  APEBOND = 'ApeBond',
}

export enum DEX {
  APEBOND = 'ApeBond',
  QUICKSWAP = 'QuickSwap',
}

export const ZAP_LENS_ADDRESS: Record<Project, Partial<Record<ChainId, Partial<Record<DEX, string>>>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: {
      [DEX.APEBOND]: '0xf95A84d25Af7575110489566d85827e28108c80a',
      [DEX.QUICKSWAP]: '0x',
    },
    [ChainId.POLYGON]: {
      [DEX.APEBOND]: '0x',
      [DEX.QUICKSWAP]: '0x',
    },
  },
}

export const ZAP_ADDRESS: Record<Project, Partial<Record<ChainId, string>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: '0x253D007aa92d069eBc85c5b23868A2971C7Ac063',
    [ChainId.POLYGON]: '0x99815d143d486980653280e8da6f06507f4ccb0b',
  },
}

export const WRAPPED_NATIVE: Record<ChainId, string> = {
  [ChainId.MAINNET]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [ChainId.BNB]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  [ChainId.POLYGON]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  [ChainId.ARBITRUM_ONE]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
}

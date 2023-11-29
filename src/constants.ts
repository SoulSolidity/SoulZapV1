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
      [DEX.APEBOND]: '0x',
      [DEX.QUICKSWAP]: '0x',
    },
    [ChainId.POLYGON]: {
      [DEX.APEBOND]: '0x3d54621a42C1Bf0eF6Bc523CE479e4b465CaB986',
      [DEX.QUICKSWAP]: '0x5548B8E04E022B69C00d9c968a1dB58Fa36ACe9d',
    },
  },
}

export const ZAP_ADDRESS: Record<Project, Partial<Record<ChainId, string>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: '0x', //"0x253D007aa92d069eBc85c5b23868A2971C7Ac063",
    [ChainId.POLYGON]: '0xDD20343AeB210f5b7Ec9Db7B3727F8D0a8070c42',
  },
}

export const WRAPPED_NATIVE: Record<ChainId, string> = {
  [ChainId.MAINNET]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [ChainId.BNB]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  [ChainId.POLYGON]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  [ChainId.ARBITRUM_ONE]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
}

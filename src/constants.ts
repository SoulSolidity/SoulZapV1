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
  ETHEREUM = 1,
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
  PANCAKESWAP = 'PancakeSwap',
}

/// -----------------------------------------------------------------------
/// ZAP
/// -----------------------------------------------------------------------
export const ZAP_LENS_ADDRESS: Record<Project, Partial<Record<ChainId, Partial<Record<DEX, string>>>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: {
      [DEX.APEBOND]: '0xFeeb321973D3b5F6C475A90D86c5C2d197A27881',
      [DEX.PANCAKESWAP]: '0x61B428C02CB1058F9AAf2bFeACCB00333c50E0A1',
    },
    [ChainId.POLYGON]: {
      [DEX.APEBOND]: '0x52B95673D84A30fe8375dC7A088d2F612d13F7A5',
      [DEX.QUICKSWAP]: '0xb20889d91a4E1f409B08412B55eF079186Aa2b96',
    },
  },
}

export const ZAP_ADDRESS: Record<Project, Partial<Record<ChainId, string>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: '0xA400A9a00bd1b7ca90BbC5F8DB0d3d723da8D72c',
    [ChainId.POLYGON]: '0x133141571DC83783d7c05138af8aA9cc2189c1A7',
  },
}

/// -----------------------------------------------------------------------
/// WRAPPED NATIVE
/// -----------------------------------------------------------------------
export const WRAPPED_NATIVE: Record<ChainId, string> = {
  [ChainId.ETHEREUM]: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  [ChainId.BNB]: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
  [ChainId.POLYGON]: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  [ChainId.ARBITRUM_ONE]: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
}

/// -----------------------------------------------------------------------
/// Price Getter
/// -----------------------------------------------------------------------
export enum PriceGetterProtocol {
  Both = 1,
  V2 = 2,
  V3 = 3,
  Algebra = 4,
  Gamma = 5,
}

export const PRICE_GETTER_ADDRESS: Record<ChainId, string> = {
  [ChainId.ETHEREUM]: '0x',
  [ChainId.ARBITRUM_ONE]: '0x',
  [ChainId.BNB]: '0x945b9E730f35046c5bf24117478D651999377831',
  [ChainId.POLYGON]: '0x241ebA867Bee0Dd50a8Ca54732A6C05815C50Cc5',
}

export const FACTORIES: Record<DEX, Partial<Record<ChainId, Partial<Record<PriceGetterProtocol, string>>>>> = {
  [DEX.APEBOND]: {
    [ChainId.BNB]: {
      [PriceGetterProtocol.V2]: '0x0841BD0B734E4F5853f0dD8d7Ea041c241fb0Da6',
    },
    [ChainId.POLYGON]: {
      [PriceGetterProtocol.V2]: '0xCf083Be4164828f00cAE704EC15a36D711491284',
    },
  },
  [DEX.QUICKSWAP]: {
    [ChainId.POLYGON]: {
      [PriceGetterProtocol.V2]: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32',
    },
  },
  [DEX.PANCAKESWAP]: {
    [ChainId.BNB]: {
      [PriceGetterProtocol.V2]: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
    },
  }
}

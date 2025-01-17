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
  LINEA = 59144,
  BASE = 8453,
}

export enum Project {
  APEBOND = 'ApeBond',
}

export enum DEX {
  APEBOND = 'ApeBond',
  QUICKSWAP = 'QuickSwap',
  LYNEX = 'LYNEX',
}

/// -----------------------------------------------------------------------
/// ZAP
/// -----------------------------------------------------------------------
export const ZAP_LENS_ADDRESS: Record<Project, Partial<Record<ChainId, Partial<Record<DEX, string>>>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: {
      [DEX.APEBOND]: '0x',
      [DEX.QUICKSWAP]: '0x',
    },
    [ChainId.POLYGON]: {
      [DEX.APEBOND]: '0x52B95673D84A30fe8375dC7A088d2F612d13F7A5',
      [DEX.QUICKSWAP]: '0xb20889d91a4E1f409B08412B55eF079186Aa2b96',
    },
    [ChainId.LINEA]: {
      [DEX.LYNEX]: '0x9D78A48fe7cBB61EDFB89658e7411C4980407d47',
    },
  },
}

export const ZAP_ADDRESS: Record<Project, Partial<Record<ChainId, string>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: "0xA400A9a00bd1b7ca90BbC5F8DB0d3d723da8D72c",
    [ChainId.POLYGON]: '0x133141571DC83783d7c05138af8aA9cc2189c1A7',
    [ChainId.LINEA]: '0x44073255A58F8606200F91c49ca3Ebf4FD3222eb',
  },
}

export const ZAP_ADDRESS_V2: Record<Project, Partial<Record<number, string>>> = {
  [Project.APEBOND]: {
    [ChainId.BNB]: "0xc84E853c26d38C4018f5c3868D67f61e3828c401",
    [ChainId.POLYGON]: "0x1Af000A786599CBD772869a124795BEB751F4996",
    [ChainId.LINEA]: "0xc208B5446DA6a2179D96Dd38EB714E8F1BaeF74D",
    [ChainId.ETHEREUM]: "0xCA80E9DaA3CE851416003Fbf4ab7B970563cf0cc",
    [ChainId.BASE]: "0xFA40b551980aF88FD2929Ab41f57D98ee13A6354",
    [ChainId.ARBITRUM_ONE]: "0x7AD6115A646D225A9486DC557f17021935b99147",
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
  [ChainId.LINEA]: '0xe5D7C2a44FfDDf6b295A15c148167daaAf5Cf34f',
  [ChainId.BASE]: '0x4200000000000000000000000000000000000006',
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
  [ChainId.LINEA]: '0x7AC1F230a436b0a5b49284CBa1d1BCFc5065E91d',
  [ChainId.BASE]: '0x',
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
  [DEX.LYNEX]: {
  }
}

// Currently using this to test out the decimals of different tokens.
// The address and bscscanUrl are not used in the tests, but the names, symbols, and decimals are.
export const hopTokensInfo = [
  {
    address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    bscscanUrl: 'https://polygonscan.com/address/0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    name: 'USD Coin (PoS)',
    symbol: 'USDC',
    decimals: '6',
  },
  {
    address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    bscscanUrl: 'https://polygonscan.com/address/0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
    name: 'Wrapped Matic',
    symbol: 'WMATIC',
    decimals: '18',
  },
  {
    address: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    bscscanUrl: 'https://polygonscan.com/address/0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: '18',
  },
  {
    address: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    bscscanUrl: 'https://polygonscan.com/address/0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    name: '(PoS) Wrapped BTC',
    symbol: 'WBTC',
    decimals: '8',
  },
  {
    address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    bscscanUrl: 'https://polygonscan.com/address/0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    name: '(PoS) Tether USD',
    symbol: 'USDT',
    decimals: '6',
  },
  {
    address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    bscscanUrl: 'https://polygonscan.com/address/0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    name: '(PoS) Dai Stablecoin',
    symbol: 'DAI',
    decimals: '18',
  },
]

// NOTE: Test Tokens
export const inputTokensInfo = [
  {
    address: '0x',
    bscscanUrl: '',
    name: 'TEST INPUT 18 Decimals',
    symbol: 'TI-1',
    decimals: '18',
  },
  {
    address: '0x',
    bscscanUrl: '',
    name: 'TEST INPUT 6 Decimals',
    symbol: 'TI-2',
    decimals: '6',
  },
]

// NOTE: Test Tokens
export const outputTokensInfo = [
  {
    address: '0x',
    bscscanUrl: '',
    name: 'TEST OUTPUT 18 Decimals',
    symbol: 'TO-1',
    decimals: '18',
  },
  {
    address: '0x',
    bscscanUrl: '',
    name: 'TEST OUTPUT 6 Decimals',
    symbol: 'TO-2',
    decimals: '6',
  },
]

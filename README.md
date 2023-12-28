# SoulZapV1

[![lint & test](https://github.com/soulsolidity/soulzapv1/actions/workflows/lint-test.yml/badge.svg)](https://github.com/soulsolidity/soulzapv1/actions/workflows/lint-test.yml)
[![Docs](https://img.shields.io/badge/docs-%F0%9F%93%84-yellow)](./docs/)

# Contracts

### ⚡ Zap

### 👁️ Router Lens

# SDK

### 📖 Partner Integration documentation

Welcome to the integration guide for the SoulZap SDK, your gateway to single tx token swaps, liquidity provision, and bond purchases. This document will walk you through the process of integrating the SoulZap SDK into your project.

1. **Install the SDK**

   Install the SoulZap SDK in your project:

   ```bash
   npm install @soulsolidity/soulzap-v1
   ```

   or

   ```bash
   yarn add @soulsolidity/soulzap-v1
   ```

2. **Initialize the SDK**

   Import the required modules and set up the SDK with your own config:

   ```ts
   import { SoulZap_UniV2_ApeBond, ChainId, DEX, NATIVE_ADDRESS } from '@soulsolidity/soulzap-v1'

   const rpc = getEnv('POLYGON_RPC_URL')
   const provider = new ethers.providers.JsonRpcProvider(rpc)
   const wallet = ethers.Wallet.fromMnemonic(getEnv('TESTNET_MNEMONIC'))
   const signer = wallet.connect(provider)

   const soulZap = new SoulZap_UniV2_ApeBond(ChainId.POLYGON, signer)
   ```

3. **Getting the data for the zap**

   ```ts
   const dex = DEX.QUICKSWAP
   const amount = '10000000000000000'
   const BOND_ADDRESS = '0x4F256deDd156fB1Aa6e485E92FeCeB7bc15EBFcA'
   const LP_ADDRESS = '0x304e57c752E854E9A233Ae82fcC42F7568b81180'
   const recipient = '0x551DcB2Cf6155CBc4d1a8151576EEC43f3aE5559'

   //max 3% price impact or it returns an error (for low liquidity or large zaps)
   const allowedPriceImpactPercentage = 3

   const zapDataBond = await soulZap.getZapDataBondNative(
     dex,
     amount,
     BOND_ADDRESS,
     allowedPriceImpactPercentage,
     recipient
   )
   ```

   Handle errors:

   ```ts
   if (!zapDataBond.success) {
     console.error(zapDataBond.error)
     return
   }
   ```

   Retrieve data for UI display:

   ```ts
   zapDataBond.priceImpactPercentages
   zapDataBond.zapParams.liquidityPath.minAmountLP0
   zapDataBond.zapParams.path0.amountOutMin
   ```

   Perform the actual token bonding:

   ```ts
   //Actual zap tx different options
   await soulZap.zapBond(zapDataBond)
   await soulZap.zapBond(zapDataBond.zapParams, zapDataBond.zapParamsBonds, zapDataBond.feeSwapPath)

   //Or own custom variation
   const soulZapContract = soulZap.getZapContract()
   await signer.sendTransaction({
     to: soulZapContract.address, // Address of the contract
     data: zapDataBond.encodedTx,
     value: zapDataBond.zapParams.amountIn,
   })
   ```

### ⚡ Zap Options

**Token Swapping**

Native swap

```ts
const swapData = await soulZap.getSwapDataNative(dex, amount, LP_ADDRESS, allowedPriceImpactPercentage, recipient)
await soulZap.swap(swapData)
```

ERC20 token swap

With TOKEN_ADDRESS = `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` it's the same as a Native swap

```ts
const swapData = await soulZap.getSwapData(
  dex,
  TOKEN_ADDRESS,
  amount,
  LP_ADDRESS,
  allowedPriceImpactPercentage,
  recipient
)
await soulZap.swap(swapData)
```

**Liquidity Provision Zap**

Native zap to LP

```ts
const zapData = await soulZap.getZapDataNative(dex, amount, LP_ADDRESS, allowedPriceImpactPercentage, recipient)
await soulZap.zap(zapData)
```

ERC20 zap to LP

With TOKEN_ADDRESS = `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` it's the same as a Native zap

```ts
const zapData = await soulZap.getZapData(
  dex,
  TOKEN_ADDRESS,
  amount,
  LP_ADDRESS,
  allowedPriceImpactPercentage,
  recipient
)
await soulZap.zap(zapData)
```

**Bond Zap**

Native zap to bond

```ts
const zapDataBond = await soulZap.getZapDataBondNative(
  dex,
  amount,
  BOND_ADDRESS,
  allowedPriceImpactPercentage,
  recipient
)
await soulZap.zapBond(zapDataBond)
```

ERC20 zap to bond

With TOKEN_ADDRESS = `0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE` it's the same as a Native zap

```ts
const zapDataBond = await soulZap.getZapDataBond(
  dex,
  TOKEN_ADDRESS,
  amount,
  BOND_ADDRESS,
  allowedPriceImpactPercentage,
  recipient
)
await soulZap.zapBond(zapDataBond)
```

# Scripts

### 🚀 Deploy scripts

These scripts deploy the smart contracts to chain

**Config**

- Config in the `deploy.config.ts` file.
- For lens routing there is still a hardcoded `const currentDexInfo = dexInfo.ApeBond` that needs to be changed to the right dexInfo

**Deploy zap contract** <br />
`npx hardhat run scripts/deploy/deployZap.ts --network <network>`

**Deploy lens routing contract** <br />
`npx hardhat run scripts/deploy/deployRouting.ts --network <network>`

### 💸 Fee Tracker (WIP)

[![FeeTracker.ts](https://img.shields.io/badge/scripts/feeTracker/FeeTracker.ts-%F0%9F%93%84-blue)](https://github.com/SoulSolidity/SoulZapV1/blob/feat/fee-tracking/scripts/feeTracker/feeTracker.ts)

The script queries and analyze token volume data from a zap contract address on the specified chain. The script fetches logs from the PolygonScan API, decodes relevant parameters, and aggregates token volumes.

**Config** <br />
The scripts has hardcoded values right now.

- Add a working RPC
- Add the right zapAddress or fetch it from the SDK
- Add a working etherscan API KEY
- Change fromBlock and toBlock as required

**Run script:** <br /> `npx hardhat run scripts/feeTracker/feeTracker.ts`

import { network } from 'hardhat'
import { findStartBlockNumbersForYear } from '../utils/blocksHelper'
import { getZapBondEvents } from './getZapBondEvents'
import { DeployableNetworks } from '../deploy/deploy.config'
import { getUsdPriceForTokenContractOnNetwork } from './coinGeckoService'
import { logger } from 'ethers'
import { getErrorMessage } from '../utils/getErrorMessage'
import { BigNumberFloat } from '../../test/utils/bignumber/BigNumberFloat'
import { getDecimalsForTokenAddress } from '../utils/tokenHelper'

// Function to calculate the USD value of the input token
function calculateUSDValue(
  tokenDecimals: number,
  tokenInputAmount: string, // Token input amount as a string to handle decimals
  usdPricePerToken: string // USD price per token as a string
) {
  // Create BigNumberFloat instances for token amount and USD price
  const tokenAmountBNF = BigNumberFloat.from(tokenInputAmount)
  const usdPriceBNF = BigNumberFloat.from(usdPricePerToken)

  // Adjust the token amount by its decimals
  const tokenAmountAdjusted = tokenAmountBNF.div(Math.pow(10, tokenDecimals))

  // Calculate the USD value
  const usdValueBNF = tokenAmountAdjusted.mul(usdPriceBNF.toString())

  // FIXME: log
  console.dir({
    tokenInputAmount,
    usdPricePerToken,
    tokenAmountBNF: tokenAmountBNF.toString(),
    usdPriceBNF: usdPriceBNF.toString(),
    tokenAmountAdjusted: tokenAmountAdjusted.toString(),
    usdValueBNF: usdValueBNF.toString(),
  })

  return { usdValueBNF, tokenAmountAdjusted: tokenAmountAdjusted.toString() }
}

async function main() {
  // Step 1: Find the starting block of each month for the current chain
  const yearBlockNumbers = await findStartBlockNumbersForYear(2024)
  //   FIXME: log
  console.dir({ yearBlockNumbers }) // { yearBlockNumbers: { '1': 51860733, '2': 53029524, '3': 54122909 } }

  // Step 2: Iterate through the months and pull the zap events for each month
  const months = Object.keys(yearBlockNumbers).map((month) => parseInt(month))
  for (let i = 0; i < months.length - 1; i++) {
    const month = months[i]
    const startBlock = yearBlockNumbers[month]
    const endBlock = yearBlockNumbers[months[i + 1]]
    const zapEventsForMonth = await getZapBondEvents(
      network.name as DeployableNetworks,
      // TODO: Hardcoded polygon address
      '0x133141571DC83783d7c05138af8aA9cc2189c1A7',
      startBlock,
      endBlock
    )

    const zapEventPricingPromises = []

    // Step 3: Iterate through the events and calculate the USD value of the input token + amount
    for (let zapEvent of zapEventsForMonth) {
      const currentPromise = new Promise(async (resolve, reject) => {
        try {
          const timestamp = zapEvent.block_timestamp
          const [tokenInputAddress, tokenInputAmount] = zapEvent.data.zapParams.split(',')
          // FIXME: log
          console.dir({ tokenInputAddress, tokenInputAmount, zapParams: zapEvent.data.zapParams }, { depth: 4 })
          // Step 4: Pull the USD price from CoinGecko for the input token at the time of the transaction
          const usdPriceAtTimeOfTx = await getUsdPriceForTokenContractOnNetwork(
            network.name as DeployableNetworks,
            tokenInputAddress,
            timestamp
          )
          // Calculate the USD value of the input token
          const tokenDecimals = await getDecimalsForTokenAddress(tokenInputAddress)
          // Uses custom BigNumberFloat library to calculate decimal values
          const { usdValueBNF, tokenAmountAdjusted } = calculateUSDValue(
            tokenDecimals,
            tokenInputAmount,
            String(usdPriceAtTimeOfTx)
          )

          resolve({
            timestamp,
            usdValueBNF,
            usdInputValue: usdValueBNF.toString(),
            usdPriceAtTimeOfTx,
            tokenAmountAdjusted,
            tokenInputAmountRaw: tokenInputAmount,
            tokenDecimals: tokenDecimals.toString(),
            rawEvent: zapEvent,
          })
        } catch (error) {
          logger.warn(`Error processing event: ${getErrorMessage(error)}`)
          reject(error)
        }
      })

      zapEventPricingPromises.push(currentPromise)

      // FIXME: just testing this first part
      break // This will exit the loop early
    }

    const zapEventPricing = await Promise.all(zapEventPricingPromises)
    // FIXME: log
    console.dir({ zapEventPricing }, { depth: 4 })

    // FIXME: just testing this first part
    break // This will exit the loop early
  }

  // TODO: Filter duplicate tx-hashes

  // TODO: Add to object
  // TODO: Create block explorer link

  // TODO: Sum total volume for the month

  // TODO: Save output object to json file
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

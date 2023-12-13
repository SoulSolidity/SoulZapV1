export { ZERO_ADDRESS, NATIVE_ADDRESS, DEX, Project, ChainId } from './constants'
export {
  LiquidityPath,
  SwapPath,
  ZapParams,
  ZapParams_Ext_Bonds,
  ZapDataResult,
  ZapDataBondResult,
  SwapDataResult,
  SwapParams,
} from './types'
export * from './ApeBond/SoulZap_UniV2'
export * from './ApeBond/SoulZap_ApeBond'

// Logger
import { logger } from '../hardhat/utils'
if (process.env.DEVELOPMENT !== 'true') {
  // If not in development, silence the logger
  logger.setSilent(true)
}
export { logger }

// TODO: Unused?
// import { loadConfig }

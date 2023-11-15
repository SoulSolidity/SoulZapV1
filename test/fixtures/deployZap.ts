import { ethers } from 'hardhat'
import { getDeployConfig, DeployableNetworks } from '../../scripts/deploy/deploy.config'
import { ZERO_ADDRESS } from '../../src'
import { ChainId } from '../../src/constants'
export async function deployZapFixture(_ethers: typeof ethers, chain: DeployableNetworks) {
    // Contracts are deployed using the first signer/account by default
    const { wNative, admin, dexInfo, feeCollector, protocolFee, proxyAdminAddress, maxFee } = getDeployConfig(chain)
    const [owner, otherAccount] = await _ethers.getSigners()

    const SoulAccessManager = await _ethers.getContractFactory('SoulAccessManager')
    const soulAccessManager = await SoulAccessManager.deploy(admin)
    // TODO: Currently using mock contract
    const SoulFeeManager = await _ethers.getContractFactory('SoulFeeManagerMock')
    const soulFeeManager = await SoulFeeManager.deploy()
    const SoulZap_UniV2_Extended_V1 = await _ethers.getContractFactory('SoulZap_UniV2_Extended_V1')
    
    const soulZap = await SoulZap_UniV2_Extended_V1.deploy(
        soulAccessManager.address, wNative, soulFeeManager.address, 0
    )

    return { soulAccessManager, soulFeeManager, soulZap }
}

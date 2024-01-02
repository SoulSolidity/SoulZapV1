import { ethers } from 'hardhat'
import { TransparentUpgradeableProxy__factory, SoulFeeDistributor } from '../../typechain-types'
import { ADDRESS_DEAD, SnapshotCall, getContractGetterSnapshot } from '../utils'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

// TODO: It would be awesome to be able to reuse these fixtures in the deployment scripts.
export async function deploySoulFeeDistributor(
  _ethers: typeof ethers,
  [admin, proxyAdmin]: [SignerWithAddress, SignerWithAddress | undefined],
  initializeArgs: Parameters<SoulFeeDistributor['initialize']>
) {
  const proxyAdminAddress = proxyAdmin?.address || ADDRESS_DEAD
  // Deploy the implementation contract
  const soulFeeDistributorImplementation = await (await ethers.getContractFactory('SoulFeeDistributor')).deploy()
  // Deploy the proxy contract
  const TransparentUpgradeableProxy = (await ethers.getContractFactory(
    'TransparentUpgradeableProxy'
  )) as TransparentUpgradeableProxy__factory
  const proxy = await TransparentUpgradeableProxy.deploy(
    soulFeeDistributorImplementation.address,
    proxyAdminAddress,
    '0x'
  )
  // Cast the proxy to the interface of the implementation to call initialize
  const soulFeeDistributor = (await ethers.getContractAt('SoulFeeDistributor', proxy.address)) as SoulFeeDistributor
  await soulFeeDistributor.initialize(...initializeArgs)

  const soulFeeDistributorSnapshot = async () => {
    const totalBeneficiaries = (await soulFeeDistributor.getTotalBeneficiaries()).toNumber()
    const snapshotCalls: (string | SnapshotCall)[] = []

    for (let i = 0; i < totalBeneficiaries; i++) {
      snapshotCalls.push({
        functionName: 'getBeneficiaryAtIndex',
        functionArgs: [i],
      })
    }

    return await getContractGetterSnapshot(soulFeeDistributor, snapshotCalls)
  }

  return { soulFeeDistributor, soulFeeDistributorImplementation, soulFeeDistributorSnapshot }
}

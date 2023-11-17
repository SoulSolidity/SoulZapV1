module.exports = [
  {
    "name": "SoulFee",
    "address": "0x0780927B5D935094eabF0159097c110c4Cb000B3",
    "encodedConstructorArgs": "0x0000000000000000000000005c7c7246bd8a18df5f6ee422f9f8ccdf716a6ad2000000000000000000000000000000000000000000000000000000000000012c00000000000000000000000000000000000000000000000000000000000003e8",
    "constructorArguments": [
      "0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2",
      300,
      1000
    ],
    "verificationCommand": "npx hardhat verify --network polygon 0x0780927B5D935094eabF0159097c110c4Cb000B3 '0x5c7C7246bD8a18DF5f6Ee422f9F8CCDF716A6aD2' '300' '1000'"
  },
  {
    "name": "SoulZapFullV1",
    "address": "0x99815d143D486980653280E8dA6F06507F4CcB0B",
    "encodedConstructorArgs": "0x0000000000000000000000000d500b1d8e8ef31e21c99d1db9a6444d3adf12700000000000000000000000000780927b5d935094eabf0159097c110c4cb000b3",
    "constructorArguments": [
      "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270",
      "0x0780927B5D935094eabF0159097c110c4Cb000B3"
    ],
    "verificationCommand": "npx hardhat verify --network polygon 0x99815d143D486980653280E8dA6F06507F4CcB0B '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270' '0x0780927B5D935094eabF0159097c110c4Cb000B3'"
  }
];
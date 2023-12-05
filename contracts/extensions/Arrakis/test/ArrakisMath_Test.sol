// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.19;

contract ArrakisMath_Test {
    function getSwapRatio_0(
        uint256 _inputAmount,
        uint256 _underlying0,
        uint256 _underlying1,
        uint256 _weightedPrice0,
        uint256 _weightedPrice1
    ) public pure returns (uint256 amount0, uint256 amount1) {
        uint256 percentage0 = (((_underlying0 * 1e18) / (_underlying0 + _underlying1)) * _weightedPrice0) /
            (_weightedPrice0 + _weightedPrice1);

        uint256 percentage1 = (((_underlying1 * 1e18) / (_underlying0 + _underlying1)) * _weightedPrice1) /
            (_weightedPrice0 + _weightedPrice1);

        amount0 = (((percentage0 * 1e18) / (percentage0 + percentage1)) * _inputAmount) / 1e18;

        amount1 = _inputAmount - amount0;
    }

    function getSwapRatio_1(
        uint256 _inputAmount,
        uint256 _underlying0,
        uint256 _underlying1,
        uint256 _weightedPrice0,
        uint256 _weightedPrice1
    ) public pure returns (uint256 amount0, uint256 amount1) {
        // Calculate the total weighted value
        uint256 totalWeightedValue = _underlying0 * _weightedPrice0 + _underlying1 * _weightedPrice1;
        // Ensure totalWeightedValue is not zero to prevent division by zero
        if(totalWeightedValue == 0) {
            return (0, 0);
        }

        // Calculate percentages
        uint256 percentage0 = (_underlying0 * _weightedPrice0 * 1e18) / totalWeightedValue;
        uint256 percentage1 = (_underlying1 * _weightedPrice1 * 1e18) / totalWeightedValue;
        uint256 totalPercentage = percentage0 + percentage1;
        // Ensure totalPercentage is not zero to prevent division by zero
        if(totalPercentage == 0) {
            return (0, 0);
        }
        // Calculate amounts
        amount0 = (percentage0 * _inputAmount) / totalPercentage;
        amount1 = _inputAmount - amount0;
    }
}

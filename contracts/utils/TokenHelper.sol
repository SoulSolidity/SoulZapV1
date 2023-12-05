// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.19;

/*
 ██████╗ █████╗ ██╗   ██╗██╗        ██████╗ █████╗ ██╗     ██╗██████╗ ██╗████████╗██╗   ██╗
██╔════╝██╔══██╗██║   ██║██║       ██╔════╝██╔══██╗██║     ██║██╔══██╗██║╚══██╔══╝╚██╗ ██╔╝
╚█████╗ ██║  ██║██║   ██║██║       ╚█████╗ ██║  ██║██║     ██║██║  ██║██║   ██║    ╚████╔╝ 
 ╚═══██╗██║  ██║██║   ██║██║        ╚═══██╗██║  ██║██║     ██║██║  ██║██║   ██║     ╚██╔╝  
██████╔╝╚█████╔╝╚██████╔╝███████╗  ██████╔╝╚█████╔╝███████╗██║██████╔╝██║   ██║      ██║   
╚═════╝  ╚════╝  ╚═════╝ ╚══════╝  ╚═════╝  ╚════╝ ╚══════╝╚═╝╚═════╝ ╚═╝   ╚═╝      ╚═╝   

 * Twitter: https://twitter.com/SoulSolidity
 *  GitHub: https://github.com/SoulSolidity
 *     Web: https://SoulSolidity.com
 */


import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

library TokenHelper {

    /**
     * @notice Retrieves the number of decimal places used by a given token.
     * @dev If the token supports the IERC20Metadata interface, it will return the token's decimals.
     * If the token does not support the interface, it will default to 18 decimals.
     * @param token The address of the token for which to retrieve the decimal places.
     * @return decimals The number of decimal places used by the token.
     */
    function getTokenDecimals(address token) internal view returns (uint8 decimals) {
        try IERC20Metadata(token).decimals() returns (uint8 dec) {
            decimals = dec;
        } catch {
            decimals = 18;
        }
    }

    /**
     * @notice Adjusts the amount of tokens to a normalized 18 decimal format.
     * @dev Tokens with less than 18 decimals will loose precision to 18 decimals.
     * @param amount The original amount of tokens with `decimals` decimal places.
     * @param decimals The number of decimal places the token uses.
     * @return The adjusted amount of tokens, normalized to 18 decimal places.
     */
    function normalizeTokenAmount(uint256 amount, uint8 decimals) internal pure returns (uint256) {
        // If the token has more than 18 decimals, we divide the amount to normalize to 18 decimals.
        if (decimals > 18) {
            // Dividing by 10 ** (decimals - 18) to reduce the number of decimals.
            return amount / 10 ** (decimals - 18);
        } else if (decimals < 18) {
            // Multiplying by 10 ** (18 - decimals) to increase the number of decimals.
            return amount * 10 ** (18 - decimals);
        } else {
            // If the token already has 18 decimals, return the amount unchanged.
            return amount;
        }
    }
}
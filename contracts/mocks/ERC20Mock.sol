// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ERC20Mock is ERC20 {
    uint8 private immutable __decimals;

    constructor(string memory _name, string memory _symbol, uint8 _decimals, uint256 _amount) ERC20(_name, _symbol) {
        __decimals = _decimals;
        _mint(msg.sender, _amount);
    }

    function decimals() public view override returns (uint8) {
        return __decimals;
    }
}

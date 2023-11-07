// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.15;

/*
   ▄████████  ▄██████▄  ███    █▄   ▄█                                      
  ███    ███ ███    ███ ███    ███ ███                                      
  ███    █▀  ███    ███ ███    ███ ███                                      
  ███        ███    ███ ███    ███ ███                                      
  ██████████ ███    ███ ███    ███ ███                                      
         ███ ███    ███ ███    ███ ███                                      
   ▄█    ███ ███    ███ ███    ███ ███     ▄                                
 ▄████████▀   ▀██████▀  ████████▀  █████████                                

   ▄████████  ▄██████▄   ▄█        ▄█  ████████▄   ▄█      ███      ▄██   █▄  
  ███    ███ ███    ███ ███       ███  ███   ▀███ ███ ▀███████████▄ ███   ███
  ███    █▀  ███    ███ ███       ███  ███    ███ ███   ▀▀▀███▀▀▀▀▀ ███▄▄▄███
  ███        ███    ███ ███       ███  ███    ███ ███      ███      ▀▀▀▀▀▀███
  ██████████ ███    ███ ███       ███  ███    ███ ███      ███      ▄██   ███
         ███ ███    ███ ███       ███  ███    ███ ███      ███      ███   ███
   ▄█    ███ ███    ███ ███     ▄ ███  ███   ▄███ ███      ███      ███   ███
 ▄████████▀   ▀██████▀  █████████ █▀   ████████▀  █▀      ▄███       ▀█████▀    

 * App:             https:// TODO
 * Medium:          https:// TODO
 * Twitter:         https:// TODO
 * Discord:         https:// TODO
 * Telegram:        https:// TODO 
 * Announcements:   https:// TODO
 * GitHub:          https:// TODO
 */

import "./SoulZap_Lens.sol";
import "./extensions/ApeBond/ApeBond_Lens.sol";
import "../SoulFee.sol";

contract SoulZapFullV1_Lens is SoulZap_Lens, ApeBond_Lens {
    constructor(
        address _wnative,
        IUniswapV2Factory[] memory _factories,
        IUniswapV2Router02[] memory _routers,
        address[] memory _hopTokens,
        SoulFee _soulFee
    ) SoulZap_Lens(_wnative, _factories, _routers, _hopTokens, _soulFee) {}
}

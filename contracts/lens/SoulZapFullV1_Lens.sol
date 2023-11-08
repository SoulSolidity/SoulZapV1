// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.20;

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

import {SoulZap_UniV2_Lens} from "./SoulZap_Lens.sol";
import {IUniswapV2Router02} from "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

// import "./extensions/ApeBond/ApeBond_Lens.sol";

// TODO: Naming to reflect UniV2
contract SoulZapFullV1_Lens is SoulZap_UniV2_Lens /*, ApeBond_Lens*/ {
    constructor(
        address _wnative,
        IUniswapV2Router02[] memory _routers,
        address[] memory _hopTokens,
        address _accessManager
    ) SoulZap_UniV2_Lens(_wnative, _routers, _hopTokens, _accessManager) {}
}

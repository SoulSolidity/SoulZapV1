// SPDX-License-Identifier: BUSL-1.1
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

import {SoulZap_UniV2} from "./SoulZap.sol";
import {SoulZapExt_ApeBond} from "./extensions/ApeBond/ApeBond.sol";
import {SoulZapFullV1_Lens} from "./lens/SoulZapFullV1_Lens.sol";
import {IWETH} from "./lib/IWETH.sol";
import {ISoulFeeManager} from "./fee-manager/ISoulFeeManager.sol";

// TODO: Need to rename this contract SoulZap_UniV1
contract SoulZap_UniV2_Extended_V1 is SoulZap_UniV2, SoulZapExt_ApeBond {
    constructor(
        IWETH _wnative,
        // TODO: _feeCollector wasn't being passed?
        // address _feeCollector,
        ISoulFeeManager _soulFeeManager,
        // TODO: IAccessManager
        address _accessManager
    ) SoulZap_UniV2(_wnative, _soulFeeManager, _accessManager) SoulZapExt_ApeBond() {}
}

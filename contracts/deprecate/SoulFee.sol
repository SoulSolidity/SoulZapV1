// // SPDX-License-Identifier: GPL-3.0-only
// pragma solidity 0.8.23;

// /*
//    ▄████████  ▄██████▄  ███    █▄   ▄█                                      
//   ███    ███ ███    ███ ███    ███ ███                                      
//   ███    █▀  ███    ███ ███    ███ ███                                      
//   ███        ███    ███ ███    ███ ███                                      
//   ██████████ ███    ███ ███    ███ ███                                      
//          ███ ███    ███ ███    ███ ███                                      
//    ▄█    ███ ███    ███ ███    ███ ███     ▄                                
//  ▄████████▀   ▀██████▀  ████████▀  █████████                                
                                                                           
//    ▄████████  ▄██████▄   ▄█        ▄█  ████████▄   ▄█      ███      ▄██   █▄  
//   ███    ███ ███    ███ ███       ███  ███   ▀███ ███ ▀███████████▄ ███   ███
//   ███    █▀  ███    ███ ███       ███  ███    ███ ███   ▀▀▀███▀▀▀▀▀ ███▄▄▄███
//   ███        ███    ███ ███       ███  ███    ███ ███      ███      ▀▀▀▀▀▀███
//   ██████████ ███    ███ ███       ███  ███    ███ ███      ███      ▄██   ███
//          ███ ███    ███ ███       ███  ███    ███ ███      ███      ███   ███
//    ▄█    ███ ███    ███ ███     ▄ ███  ███   ▄███ ███      ███      ███   ███
//  ▄████████▀   ▀██████▀  █████████ █▀   ████████▀  █▀      ▄███       ▀█████▀    

//  * App:             https:// TO DO
//  * Medium:          https:// TO DO
//  * Twitter:         https:// TO DO
//  * Discord:         https:// TO DO
//  * Telegram:        https:// TO DO 
//  * Announcements:   https:// TO DO
//  * GitHub:          https:// TO DO
//  */

// // FIX ME: Remove ownable
// // import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// import {AccessManaged} from "@openzeppelin/contracts/access/manager/AccessManaged.sol";

// /**
//  * @title SoulFee
//  * @dev A contract for managing project fees with ownership control.
//  */
// contract SoulFee is AccessManaged {
//     // TO DO: Only use CAPs for constants/immutables
//     string[] public PROJECTS;
//     // TO DO: Only use CAPs for constants/immutables
//     mapping(string => uint256) public FEE_PERCENTAGE; // Denominator of 10_000
//     uint256 public immutable MAX_FEE;
//     address public feeCollector;

//     event UpdatedFee(string project, uint256 fee);
//     event UpdatedFeeCollector(address feeCollector);
//     event MissingProject(string project);

//     /**
//      * @dev Constructor to initialize the contract and add an initial default project.
//      */
//     constructor(
//         address _feeCollector,
//         uint256 _defaultFee,
//         uint256 _maxFee,
//         address _accessManager
//     ) AccessManaged(_accessManager) {
//         require(_defaultFee <= _maxFee, "SoulFee: Fee too high");
//         feeCollector = _feeCollector;
//         MAX_FEE = _maxFee;
//         addProject("default", _defaultFee);
//         addProject("zap", _defaultFee);
//     }

//     /**
//      * @dev Get the fee percentage for a specific project.
//      * @param project The name of the project.
//      * @return fee The fee percentage for the project.
//      */
//     function getFee(string memory project) public view returns (uint256 fee) {
//         if (!projectExists(project)) {
//             // TO DO: Can't do this on view function unfortunately. Other ideas?
//             // emit MissingProject(project);
//             return FEE_PERCENTAGE["default"];
//         }
//         return FEE_PERCENTAGE[project];
//     }

//     /**
//      * @dev Get the fee percentage for a project by its index.
//      * @param projectId The index of the project in the PROJECTS array.
//      * @return fee The fee percentage for the project.
//      */
//     function getFee(uint256 projectId) public view returns (uint256 fee) {
//         return FEE_PERCENTAGE[PROJECTS[projectId]];
//     }

//     function getFeeCollector() public view returns (address) {
//         return feeCollector;
//     }

//     /**
//      * @dev Check if a project with a given name exists.
//      * @param project The name of the project.
//      * @return exists True if the project exists, false otherwise.
//      */
//     function projectExists(string memory project) public view returns (bool exists) {
//         for (uint256 i = 0; i < PROJECTS.length; i++) {
//             if (compareStrings(PROJECTS[i], project)) {
//                 return true;
//             }
//         }
//         return false;
//     }

//     /**
//      * @dev Compare two strings for equality.
//      * @param a The first string.
//      * @param b The second string.
//      * @return True if the strings are equal, false otherwise.
//      */
//     function compareStrings(string memory a, string memory b) internal pure returns (bool) {
//         return keccak256(abi.encodePacked(a)) == keccak256(abi.encodePacked(b));
//     }

//     /**
//      * @dev Add a new project with its associated fee percentage.
//      * @param project The name of the project.
//      * @param fee The fee percentage (out of 10,000).
//      */
//     function addProject(string memory project, uint256 fee) public restricted {
//         require(fee <= MAX_FEE, "SoulFee: Fee too high");
//         PROJECTS.push(project);
//         FEE_PERCENTAGE[project] = fee;
//         emit UpdatedFee(project, fee);
//     }

//     /**
//      * @dev Remove a project and its associated fee percentage. This is a destructive operation.
//                 Other contracts might depend on the data removed. Move with caution.
//      * @param project The name of the project to be removed.
//      */
//     function removeProject(string memory project) public restricted {
//         require(!compareStrings(project, "default"), "SoulFee: can't remove default project fee");
//         for (uint256 i = 0; i < PROJECTS.length; i++) {
//             if (compareStrings(PROJECTS[i], project)) {
//                 if (i != PROJECTS.length - 1) {
//                     // Swap the element to remove with the last element
//                     PROJECTS[i] = PROJECTS[PROJECTS.length - 1];
//                 }
//                 // Shorten the array by one
//                 PROJECTS.pop();
//                 break;
//             }
//         }
//         FEE_PERCENTAGE[project] = 0;
//     }

//     /**
//      * @dev Set the fee percentage for an existing project.
//      * @param project The name of the project.
//      * @param fee The new fee percentage (out of 10,000).
//      */
//     function setFee(string memory project, uint256 fee) public restricted {
//         require(fee <= MAX_FEE, "SoulFee: Fee too high");
//         require(projectExists(project), "SoulFee: project not found");
//         FEE_PERCENTAGE[project] = fee;
//         emit UpdatedFee(project, fee);
//     }

//     function setFeeCollector(address _feeCollector) public restricted {
//         feeCollector = _feeCollector;
//         emit UpdatedFeeCollector(_feeCollector);
//     }
// }

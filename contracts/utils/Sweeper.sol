// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.19;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import {SoulAccessManaged} from "../access/SoulAccessManaged.sol";

/**
 * @dev Sweep any ERC20 token.
 * Sometimes people accidentally send tokens to a contract without any way to retrieve them.
 * This contract makes sure any erc20 tokens can be removed from the contract.
 */
abstract contract Sweeper is SoulAccessManaged {
    bytes32 private immutable sweeperAdminRole;

    struct NFT {
        IERC721 nftAddress;
        uint256[] ids;
    }
    mapping(address => bool) public lockedTokens;
    bool public allowNativeSweep;

    event SweepWithdrawToken(address indexed receiver, IERC20 indexed token, uint256 balance);

    event SweepWithdrawNFTs(address indexed receiver, NFT[] indexed nfts);

    event SweepWithdrawNative(address indexed receiver, uint256 balance);

    constructor(address[] memory _lockedTokens, bool _allowNativeSweep, bytes32 _sweeperAdminRole) {
        _lockTokens(_lockedTokens);
        allowNativeSweep = _allowNativeSweep;
        sweeperAdminRole = _sweeperAdminRole;
    }

    /**
     * @dev Transfers erc20 tokens to owner
     * Only owner of contract can call this function
     */
    function sweepTokens(IERC20[] memory tokens, address to) external onlyAccessRegistryRole(sweeperAdminRole) {
        NFT[] memory empty;
        sweepTokensAndNFTs(tokens, empty, to);
    }

    /**
     * @dev Transfers NFT to owner
     * Only owner of contract can call this function
     */
    function sweepNFTs(NFT[] memory nfts, address to) external onlyAccessRegistryRole(sweeperAdminRole) {
        IERC20[] memory empty;
        sweepTokensAndNFTs(empty, nfts, to);
    }

    /**
     * @dev Transfers ERC20 and NFT to owner
     * Only owner of contract can call this function
     */
    function sweepTokensAndNFTs(
        IERC20[] memory tokens,
        NFT[] memory nfts,
        address to
    ) public onlyAccessRegistryRole(sweeperAdminRole) {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20 token = tokens[i];
            require(!lockedTokens[address(token)], "Tokens can't be swept");
            uint256 balance = token.balanceOf(address(this));
            token.transfer(to, balance);
            emit SweepWithdrawToken(to, token, balance);
        }

        for (uint256 i = 0; i < nfts.length; i++) {
            IERC721 nftAddress = nfts[i].nftAddress;
            require(!lockedTokens[address(nftAddress)], "Tokens can't be swept");
            uint256[] memory ids = nfts[i].ids;
            for (uint256 j = 0; j < ids.length; j++) {
                nftAddress.safeTransferFrom(address(this), to, ids[j]);
            }
        }
        emit SweepWithdrawNFTs(to, nfts);
    }

    /// @notice Sweep native coin
    /// @param _to address the native coins should be transferred to
    function sweepNative(address payable _to) external onlyAccessRegistryRole(sweeperAdminRole) {
        require(allowNativeSweep, "Not allowed");
        uint256 balance = address(this).balance;
        _to.transfer(balance);
        emit SweepWithdrawNative(_to, balance);
    }

    /**
     * @dev Refuse native sweep.
     * Once refused can't be allowed again
     */
    function refuseNativeSweep() external onlyAccessRegistryRole(sweeperAdminRole) {
        allowNativeSweep = false;
    }

    /**
     * @dev Lock single token so they can't be transferred from the contract.
     * Once locked it can't be unlocked
     */
    function lockToken(address token) external onlyAccessRegistryRole(sweeperAdminRole) {
        address[] memory tokenArray = new address[](1);
        tokenArray[0] = token;
        _lockTokens(tokenArray);
    }

    /**
     * @dev Lock multiple tokens so they can't be transferred from the contract.
     * Once locked it can't be unlocked
     */
    function lockTokens(address[] memory tokens) external onlyAccessRegistryRole(sweeperAdminRole) {
        _lockTokens(tokens);
    }

    function _lockTokens(address[] memory tokens) private {
        for (uint256 i = 0; i < tokens.length; i++) {
            lockedTokens[tokens[i]] = true;
        }
    }
}

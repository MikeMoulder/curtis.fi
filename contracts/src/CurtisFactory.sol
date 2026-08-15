// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {CurtisVault} from "./CurtisVault.sol";

/// @title CurtisFactory — one vault per user, pinned to one BDEX pool
/// @notice Deploys `CurtisVault` instances and records ownership so the
/// frontend can resolve a wallet to its vault in a single call.
contract CurtisFactory {
    /// @notice BDEX NonfungiblePositionManager. Immutable so a compromised
    /// admin cannot point new vaults at a counterfeit position manager.
    address public immutable positionManager;

    /// @notice The single BDEX pool these vaults may provide liquidity to.
    /// Pinned at deploy time rather than chosen per-vault: on BOT Chain exactly
    /// one pool has meaningful depth, and an address pinned in bytecode cannot
    /// be swapped for a lookalike. See docs/botchain-addresses.md.
    address public immutable pool;

    /// @notice Default agent signer for new vaults. Owners may rotate their own
    /// vault's agent afterwards; changing this only affects future vaults.
    address public defaultAgent;

    address public admin;

    mapping(address => address) public vaultOf;
    address[] public allVaults;

    event VaultCreated(address indexed owner, address indexed vault, uint256 timestamp);
    event DefaultAgentUpdated(address indexed previous, address indexed next);
    event AdminTransferred(address indexed previous, address indexed next);

    error NotAdmin();
    error VaultAlreadyExists();
    error ZeroAddress();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address _positionManager, address _pool, address _defaultAgent) {
        if (_positionManager == address(0) || _pool == address(0) || _defaultAgent == address(0)) {
            revert ZeroAddress();
        }
        positionManager = _positionManager;
        pool = _pool;
        defaultAgent = _defaultAgent;
        admin = msg.sender;
    }

    /// @notice Deploy the caller's vault with their chosen guardrails.
    function createVault(CurtisVault.Guardrails calldata guardrails)
        external
        returns (address vault)
    {
        if (vaultOf[msg.sender] != address(0)) revert VaultAlreadyExists();

        vault = address(
            new CurtisVault(msg.sender, defaultAgent, positionManager, pool, guardrails)
        );

        vaultOf[msg.sender] = vault;
        allVaults.push(vault);

        emit VaultCreated(msg.sender, vault, block.timestamp);
    }

    function setDefaultAgent(address next) external onlyAdmin {
        if (next == address(0)) revert ZeroAddress();
        emit DefaultAgentUpdated(defaultAgent, next);
        defaultAgent = next;
    }

    function transferAdmin(address next) external onlyAdmin {
        if (next == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, next);
        admin = next;
    }

    function vaultCount() external view returns (uint256) {
        return allVaults.length;
    }
}

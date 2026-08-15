// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console2} from "forge-std/Script.sol";
import {CurtisFactory} from "../src/CurtisFactory.sol";
import {CurtisVault} from "../src/CurtisVault.sol";
import {BDEXAddresses} from "../src/BDEXAddresses.sol";
import {IBDEXPool, INonfungiblePositionManager} from "../src/interfaces/IBDEX.sol";

/// @notice Deploys CurtisFactory against the live BDEX stack.
///
///   Testnet: forge script script/Deploy.s.sol --rpc-url bohr     --broadcast
///   Mainnet: forge script script/Deploy.s.sol --rpc-url botchain --broadcast
///
/// The address set is resolved from `block.chainid`, so the same command is
/// correct on both networks and there is no env var to get wrong.
///
/// Preflight is not optional. Every address is checked to have code and to
/// self-report consistently before anything is deployed — a typo in a pool
/// address yields a factory that looks fine and mints into nothing.
contract Deploy is Script {
    function run() external {
        BDEXAddresses.Deployment memory d = BDEXAddresses.current();

        address agent = vm.envAddress("AGENT_ADDRESS");
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(deployerKey);

        _preflight(d, deployer, agent);

        vm.startBroadcast(deployerKey);
        CurtisFactory factory = new CurtisFactory(d.positionManager, d.pool, agent);
        vm.stopBroadcast();

        console2.log("");
        console2.log("CurtisFactory   :", address(factory));
        console2.log("  positionManager:", factory.positionManager());
        console2.log("  pool           :", factory.pool());
        console2.log("  defaultAgent   :", factory.defaultAgent());
        console2.log("  admin          :", factory.admin());
        console2.log("");
        console2.log("Verify with:");
        if (block.chainid == BDEXAddresses.MAINNET) {
            console2.log("  forge verify-contract <addr> CurtisFactory --chain 677 \\");
            console2.log("    --verifier blockscout --verifier-url https://scan.botchain.ai/api");
        } else {
            console2.log("  forge verify-contract <addr> CurtisFactory --chain 968 \\");
            console2.log("    --verifier blockscout --verifier-url https://scan.bohr.life/api");
        }
    }

    function _preflight(BDEXAddresses.Deployment memory d, address deployer, address agent)
        internal
        view
    {
        console2.log("=== preflight ===");
        console2.log("chainid :", block.chainid);
        console2.log("network :", block.chainid == BDEXAddresses.MAINNET ? "BOT Chain mainnet" : "Bohr testnet");
        console2.log("deployer:", deployer);
        console2.log("agent   :", agent);

        // The agent key must never be the deployer key. Separating the signing
        // authority from the treasury is the entire autonomy claim — if they
        // collide, the demo is a wallet with extra steps.
        require(agent != deployer, "agent must differ from deployer");
        require(agent != address(0), "agent unset");
        require(deployer.balance > 0, "deployer has no gas");

        require(d.positionManager.code.length > 0, "no code at position manager");
        require(d.pool.code.length > 0, "no code at pool");
        require(d.usdt.code.length > 0, "no code at USDT");

        // Cross-check the pool really is the pair we expect, by address — never
        // by symbol. Impersonation tokens are live on both networks, and the
        // mainnet USDT address holds an unrelated 18-decimal token on testnet.
        IBDEXPool pool = IBDEXPool(d.pool);
        require(pool.token0() == d.usdt, "pool token0 is not this network's USDT");
        require(pool.token1() == d.wbot, "pool token1 is not WBOT");
        require(pool.fee() == 3000, "unexpected fee tier");
        require(pool.tickSpacing() == 60, "unexpected tick spacing");

        // And that the position manager belongs to the same BDEX deployment.
        require(
            INonfungiblePositionManager(d.positionManager).factory() == d.v3Factory,
            "position manager / factory mismatch"
        );
        require(
            INonfungiblePositionManager(d.positionManager).WETH9() == d.wbot,
            "position manager WETH9 mismatch"
        );

        (, int24 spot,,,,,) = pool.slot0();
        console2.log("pool       :", d.pool);
        console2.log("spot tick  :", vm.toString(spot));
        console2.log("preflight OK");
    }

    /// @notice Sensible starting guardrails for a 0.3% / spacing-60 pool.
    /// Exposed so the frontend and tests share one source.
    ///
    /// Tick maths: 1 tick = 1.0001x, so a +/-5% band is about 488 ticks either
    /// side. Widths below are chosen against that scale, rounded to spacing.
    function defaultGuardrails() public pure returns (CurtisVault.Guardrails memory) {
        return CurtisVault.Guardrails({
            minRangeWidth: 600, //  ~ +/-3%  — narrower than this is churn
            maxRangeWidth: 12000, // ~ +/-35% — wider than this is not management
            maxRebalancesPerDay: 6,
            maxCentreOffset: 300 //  spot must sit within ~3% of range midpoint
        });
    }
}

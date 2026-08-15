// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Test, console2} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import {CurtisFactory} from "../src/CurtisFactory.sol";
import {CurtisVault} from "../src/CurtisVault.sol";
import {BDEXAddresses} from "../src/BDEXAddresses.sol";
import {IBDEXPool} from "../src/interfaces/IBDEX.sol";

/// @notice Fork tests against live BDEX. The same suite runs on both networks —
/// see the two concrete contracts at the bottom of this file.
///
/// These run against the real DEX rather than mocks, because the claims worth
/// proving are about how the vault behaves against BDEX's actual position
/// manager. A mock would prove only that the mock agrees with itself.
///
///   forge test --match-contract Mainnet -vv
///   forge test --match-contract Testnet -vv
///   forge test                                # both
abstract contract CurtisVaultTestBase is Test {
    BDEXAddresses.Deployment internal d;

    CurtisFactory factory;
    CurtisVault vault;

    address owner = makeAddr("owner");
    address agent = makeAddr("agent");
    address attacker = makeAddr("attacker");

    int24 tickSpacing;
    int24 spotTick;

    /// @dev foundry.toml rpc_endpoints alias for this network.
    function _forkAlias() internal pure virtual returns (string memory);

    /// @dev Expected chain id, asserted so a misrouted RPC fails loudly.
    function _expectedChainId() internal pure virtual returns (uint256);

    function setUp() public {
        vm.createSelectFork(_forkAlias());
        assertEq(block.chainid, _expectedChainId(), "fork is on the wrong chain");

        d = BDEXAddresses.current();

        factory = new CurtisFactory(d.positionManager, d.pool, agent);

        vm.prank(owner);
        vault = CurtisVault(factory.createVault(_guardrails()));

        tickSpacing = IBDEXPool(d.pool).tickSpacing();
        (, spotTick,,,,,) = IBDEXPool(d.pool).slot0();
    }

    function _guardrails() internal pure returns (CurtisVault.Guardrails memory) {
        return CurtisVault.Guardrails({
            minRangeWidth: 600,
            maxRangeWidth: 12000,
            maxRebalancesPerDay: 6,
            maxCentreOffset: 300
        });
    }

    function _align(int24 tick) internal view returns (int24) {
        int24 aligned = (tick / tickSpacing) * tickSpacing;
        if (tick < 0 && tick % tickSpacing != 0) aligned -= tickSpacing;
        return aligned;
    }

    function _centredRange(int24 halfWidth) internal view returns (int24 lower, int24 upper) {
        int24 mid = _align(spotTick);
        lower = mid - halfWidth;
        upper = mid + halfWidth;
    }

    function _fundAndDeposit() internal {
        uint256 usdtAmount = 1_000 * (10 ** IERC20Metadata(d.usdt).decimals());
        uint256 wbotAmount = 100e18;

        deal(d.usdt, owner, usdtAmount);
        deal(d.wbot, owner, wbotAmount);

        vm.startPrank(owner);
        IERC20(d.usdt).approve(address(vault), type(uint256).max);
        IERC20(d.wbot).approve(address(vault), type(uint256).max);
        vault.deposit(usdtAmount, wbotAmount);
        vm.stopPrank();
    }

    // ------------------------------------------------------- environment sanity

    /// The address set for this network must genuinely be what we believe.
    /// If BDEX redeploys, this fails loudly instead of minting into nothing.
    function test_ForkEnvironmentMatchesPinnedAddresses() public view {
        assertEq(IBDEXPool(d.pool).token0(), d.usdt, "token0 != this network's USDT");
        assertEq(IBDEXPool(d.pool).token1(), d.wbot, "token1 != WBOT");
        assertEq(IBDEXPool(d.pool).fee(), 3000, "fee tier changed");
        assertEq(IBDEXPool(d.pool).tickSpacing(), 60, "tick spacing changed");
        assertGt(d.positionManager.code.length, 0, "no code at NFPM");
    }

    /// USDT is 6 decimals and WBOT is 18 on both networks. This guards the trap
    /// that the mainnet USDT address holds an 18-decimal token on testnet: if
    /// the wrong address ever leaks into the set, decimals catch it.
    function test_TokenDecimals() public view {
        assertEq(IERC20Metadata(d.usdt).decimals(), 6, "USDT is not 6 decimals");
        assertEq(IERC20Metadata(d.wbot).decimals(), 18, "WBOT is not 18 decimals");
        assertEq(IERC20Metadata(d.usdt).symbol(), "USDT", "not USDT");
    }

    function test_VaultWiring() public view {
        assertEq(vault.owner(), owner);
        assertEq(vault.agent(), agent);
        assertEq(address(vault.token0()), d.usdt);
        assertEq(address(vault.token1()), d.wbot);
        assertEq(vault.fee(), 3000);
        assertEq(factory.vaultOf(owner), address(vault));
    }

    // ------------------------------------------------------- the security claims

    /// The headline claim: a leaked agent key cannot move funds.
    function test_AgentCannotWithdraw() public {
        vm.prank(agent);
        vm.expectRevert(CurtisVault.NotOwner.selector);
        vault.withdrawAll(0, 0);
    }

    function test_AgentCannotChangeGuardrails() public {
        vm.prank(agent);
        vm.expectRevert(CurtisVault.NotOwner.selector);
        vault.setGuardrails(_guardrails());
    }

    function test_AgentCannotRotateAgent() public {
        vm.prank(agent);
        vm.expectRevert(CurtisVault.NotOwner.selector);
        vault.setAgent(attacker);
    }

    function test_StrangerCannotRebalance() public {
        (int24 lo, int24 hi) = _centredRange(960);
        vm.prank(attacker);
        vm.expectRevert(CurtisVault.NotAgent.selector);
        vault.rebalance(keccak256("d"), "", 5000, lo, hi, 1, 1);
    }

    // ------------------------------------------------------ guardrail enforcement

    function test_RejectsUnalignedTicks() public {
        (int24 lo, int24 hi) = _centredRange(960);
        vm.prank(agent);
        vm.expectRevert(CurtisVault.TickNotAligned.selector);
        vault.rebalance(keccak256("d1"), "", 5000, lo + 1, hi, 1, 1);
    }

    function test_RejectsRangeNarrowerThanGuardrail() public {
        (int24 lo, int24 hi) = _centredRange(120); // width 240 < 600
        vm.prank(agent);
        vm.expectRevert(CurtisVault.RangeTooNarrow.selector);
        vault.rebalance(keccak256("d2"), "", 5000, lo, hi, 1, 1);
    }

    function test_RejectsRangeWiderThanGuardrail() public {
        (int24 lo, int24 hi) = _centredRange(9000); // width 18000 > 12000
        vm.prank(agent);
        vm.expectRevert(CurtisVault.RangeTooWide.selector);
        vault.rebalance(keccak256("d3"), "", 5000, lo, hi, 1, 1);
    }

    /// A range sitting entirely above spot earns nothing and is a directional
    /// bet the owner never authorised. This is the check that matters most.
    function test_RejectsRangeEntirelyAboveSpot() public {
        int24 base = _align(spotTick) + 3000;
        vm.prank(agent);
        vm.expectRevert(CurtisVault.RangeNotCentred.selector);
        vault.rebalance(keccak256("d4"), "", 5000, base, base + 960, 1, 1);
    }

    function test_RejectsRangeEntirelyBelowSpot() public {
        int24 base = _align(spotTick) - 6000;
        vm.prank(agent);
        vm.expectRevert(CurtisVault.RangeNotCentred.selector);
        vault.rebalance(keccak256("d5"), "", 5000, base, base + 960, 1, 1);
    }

    /// Straddles spot, but skewed far off-centre — still refused. Offsets stay
    /// multiples of tickSpacing so centring is genuinely the check under test.
    function test_RejectsOffCentreRange() public {
        int24 mid = _align(spotTick);
        vm.prank(agent);
        vm.expectRevert(CurtisVault.RangeNotCentred.selector);
        vault.rebalance(keccak256("d6"), "", 5000, mid - 120, mid + 4980, 1, 1);
    }

    function test_RejectsZeroSlippageBounds() public {
        (int24 lo, int24 hi) = _centredRange(960);
        vm.prank(agent);
        vm.expectRevert(CurtisVault.ZeroSlippageBound.selector);
        vault.rebalance(keccak256("d7"), "", 5000, lo, hi, 0, 0);
    }

    function test_RejectsReplayedDecision() public {
        _fundAndDeposit();
        (int24 lo, int24 hi) = _centredRange(960);
        bytes32 id = keccak256("replay-me");

        vm.prank(agent);
        vault.rebalance(id, "first use", 5000, lo, hi, 1, 1);

        vm.prank(agent);
        vm.expectRevert(CurtisVault.DecisionReplayed.selector);
        vault.rebalance(id, "second use", 5000, lo, hi, 1, 1);
    }

    /// A decision that reverts must NOT burn its id — the agent has to be able
    /// to retry it. Replay protection covers *executed* decisions only.
    function test_FailedDecisionCanBeRetried() public {
        _fundAndDeposit();
        (int24 lo, int24 hi) = _centredRange(960);
        bytes32 id = keccak256("retry-me");

        vm.prank(agent);
        vm.expectRevert(CurtisVault.ZeroSlippageBound.selector);
        vault.rebalance(id, "bad bounds", 5000, lo, hi, 0, 0);

        assertFalse(vault.usedDecisions(id), "reverted decision must not be recorded");

        vm.prank(agent);
        vault.rebalance(id, "corrected bounds", 5000, lo, hi, 1, 1);
        assertGt(vault.tokenId(), 0);
    }

    // ------------------------------------------------------------- owner powers

    function test_OwnerCanWithdrawWhilePaused() public {
        vm.startPrank(owner);
        vault.setPaused(true);
        vault.withdrawAll(0, 0); // must not revert: pausing may never trap funds
        vm.stopPrank();
    }

    function test_PauseBlocksAgent() public {
        vm.prank(owner);
        vault.setPaused(true);

        (int24 lo, int24 hi) = _centredRange(960);
        vm.prank(agent);
        vm.expectRevert(CurtisVault.IsPaused.selector);
        vault.rebalance(keccak256("d8"), "", 5000, lo, hi, 1, 1);
    }

    function test_OwnerCanRotateCompromisedAgent() public {
        address newAgent = makeAddr("newAgent");

        vm.prank(owner);
        vault.setAgent(newAgent);
        assertEq(vault.agent(), newAgent);

        (int24 lo, int24 hi) = _centredRange(960);
        vm.prank(agent); // the old, now-revoked key
        vm.expectRevert(CurtisVault.NotAgent.selector);
        vault.rebalance(keccak256("d9"), "", 5000, lo, hi, 1, 1);
    }

    function test_FactoryRejectsDuplicateVault() public {
        vm.prank(owner);
        vm.expectRevert(CurtisFactory.VaultAlreadyExists.selector);
        factory.createVault(_guardrails());
    }

    // --------------------------------------------------------- the happy path

    /// Full loop against the live pool: fund, deposit, agent opens a position.
    function test_AgentCanOpenPositionOnLivePool() public {
        _fundAndDeposit();
        assertEq(vault.tokenId(), 0, "should start with no position");

        (int24 lo, int24 hi) = _centredRange(960);
        vm.prank(agent);
        vault.rebalance(
            keccak256("open-1"), "spot centred, 14d realised vol low", 8200, lo, hi, 1, 1
        );

        assertGt(vault.tokenId(), 0, "position NFT not minted");

        (int24 tl, int24 tu, uint128 liq, int24 spot, bool inRange) = vault.positionInfo();
        assertEq(tl, lo, "tickLower mismatch");
        assertEq(tu, hi, "tickUpper mismatch");
        assertGt(liq, 0, "no liquidity minted");
        assertTrue(inRange, "position should be in range");

        console2.log("chainid                 :", block.chainid);
        console2.log("minted position tokenId :", vault.tokenId());
        console2.log("range lower/upper       :", vm.toString(tl), vm.toString(tu));
        console2.log("spot tick               :", vm.toString(spot));
        console2.log("liquidity               :", liq);
    }

    /// Owner gets their capital back out of a live position.
    function test_OwnerCanExitLivePosition() public {
        test_AgentCanOpenPositionOnLivePool();

        vm.prank(owner);
        vault.withdrawAll(0, 0);

        assertEq(vault.tokenId(), 0, "position should be burned");
        assertGt(
            IERC20(d.usdt).balanceOf(owner) + IERC20(d.wbot).balanceOf(owner),
            0,
            "owner got nothing back"
        );
    }

    function test_RateLimitBlocksExcessiveRebalancing() public {
        _fundAndDeposit();
        (int24 lo, int24 hi) = _centredRange(960);

        for (uint256 i = 0; i < 6; i++) {
            vm.prank(agent);
            vault.rebalance(keccak256(abi.encode("rl", i)), "", 7000, lo, hi, 1, 1);
        }
        assertEq(vault.rebalancesRemainingToday(), 0);

        vm.prank(agent);
        vm.expectRevert(CurtisVault.RateLimited.selector);
        vault.rebalance(keccak256("rl-overflow"), "", 7000, lo, hi, 1, 1);

        vm.warp(block.timestamp + 1 days + 1);
        assertEq(vault.rebalancesRemainingToday(), 6);
    }
}

/// @notice The suite, against BOT Chain mainnet (677).
contract CurtisVaultMainnetTest is CurtisVaultTestBase {
    function _forkAlias() internal pure override returns (string memory) {
        return "botchain";
    }

    function _expectedChainId() internal pure override returns (uint256) {
        return BDEXAddresses.MAINNET;
    }
}

/// @notice The same suite, against Bohr testnet (968). Proves the testnet
/// address set is correct before anything is deployed there for real.
contract CurtisVaultTestnetTest is CurtisVaultTestBase {
    function _forkAlias() internal pure override returns (string memory) {
        return "bohr";
    }

    function _expectedChainId() internal pure override returns (uint256) {
        return BDEXAddresses.TESTNET;
    }
}

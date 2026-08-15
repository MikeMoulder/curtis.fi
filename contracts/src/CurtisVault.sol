// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import {INonfungiblePositionManager, IBDEXPool} from "./interfaces/IBDEX.sol";

/// @title CurtisVault — agent-managed concentrated liquidity position on BDEX
/// @notice Holds one Uniswap-V3-style LP position in a single, immutable BDEX
/// pool. An off-chain AI agent ("Curtis") may re-range and compound that
/// position, and may do nothing else.
///
/// The security model is deliberately narrow:
///
///  - The agent has exactly two powers, `rebalance` and `compound`. Neither can
///    move a token to any address other than this vault or the position manager.
///    There is no arbitrary-call path, so a leaked agent key cannot drain funds —
///    the worst it can do is re-range within the owner's configured bounds, and
///    the rate limit caps how often even that can happen.
///  - Only the owner can withdraw, and withdrawal works while paused.
///  - Every constraint enforced here is one the EVM can actually check. Notably
///    absent are impermanent-loss and APR ceilings: both need price history a
///    contract cannot observe. Those live in the off-chain policy and are
///    recorded in `CurtisActed` as attested inputs, not enforced invariants.
///    See docs/botchain-addresses.md for why that distinction matters.
contract CurtisVault is ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------- immutable

    INonfungiblePositionManager public immutable positionManager;
    IBDEXPool public immutable pool;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    uint24 public immutable fee;
    int24 public immutable tickSpacing;
    address public immutable owner;

    // ------------------------------------------------------------------ storage

    /// @notice The agent authorised to re-range. Rotatable by the owner if the
    /// key is ever suspected compromised.
    address public agent;

    /// @notice Active position NFT id. Zero when the vault holds no position.
    uint256 public tokenId;

    bool public paused;

    struct Guardrails {
        /// Minimum width of a range, in ticks. Stops the agent minting a
        /// dust-width range that is instantly out of bounds.
        int24 minRangeWidth;
        /// Maximum width of a range, in ticks. Stops the agent minting an
        /// effectively-full-range position and calling it management.
        int24 maxRangeWidth;
        /// Rebalances allowed per rolling 24h. Caps churn and gas burn.
        uint16 maxRebalancesPerDay;
        /// How far spot may sit from the range midpoint, in ticks, at mint time.
        /// Keeps new ranges genuinely centred on price.
        int24 maxCentreOffset;
    }

    Guardrails public guardrails;

    uint16 public rebalancesInWindow;
    uint64 public windowStart;

    // ------------------------------------------------------------------- events

    /// @notice Emitted on every agent action. `reasoning` and `confidenceBps`
    /// are the model's attested inputs — they are recorded, not trusted.
    event CurtisActed(
        bytes32 indexed decisionId,
        string action,
        string reasoning,
        uint16 confidenceBps,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0,
        uint256 amount1,
        uint256 timestamp
    );

    event Deposited(uint256 amount0, uint256 amount1);
    event Withdrawn(address indexed to, uint256 amount0, uint256 amount1);
    event GuardrailsUpdated(Guardrails guardrails);
    event AgentUpdated(address indexed previous, address indexed next);
    event PausedSet(bool paused);

    // ------------------------------------------------------------------- errors

    error NotOwner();
    error NotAgent();
    error IsPaused();
    error NoPosition();
    error PositionExists();
    error TickNotAligned();
    error RangeTooNarrow();
    error RangeTooWide();
    error RangeNotCentred();
    error RateLimited();
    error ZeroSlippageBound();
    error InvalidRange();
    error DecisionReplayed();

    mapping(bytes32 => bool) public usedDecisions;

    // ---------------------------------------------------------------- modifiers

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAgent() {
        if (msg.sender != agent) revert NotAgent();
        _;
    }

    modifier notPaused() {
        if (paused) revert IsPaused();
        _;
    }

    // -------------------------------------------------------------- constructor

    constructor(
        address _owner,
        address _agent,
        address _positionManager,
        address _pool,
        Guardrails memory _guardrails
    ) {
        owner = _owner;
        agent = _agent;
        positionManager = INonfungiblePositionManager(_positionManager);
        pool = IBDEXPool(_pool);

        token0 = IERC20(IBDEXPool(_pool).token0());
        token1 = IERC20(IBDEXPool(_pool).token1());
        fee = IBDEXPool(_pool).fee();
        tickSpacing = IBDEXPool(_pool).tickSpacing();

        _setGuardrails(_guardrails);
    }

    // ------------------------------------------------------------- owner: funds

    /// @notice Pull tokens in from the owner. Amounts are whatever the owner
    /// approved; either may be zero.
    function deposit(uint256 amount0, uint256 amount1) external onlyOwner nonReentrant {
        if (amount0 > 0) token0.safeTransferFrom(msg.sender, address(this), amount0);
        if (amount1 > 0) token1.safeTransferFrom(msg.sender, address(this), amount1);
        emit Deposited(amount0, amount1);
    }

    /// @notice Exit the position entirely and send every token to the owner.
    /// Deliberately callable while paused — pausing must never trap funds.
    function withdrawAll(uint256 amount0Min, uint256 amount1Min)
        external
        onlyOwner
        nonReentrant
        returns (uint256 amount0, uint256 amount1)
    {
        if (tokenId != 0) _exitPosition(amount0Min, amount1Min);

        amount0 = token0.balanceOf(address(this));
        amount1 = token1.balanceOf(address(this));

        if (amount0 > 0) token0.safeTransfer(owner, amount0);
        if (amount1 > 0) token1.safeTransfer(owner, amount1);

        emit Withdrawn(owner, amount0, amount1);
    }

    // ------------------------------------------------------------ owner: config

    function setGuardrails(Guardrails calldata g) external onlyOwner {
        _setGuardrails(g);
    }

    function setAgent(address next) external onlyOwner {
        emit AgentUpdated(agent, next);
        agent = next;
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PausedSet(p);
    }

    // ------------------------------------------------------------- agent powers

    /// @notice Open or re-centre the position at [tickLower, tickUpper].
    /// @dev The only state the agent can reach. Tokens move vault <-> position
    /// and nowhere else.
    function rebalance(
        bytes32 decisionId,
        string calldata reasoning,
        uint16 confidenceBps,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Min,
        uint256 amount1Min
    ) external onlyAgent notPaused nonReentrant {
        if (usedDecisions[decisionId]) revert DecisionReplayed();
        usedDecisions[decisionId] = true;

        _checkRange(tickLower, tickUpper);
        _consumeRateLimit();

        // Slippage bounds must be real. A zero bound is an unbounded mint.
        if (amount0Min == 0 && amount1Min == 0) revert ZeroSlippageBound();

        if (tokenId != 0) _exitPosition(0, 0);

        (uint256 a0, uint256 a1) = _mintPosition(tickLower, tickUpper, amount0Min, amount1Min);

        emit CurtisActed(
            decisionId,
            "rebalance",
            reasoning,
            confidenceBps,
            tickLower,
            tickUpper,
            a0,
            a1,
            block.timestamp
        );
    }

    /// @notice Collect accrued fees and fold them back into the same range.
    /// Does not count against the rebalance rate limit — compounding is
    /// strictly additive and cannot re-range.
    function compound(bytes32 decisionId, string calldata reasoning, uint16 confidenceBps)
        external
        onlyAgent
        notPaused
        nonReentrant
    {
        if (tokenId == 0) revert NoPosition();
        if (usedDecisions[decisionId]) revert DecisionReplayed();
        usedDecisions[decisionId] = true;

        positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));

        uint128 liquidity;
        if (bal0 > 0 || bal1 > 0) {
            _approveIfNeeded(bal0, bal1);
            (liquidity,,) = positionManager.increaseLiquidity(
                INonfungiblePositionManager.IncreaseLiquidityParams({
                    tokenId: tokenId,
                    amount0Desired: bal0,
                    amount1Desired: bal1,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: block.timestamp
                })
            );
        }

        (,,,,, int24 tl, int24 tu,,,,,) = positionManager.positions(tokenId);

        emit CurtisActed(
            decisionId, "compound", reasoning, confidenceBps, tl, tu, bal0, bal1, block.timestamp
        );
    }

    // ----------------------------------------------------------------- internals

    function _setGuardrails(Guardrails memory g) internal {
        if (g.minRangeWidth <= 0 || g.maxRangeWidth < g.minRangeWidth) revert InvalidRange();
        guardrails = g;
        emit GuardrailsUpdated(g);
    }

    /// @dev Every check here is something the EVM can actually verify.
    function _checkRange(int24 tickLower, int24 tickUpper) internal view {
        if (tickLower >= tickUpper) revert InvalidRange();

        // Alignment: V3 rejects unaligned ticks, but failing here is cheaper
        // and gives a named error instead of an opaque pool revert.
        if (tickLower % tickSpacing != 0 || tickUpper % tickSpacing != 0) revert TickNotAligned();

        int24 width = tickUpper - tickLower;
        if (width < guardrails.minRangeWidth) revert RangeTooNarrow();
        if (width > guardrails.maxRangeWidth) revert RangeTooWide();

        // The range must actually straddle spot. A range placed entirely to one
        // side of the current tick earns no fees and is a one-sided bet — the
        // single most valuable thing this contract can refuse.
        (, int24 spot,,,,,) = pool.slot0();
        if (spot <= tickLower || spot >= tickUpper) revert RangeNotCentred();

        int24 midpoint = (tickLower + tickUpper) / 2;
        int24 offset = spot > midpoint ? spot - midpoint : midpoint - spot;
        if (offset > guardrails.maxCentreOffset) revert RangeNotCentred();
    }

    function _consumeRateLimit() internal {
        if (block.timestamp - windowStart > 1 days) {
            windowStart = uint64(block.timestamp);
            rebalancesInWindow = 0;
        }
        if (rebalancesInWindow >= guardrails.maxRebalancesPerDay) revert RateLimited();
        unchecked {
            ++rebalancesInWindow;
        }
    }

    function _mintPosition(
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Min,
        uint256 amount1Min
    ) internal returns (uint256 amount0, uint256 amount1) {
        if (tokenId != 0) revert PositionExists();

        uint256 bal0 = token0.balanceOf(address(this));
        uint256 bal1 = token1.balanceOf(address(this));
        _approveIfNeeded(bal0, bal1);

        uint256 newTokenId;
        (newTokenId,, amount0, amount1) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: address(token0),
                token1: address(token1),
                fee: fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: bal0,
                amount1Desired: bal1,
                amount0Min: amount0Min,
                amount1Min: amount1Min,
                recipient: address(this),
                deadline: block.timestamp
            })
        );
        tokenId = newTokenId;
    }

    /// @dev Drain the position back into the vault and burn the NFT.
    function _exitPosition(uint256 amount0Min, uint256 amount1Min) internal {
        uint256 id = tokenId;
        if (id == 0) revert NoPosition();

        (,,,,,,, uint128 liquidity,,,,) = positionManager.positions(id);

        if (liquidity > 0) {
            positionManager.decreaseLiquidity(
                INonfungiblePositionManager.DecreaseLiquidityParams({
                    tokenId: id,
                    liquidity: liquidity,
                    amount0Min: amount0Min,
                    amount1Min: amount1Min,
                    deadline: block.timestamp
                })
            );
        }

        positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: id,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        positionManager.burn(id);
        tokenId = 0;
    }

    /// @dev USDT on BOT Chain returns no data from `approve`; SafeERC20 handles
    /// that. `forceApprove` also covers the approve-to-nonzero restriction.
    function _approveIfNeeded(uint256 amount0, uint256 amount1) internal {
        if (amount0 > 0) token0.forceApprove(address(positionManager), amount0);
        if (amount1 > 0) token1.forceApprove(address(positionManager), amount1);
    }

    // ------------------------------------------------------------------- views

    /// @notice Current position range and liquidity, for the dashboard.
    function positionInfo()
        external
        view
        returns (int24 tickLower, int24 tickUpper, uint128 liquidity, int24 spotTick, bool inRange)
    {
        (, spotTick,,,,,) = pool.slot0();
        if (tokenId == 0) return (0, 0, 0, spotTick, false);
        (,,,,, tickLower, tickUpper, liquidity,,,,) = positionManager.positions(tokenId);
        inRange = spotTick > tickLower && spotTick < tickUpper;
    }

    function rebalancesRemainingToday() external view returns (uint256) {
        if (block.timestamp - windowStart > 1 days) return guardrails.maxRebalancesPerDay;
        if (rebalancesInWindow >= guardrails.maxRebalancesPerDay) return 0;
        return guardrails.maxRebalancesPerDay - rebalancesInWindow;
    }

    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }
}

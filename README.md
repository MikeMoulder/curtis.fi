# Curtis.fi

**AI-managed concentrated liquidity on BDEX — BOT Chain Builder Challenge #2, AI Native track.**

Curtis is an autonomous agent that manages a Uniswap-V3-style liquidity position
on BDEX. It decides where to place the tick range, when to re-centre it as price
moves, and when to compound fees — and it executes those decisions itself, as
signed on-chain transactions, inside guardrails the user sets and the contract
enforces.

---

## Why range management, and not pool selection

The original concept was a pool scanner: rank every BDEX pool by risk-adjusted
yield and rotate capital into the best one. Measuring the chain killed that idea,
and it is worth recording why, because the evidence also points at the product
that does work.

Sorted by TVL, BOT Chain has **three** pools with meaningful liquidity:

| Pool | Ver | TVL | Cumulative volume | Txs |
|---|---|---|---|---|
| USDT/WBOT 0.3% | V3 | $30,093,185 | $235,740,466 | 1,499,889 |
| USDT/Money | V2 | $963,403 | $3,181,249 | 44,124 |
| CA/WBOT 1% | V3 | $3,230 | $640,339 | 15,070 |

Everything else on the chain is under $50 TVL — dust and test deployments.

An agent that "scans all pools and picks the best risk-adjusted one" would
therefore return the same answer every time it ran. That is not automation, it is
a constant with extra steps, and it would not survive a judge asking to see the
second-best option.

But the dominant venue is **concentrated liquidity**, and that surfaces a real
decision problem. A V3 LP has to choose a tick range. Too wide and capital sits
idle earning almost nothing; too narrow and price walks out of the band and the
position stops earning entirely. Price moves continuously, so the correct range
moves continuously — which makes it exactly the kind of problem a human LP
manages badly and an agent can manage continuously.

The measured baseline, from 14 days of pool data:

**Mean passive fee APR ≈ 6.4%** (range 4.7–9.95%), on $1.3–2.7M of daily volume.

That figure is fees ÷ *total* pool TVL — what a full-range LP earns. It is the
number Curtis has to beat by concentrating, and the honest denominator for every
performance claim the project makes. Full daily breakdown in
[docs/botchain-addresses.md](docs/botchain-addresses.md).

---

## What the contract actually enforces

The pitch deck version of this project claimed on-chain enforcement of maximum
impermanent loss and minimum APR. Neither is possible: both need price history
that a contract cannot observe, and BOT Chain has no oracle to supply it. Any
judge who reads the Solidity will notice.

So the split is explicit. **On-chain**, `CurtisVault` enforces only what the EVM
can actually verify:

| Guardrail | Enforced how |
|---|---|
| Range straddles spot | reads `pool.slot0()`, refuses one-sided ranges |
| Range centred within N ticks of spot | compares spot to range midpoint |
| Range width within [min, max] | arithmetic on the tick bounds |
| Ticks aligned to spacing | modulo `tickSpacing` |
| Rebalances per rolling 24h | on-chain counter and window |
| Slippage bounds non-zero | passed through to the position manager |
| Pool is the one pinned at deploy | immutable, set in the constructor |
| Agent cannot move funds anywhere | structural — there is no transfer path |

**Off-chain**, the policy engine decides range width from realised volatility,
whether the expected fee capture justifies the gas, and when drift warrants
re-centring. Those judgements are recorded in the `CurtisActed` event as
*attested inputs* — reasoning string, confidence — not as enforced invariants.

The distinction is the point. The agent's job is to choose well; the contract's
job is to make choosing badly survivable.

### The security property that matters

The agent holds its own key, separate from the deployer and the treasury, and its
entire on-chain authority is two functions — `rebalance` and `compound`. Neither
can send a token anywhere except this vault or the position manager. There is no
arbitrary-call path.

A leaked agent key therefore cannot drain a vault. The worst it can do is
re-range within the owner's configured bounds, at most `maxRebalancesPerDay`
times. Only the owner can withdraw, and withdrawal works while paused — pausing
must never trap funds.

This is proven, not asserted: see the `test_AgentCannot*` cases.

---

## Status

| | |
|---|---|
| Chain constants verified | done, both networks — `npm run verify:chain` / `verify:testnet` |
| Contracts | `CurtisFactory`, `CurtisVault` — 46/46 fork tests pass |
| Testnet deploy | not yet |
| Mainnet deploy | not yet |
| Frontend | not started |
| Off-chain policy engine | not started |

The suite runs against **live BDEX on both networks**, not mocks — including
minting a real position in the real USDT/WBOT pool and exiting it again. A mock
would only prove the mock agrees with itself.

```
$ forge test
Ran 23 tests for test/CurtisVault.t.sol:CurtisVaultMainnetTest
Suite result: ok. 23 passed; 0 failed; 0 skipped
Ran 23 tests for test/CurtisVault.t.sol:CurtisVaultTestnetTest
Suite result: ok. 23 passed; 0 failed; 0 skipped
```

Running the identical suite on both is what proves the testnet address set is
right *before* anything is deployed there — see the trap below.

---

## Layout

```
contracts/          Foundry — vault, factory, BDEX interfaces, fork tests
  src/CurtisVault.sol      the position + guardrails
  src/CurtisFactory.sol    one vault per user
  script/Deploy.s.sol      deploy with on-chain preflight
docs/
  botchain-addresses.md    every verified constant + measured pool economics
scripts/
  verify-chain.mjs         re-verify all constants against the live chain
web/                (empty — frontend next)
```

---

## Setup

```bash
cp .env.example .env        # fill in DEPLOYER_PRIVATE_KEY and AGENT_ADDRESS
npm run verify:chain        # mainnet constants
npm run verify:testnet      # testnet constants
npm run test:contracts      # 46 fork tests, both networks
```

Deploy — testnet first, then mainnet. The address set is resolved from
`block.chainid`, so the command is identical and there is no env var to get
wrong:

```bash
# Bohr testnet (968) — fund from https://faucet.bohr.life/basic/
forge script script/Deploy.s.sol --root contracts --rpc-url bohr --broadcast

# BOT Chain mainnet (677)
forge script script/Deploy.s.sol --root contracts --rpc-url botchain --broadcast
```

The script preflights before spending anything: deployer has gas, the agent key
differs from the deployer, every pinned address has code, and the pool reports
the token pair, fee tier and tick spacing expected — **by address, never by
symbol**, because impersonation tokens are live on both networks.

---

## Two things that will cost you hours if you skip them

**Compile for `paris`.** BOT Chain runs Geth v1.5.13, which has no `PUSH0`.
Contracts built with solc's default `cancun` target deploy *successfully* and
then revert on every call — the failure looks like a bug in your code, not a
compiler setting. Set in `foundry.toml`, already done here.

**The testnet is not on `botchain.ai`.** It lives entirely on `bohr.life` —
RPC, explorer and faucet. The faucet URL in the hackathon brief
(`faucet.botchain.ai/basic/`) is not the working one; use
`https://faucet.bohr.life/basic/`.

**The mainnet USDT address is a different token on testnet.**
`0xaBabc7Dd…` is `Tether USD` (6 decimals) on mainnet and `Weslie` / WES
(**18 decimals**) on Bohr. Point mainnet-hardcoded addresses at testnet and
every call still succeeds while every amount is wrong by 10^12 — nothing
reverts, nothing warns. This is why
[`BDEXAddresses.sol`](contracts/src/BDEXAddresses.sol) resolves the whole set
from `block.chainid` instead of trusting an env var.

---

## Deadline

Submission closes **Aug 22, 23:59 UTC+8**. The brief also lists a build period
ending Aug 24 — that is a contradiction in the brief, and the 22nd governs.
Mainnet deployment is a hard eligibility gate: testnet-only entries are not
reviewed at all.

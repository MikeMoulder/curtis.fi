# BOT Chain + BDEX — Verified Constants

Every value below was read directly off-chain via `eth_*` calls or the BDEX
subgraph on **2026-08-15**, not copied from documentation. Re-verify before
mainnet deploy with `npm run verify:chain`.

## Network

| | Mainnet | Testnet ("Bohr") |
|---|---|---|
| Chain ID | `677` (`0x2a5`) | `968` (`0x3c8`) |
| RPC | `https://rpc.botchain.ai` | `https://rpc.bohr.life` |
| Explorer | `https://scan.botchain.ai` | `https://scan.bohr.life` |
| Explorer API | `/api` (Blockscout, Etherscan-compatible) | same |
| Gas token | BOT (18 dec) | tBOT (18 dec) |
| Faucet | — | `https://faucet.bohr.life/basic/` |
| Client | `Geth/v1.5.13-8b5c8c6d-20260731` | same |
| Gas price | flat 20 gwei, `baseFeePerGas = 0` | same |
| Block time | ~0.75 s | ~0.75 s |
| Block gas limit | 35,000,000 | 35,000,000 |
| Multicall3 | `0xcA11bde05977b3631167028862bE2a173976CA11` | **not deployed** |

> The testnet is **not** under `botchain.ai` — it lives entirely on `bohr.life`.
> The faucet URL in the hackathon brief (`faucet.botchain.ai/basic/`) is not the
> working one; use `faucet.bohr.life/basic/`.

## Tokens

| Token | Network | Address | Decimals | Verified name |
|---|---|---|---|---|
| USDT | mainnet 677 | `0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C` | **6** | `Tether USD` |
| USDT | testnet 968 | `0x75edC9335175Fc0552D51D48439F229c10420fe3` | **6** | `Tether USD` |
| WBOT | both | `0xD5452816194a3784dBa983426cCe7c122F4abd30` | 18 | `Wrapped BOT` |

**Never resolve these by symbol.** Impersonation tokens are live on this chain —
`USDT0`, `USDT1`, `BOUSDT`, multiple "Test USDC" contracts, several with
near-identical metadata. Pin the addresses above.

### The cross-network trap

> The mainnet USDT address `0xaBabc7Dd…` is **a completely different token on
> testnet**: `Weslie` (WES), with **18 decimals**.

Hardcode the mainnet USDT address, point the app at Bohr, and every call still
succeeds while every amount is wrong by a factor of 10^12. Nothing reverts.

This is why `src/BDEXAddresses.sol` resolves the address set from
`block.chainid` rather than from an environment variable — the wrong network
becomes impossible, not merely discouraged. `npm run verify:testnet` asserts the
two USDT addresses stay distinct.

USDT is USDT-shaped: `transfer` returns no data. Use OpenZeppelin `SafeERC20`
everywhere or calls will revert on bool-decode.

## BDEX contracts (mainnet)

BDEX is a Uniswap fork branded "bohrdex", deployed as **both V2 and V3**.
All V3 addresses below cross-verified: each reports `factory()` and `WETH9()`
matching the others.

| Contract | Address |
|---|---|
| V3 Factory | `0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419` |
| NonfungiblePositionManager | `0xdac3fcff004d8a8675b94e44941a1a2e3b240090` |
| SwapRouter | `0x07032d47a1b9f8460cbee9dc17c1d3e438693929` |
| V2 LP Locker | `0x82Cb7Cd6Ad9cE3a1f1Fc1821AD7dCAb87C3d7663` |
| V3 Liquidity Locker | `0x32685b8Db1559D6651fcdB8a22D11cC44d3B952b` |

NFPM identifies as `B DEX Positions NFT-V1` / `BOT-POS`, 911 positions minted
to date — that is the entire V3 LP population on this chain.

`0xae6ae8630f7a888dec0b9195c85f7515d5887655` is the highest-frequency swap
caller but exposes no `factory()`. It is an aggregator/smart-router, not the
canonical SwapRouter. Do not target it.

## BDEX contracts (Bohr testnet 968)

BDEX **is** deployed on testnet, and the core contracts sit at the *same*
addresses as mainnet — same deployer, same nonces, byte-identical code sizes.
The pool and USDT differ.

| Contract | Address | Same as mainnet? |
|---|---|---|
| V3 Factory | `0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419` | yes |
| NonfungiblePositionManager | `0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090` | yes |
| SwapRouter | `0x07032d47A1b9f8460cBeE9dC17c1d3E438693929` | yes |
| WBOT | `0xD5452816194a3784dBa983426cCe7c122F4abd30` | yes |
| USDT | `0x75edC9335175Fc0552D51D48439F229c10420fe3` | **no** |
| USDT/WBOT 0.3% pool | `0xA83dAda88e1d71810dfe89699dCE4d4E589Dd890` | **no** |

All three fee tiers exist on testnet for the USDT/WBOT pair:

| Fee | Pool |
|---|---|
| 0.05% | `0xc42db978916872b0c9D4B396e2C8BacC315B3Dac` |
| 0.3% | `0xA83dAda88e1d71810dfe89699dCE4d4E589Dd890` |
| 1% | `0xe564401644E10B1829e19E1B2b2e6e90be79B631` |

The 0.3% testnet pool is genuinely usable, not an empty shell:

| Property | Testnet | Mainnet |
|---|---|---|
| liquidity | 1.6916e19 | 1.5353e19 |
| spot tick | 253,610 | 254,065 |
| tickSpacing | 60 | 60 |
| NFPM positions minted | 177 | 911 |

Liquidity and price are close enough to mainnet that testnet rehearsal is
meaningful rather than theatre. Build and rehearse here; deploy to mainnet for
submission.

## Off-chain services

| Service | URL |
|---|---|
| V3 subgraph | `https://graph-node.botchain.ai/subgraphs/name/bohrdex/bohrdex-subgraph` |
| V2 subgraph | `https://graph-node.botchain.ai/subgraphs/name/bohrdex/bohrdex-v2-subgraph` |
| Locker subgraph | `https://graph-node.botchain.ai/subgraphs/name/bohrdex/bohrdex-locker-subgraph` |
| Routing API | `https://dex-routing.botchain.ai` |
| Price API | `https://dex-wallet.botchain.ai` |

The subgraphs are the primary data source for the scanner — they serve TVL,
volume, fees and daily aggregates directly, which is far cheaper and richer
than reconstructing the same figures from raw RPC log scans.

## The target pool

`0x64f418471a1a7932a190e10da5a8551db5abec05` — USDT/WBOT, 0.3% fee tier.

| Property | Value |
|---|---|
| token0 | USDT (6 dec) |
| token1 | WBOT (18 dec) |
| fee | `3000` (0.3%) |
| tickSpacing | `60` |
| TVL | ~$30.1M |
| Cumulative volume | ~$235.7M |
| Cumulative txs | 1,499,889 |

### Measured fee APR, 14 days to 2026-08-15

| Date | Volume USD | Fees USD | TVL USD | Passive APR |
|---|---|---|---|---|
| 08-15 | 1,326,635 | 3,979.90 | 30,093,183 | 4.83% |
| 08-14 | 2,179,226 | 6,537.68 | 29,912,073 | 7.98% |
| 08-13 | 1,806,974 | 5,420.92 | 30,779,983 | 6.43% |
| 08-12 | 1,812,771 | 5,438.31 | 30,776,436 | 6.45% |
| 08-11 | 1,899,429 | 5,698.29 | 30,893,996 | 6.73% |
| 08-10 | 1,784,759 | 5,354.28 | 30,882,805 | 6.33% |
| 08-09 | 1,575,176 | 4,725.53 | 30,870,453 | 5.59% |
| 08-08 | 1,490,890 | 4,472.67 | 30,808,430 | 5.30% |
| 08-07 | 1,702,616 | 5,107.85 | 30,786,545 | 6.06% |
| 08-06 | 2,171,741 | 6,515.22 | 30,772,049 | 7.73% |
| 08-05 | 1,465,791 | 4,397.37 | 30,571,341 | 5.25% |
| 08-04 | 2,753,546 | 8,260.64 | 30,314,281 | 9.95% |
| 08-03 | 2,002,794 | 6,008.38 | 30,995,058 | 7.08% |
| 08-02 | 1,334,707 | 4,004.12 | 30,982,646 | 4.72% |

**Mean passive APR ≈ 6.4%**, range 4.7–9.95%. Stable, real, and generated by
genuine volume — not emissions.

That figure is fees ÷ *total* pool TVL, i.e. what a full-range LP earns. It is
the baseline Curtis has to beat by concentrating liquidity, and the honest
denominator for any performance claim.

## Liquidity reality check

Sorted by TVL, the entire chain has **three** economically meaningful pools:

| Pool | Ver | TVL | Volume | Txs |
|---|---|---|---|---|
| USDT/WBOT 0.3% | V3 | $30,093,185 | $235,740,466 | 1,499,889 |
| USDT/Money | V2 | $963,403 | $3,181,249 | 44,124 |
| CA/WBOT 1% | V3 | $3,230 | $640,339 | 15,070 |

Everything else is below $50 TVL — dust and test deployments.

**This kills cross-pool optimisation as a product.** An agent that "scans all
pools and picks the best risk-adjusted one" would return the same answer every
single time, and a judge will notice within a minute. The real decision surface
on this chain is *concentrated-liquidity range management within* the USDT/WBOT
pool: where to place ticks, when to re-centre, when to compound, when to widen
under volatility. See `README.md` for how the product follows from this.

## Toolchain constraints

**Compile for `paris`, not `cancun`.** Geth 1.5.13 does not support PUSH0.
Contracts compiled with default settings deploy successfully and then revert on
every call — a failure mode that costs hours because deployment appears to work.

Set in `foundry.toml`:
```toml
evm_version = "paris"
```

Blockscout verification ignores the API key (any non-empty string passes
validation) but requires explicit chain config. Wait ~5 confirmations before
verifying.

#!/usr/bin/env node
/**
 * Re-verify every pinned BOT Chain / BDEX constant against the live chain.
 *
 *   node scripts/verify-chain.mjs            # mainnet (677)
 *   node scripts/verify-chain.mjs --testnet  # Bohr testnet (968)
 *
 * Exits non-zero on any mismatch, so it can gate a deploy in CI. Run it before
 * every deploy: these addresses were read off-chain rather than published in
 * documentation, so nothing guarantees they stay put.
 *
 * BDEX *is* deployed on Bohr — the core contracts even share their mainnet
 * addresses. The tokens and pool do not, which is the whole reason this script
 * checks each network's set separately.
 */

const TESTNET = process.argv.includes("--testnet");

// Verified on-chain 2026-08-15.
const NETWORKS = {
  mainnet: {
    name: "BOT Chain mainnet",
    rpc: "https://rpc.botchain.ai",
    chainId: 677,
    explorer: "https://scan.botchain.ai",
    // Multicall3 is deployed here and genuinely absent on testnet.
    multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
    contracts: {
      positionManager: "0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090",
      v3Factory: "0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419",
      swapRouter: "0x07032d47A1b9f8460cBeE9dC17c1d3E438693929",
      pool: "0x64F418471a1A7932a190E10da5A8551dB5AbeC05",
      usdt: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
      wbot: "0xD5452816194a3784dBa983426cCe7c122F4abd30",
    },
  },
  testnet: {
    name: "Bohr testnet",
    rpc: "https://rpc.bohr.life",
    chainId: 968,
    explorer: "https://scan.bohr.life",
    multicall3: null,
    contracts: {
      // Core BDEX shares mainnet's addresses — same deployer, same nonces.
      positionManager: "0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090",
      v3Factory: "0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419",
      swapRouter: "0x07032d47A1b9f8460cBeE9dC17c1d3E438693929",
      // These two do NOT. The mainnet USDT address holds an unrelated
      // 18-decimal token ("Weslie"/WES) on this network.
      pool: "0xA83dAda88e1d71810dfe89699dCE4d4E589Dd890",
      usdt: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
      wbot: "0xD5452816194a3784dBa983426cCe7c122F4abd30",
    },
  },
};

const NET = TESTNET ? NETWORKS.testnet : NETWORKS.mainnet;
const C = NET.contracts;

const SELECTORS = {
  "factory()": "0xc45a0155",
  "WETH9()": "0x4aa4a4fc",
  "token0()": "0x0dfe1681",
  "token1()": "0xd21220a7",
  "fee()": "0xddca3f43",
  "tickSpacing()": "0xd0c93a7c",
  "liquidity()": "0x1a686502",
  "decimals()": "0x313ce567",
};

let rpcId = 0;
let failures = 0;

async function rpc(method, params) {
  const res = await fetch(NET.rpc, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result;
}

const call = (to, sel) => rpc("eth_call", [{ to, data: SELECTORS[sel] }, "latest"]);
const addrFrom = (word) => "0x" + word.slice(-40);
const intFrom = (word) => parseInt(word, 16);

function check(label, actual, expected) {
  const ok = String(actual).toLowerCase() === String(expected).toLowerCase();
  if (!ok) failures++;
  console.log(
    `  ${ok ? "OK  " : "FAIL"}  ${label.padEnd(34)} ${actual}${ok ? "" : `  (expected ${expected})`}`
  );
}

const report = (label, value) => console.log(`  ..    ${label.padEnd(34)} ${value}`);

async function main() {
  console.log(`\n=== ${NET.name} — ${NET.rpc}\n`);

  check("chainId", intFrom(await rpc("eth_chainId", [])), NET.chainId);

  const client = await rpc("web3_clientVersion", []);
  report("client", client);
  if (!/Geth\/v1\.5\./.test(client)) {
    console.log("        ^ client changed — re-check the PUSH0 / evm_version assumption");
  }

  report("head block", intFrom(await rpc("eth_blockNumber", [])).toLocaleString());
  report("gas price", `${intFrom(await rpc("eth_gasPrice", [])) / 1e9} gwei`);

  console.log("\n--- tokens ---");
  check("USDT decimals", intFrom(await call(C.usdt, "decimals()")), 6);
  check("WBOT decimals", intFrom(await call(C.wbot, "decimals()")), 18);

  console.log("\n--- BDEX wiring (each must agree with the others) ---");
  check("NFPM.factory()", addrFrom(await call(C.positionManager, "factory()")), C.v3Factory);
  check("NFPM.WETH9()", addrFrom(await call(C.positionManager, "WETH9()")), C.wbot);
  check("SwapRouter.factory()", addrFrom(await call(C.swapRouter, "factory()")), C.v3Factory);
  check("pool.token0()", addrFrom(await call(C.pool, "token0()")), C.usdt);
  check("pool.token1()", addrFrom(await call(C.pool, "token1()")), C.wbot);
  check("pool.fee()", intFrom(await call(C.pool, "fee()")), 3000);
  check("pool.tickSpacing()", intFrom(await call(C.pool, "tickSpacing()")), 60);

  const liq = BigInt(await call(C.pool, "liquidity()"));
  report("pool.liquidity()", liq.toString());
  if (liq === 0n) {
    failures++;
    console.log("        ^ FAIL: pool has no liquidity — nothing to test against");
  }

  console.log("\n--- code presence ---");
  for (const [name, addr] of Object.entries(C)) {
    const code = await rpc("eth_getCode", [addr, "latest"]);
    const has = code && code !== "0x";
    if (!has) failures++;
    console.log(
      `  ${has ? "OK  " : "FAIL"}  ${name.padEnd(34)} ${has ? `${(code.length - 2) / 2} bytes` : "NO CODE"}`
    );
  }

  console.log("\n--- multicall3 ---");
  const mcCode = NET.multicall3 ? await rpc("eth_getCode", [NET.multicall3, "latest"]) : "0x";
  const mcPresent = mcCode && mcCode !== "0x";
  if (NET.multicall3) {
    check("multicall3 deployed", mcPresent, true);
  } else {
    report("multicall3", "absent by design — frontend must not batch reads here");
  }

  // The trap worth failing loudly on: if the mainnet USDT address is ever
  // copied into the testnet set, this catches it before funds move.
  if (TESTNET) {
    console.log("\n--- testnet impersonation guard ---");
    const mainnetUsdt = NETWORKS.mainnet.contracts.usdt;
    const dec = intFrom(await call(mainnetUsdt, "decimals()"));
    report(`mainnet USDT addr on 968`, `${dec} decimals — NOT this network's USDT`);
    if (C.usdt.toLowerCase() === mainnetUsdt.toLowerCase()) {
      failures++;
      console.log("  FAIL  testnet set is using the mainnet USDT address");
    } else {
      console.log("  OK    testnet USDT is a distinct address");
    }
  }

  console.log(
    failures === 0
      ? "\nAll constants verified.\n"
      : `\n${failures} MISMATCH(ES) — do not deploy until resolved.\n`
  );
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error("\nverify-chain failed:", err.message, "\n");
  process.exit(1);
});

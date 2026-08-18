import { getAddress, type Address } from "viem";
import { ACTIVE_CHAIN_ID, type SupportedChainId } from "./chains";

/**
 * Mirror of contracts/src/BDEXAddresses.sol, kept in the same shape so the two
 * can be diffed by eye.
 *
 * The trap this guards, restated because it is genuinely dangerous:
 * `0xaBabc7Dd...` is canonical USDT (6 decimals) on mainnet 677, and a token
 * called "Weslie" (WES, 18 decimals) on Bohr 968. Selecting the whole set by
 * chain id, never by an individual env var, makes the mistake unreachable.
 */
export interface Deployment {
  positionManager: Address;
  v3Factory: Address;
  swapRouter: Address;
  pool: Address;
  usdt: Address;
  wbot: Address;
  /** Curtis's own factory. Null until deployed on that network. */
  curtisFactory: Address | null;
}

type RawDeployment = Record<Exclude<keyof Deployment, "curtisFactory">, string> & {
  curtisFactory: string | null;
};

/**
 * Every address is pushed through `getAddress` before it reaches the app.
 *
 * viem validates EIP-55 strictly: an address whose capitalisation does not
 * match its checksum fails `isAddress`, and the resulting error surfaces only
 * when a user clicks the button that finally uses it. `getAddress` recomputes
 * the checksum from any valid hex, so a hand-transcribed address with one
 * character in the wrong case is corrected here instead of failing at the point
 * of sale. It still throws on genuinely malformed input, at module load, which
 * is exactly when it should.
 */
function checksummed(raw: RawDeployment): Deployment {
  return {
    positionManager: getAddress(raw.positionManager),
    v3Factory: getAddress(raw.v3Factory),
    swapRouter: getAddress(raw.swapRouter),
    pool: getAddress(raw.pool),
    usdt: getAddress(raw.usdt),
    wbot: getAddress(raw.wbot),
    curtisFactory: raw.curtisFactory ? getAddress(raw.curtisFactory) : null,
  };
}

const DEPLOYMENTS: Record<SupportedChainId, Deployment> = {
  677: checksummed({
    positionManager: "0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090",
    v3Factory: "0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419",
    swapRouter: "0x07032d47A1b9f8460cBeE9dC17c1d3E438693929",
    pool: "0x64F418471a1A7932a190E10da5A8551dB5AbeC05",
    usdt: "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C",
    wbot: "0xD5452816194a3784dBa983426cCe7c122F4abd30",
    curtisFactory: null, // not deployed to mainnet yet
  }),
  968: checksummed({
    // Core BDEX shares mainnet's addresses: same deployer, same nonces.
    positionManager: "0xDAc3FcFF004d8a8675b94E44941A1a2e3b240090",
    v3Factory: "0x1C51c173323ec11BB4e3C4fD2314c225Dc4b5419",
    swapRouter: "0x07032d47A1b9f8460cBeE9dC17c1d3E438693929",
    // These two do not.
    pool: "0xA83dAda88e1d71810dfe89699dCE4d4E589Dd890",
    usdt: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
    wbot: "0xD5452816194a3784dBa983426cCe7c122F4abd30",
    curtisFactory: "0x3baD8bC89d24d75ca9d2958264A28977513Dd7F7",
  }),
};

export const addresses: Deployment = DEPLOYMENTS[ACTIVE_CHAIN_ID];

/** Token metadata. Decimals differ: USDT is 6, WBOT is 18. */
export const TOKENS = {
  usdt: { symbol: "USDT", decimals: 6, address: addresses.usdt },
  wbot: { symbol: "WBOT", decimals: 18, address: addresses.wbot },
} as const;

/** The pool Curtis manages: 0.3% fee tier, tick spacing 60. */
export const POOL_META = {
  feeTier: 3000,
  feeLabel: "0.3%",
  tickSpacing: 60,
} as const;

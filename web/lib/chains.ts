import { defineChain } from "viem";

/**
 * BOT Chain mainnet. Multicall3 is deployed here at the canonical
 * deterministic address — but genuinely absent on testnet, so it is declared
 * per-chain rather than globally.
 */
export const botChain = defineChain({
  id: 677,
  name: "BOT Chain",
  nativeCurrency: { name: "BOT", symbol: "BOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.botchain.ai"] } },
  blockExplorers: {
    default: {
      name: "BOT Scan",
      url: "https://scan.botchain.ai",
      apiUrl: "https://scan.botchain.ai/api",
    },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

/**
 * Bohr testnet. Note the domain: the testnet lives entirely on `bohr.life`,
 * not under `botchain.ai`. No multicall3 entry — it has no code there, and
 * declaring it would make every batched read fail.
 */
export const bohrTestnet = defineChain({
  id: 968,
  name: "BOT Chain Testnet",
  testnet: true,
  nativeCurrency: { name: "BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.bohr.life"] } },
  blockExplorers: {
    default: {
      name: "Bohr Scan",
      url: "https://scan.bohr.life",
      apiUrl: "https://scan.bohr.life/api",
    },
  },
});

/**
 * Typed as a literal union rather than `number`: wagmi's `switchChain` and
 * `useAccount` discriminate on the configured ids, and a widened `number`
 * silently breaks their inference.
 */
export type SupportedChainId = 677 | 968;

export const ACTIVE_CHAIN_ID: SupportedChainId =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 968) === 677 ? 677 : 968;

export const activeChain = ACTIVE_CHAIN_ID === 677 ? botChain : bohrTestnet;

export const isTestnet = ACTIVE_CHAIN_ID === 968;

export function explorerTx(hash: string): string {
  return `${activeChain.blockExplorers.default.url}/tx/${hash}`;
}

export function explorerAddress(address: string): string {
  return `${activeChain.blockExplorers.default.url}/address/${address}`;
}

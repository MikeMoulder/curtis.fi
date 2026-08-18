import { createConfig, http, cookieStorage, createStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { botChain, bohrTestnet } from "./chains";

/**
 * Both chains are registered deliberately: a user sitting on the wrong network
 * can then be *detected* and offered a switch, rather than silently transacting
 * somewhere unintended.
 *
 * `injected` with EIP-6963 discovery covers MetaMask, Rabby and OKX. On a chain
 * this niche, WalletConnect and RainbowKit add bundle weight and a project-id
 * dependency while reaching almost no additional users.
 */
export const wagmiConfig = createConfig({
  chains: [bohrTestnet, botChain],
  connectors: [injected({ shimDisconnect: true })],
  // The app server-renders; cookie storage avoids a hydration flash where the
  // wallet appears disconnected for a frame.
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  transports: {
    [botChain.id]: http(),
    [bohrTestnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

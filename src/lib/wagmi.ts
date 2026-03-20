import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "GEASS",
  projectId: "geass-privacy-agent", // WalletConnect project ID (optional for dev)
  chains: [baseSepolia],
  ssr: true,
});

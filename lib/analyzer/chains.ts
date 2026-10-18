export interface SupportedChain {
  id: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
}

export const SUPPORTED_CHAINS: SupportedChain[] = [
  {
    id: 1,
    name: "Ethereum",
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    explorerUrl: "https://etherscan.io",
  },
  {
    id: 8453,
    name: "Base",
    rpcUrl: "https://base-rpc.publicnode.com",
    explorerUrl: "https://basescan.org",
  },
  {
    id: 42161,
    name: "Arbitrum One",
    rpcUrl: "https://arbitrum-one-rpc.publicnode.com",
    explorerUrl: "https://arbiscan.io",
  },
  {
    id: 10,
    name: "Optimism",
    rpcUrl: "https://optimism-rpc.publicnode.com",
    explorerUrl: "https://optimistic.etherscan.io",
  },
  {
    id: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-bor-rpc.publicnode.com",
    explorerUrl: "https://polygonscan.com",
  },
  {
    id: 4663,
    name: "Robinhood Chain",
    rpcUrl: "https://rpc.mainnet.chain.robinhood.com",
    explorerUrl: "https://robinhoodchain.blockscout.com",
  },
];

export const CHAIN_BY_ID = new Map(SUPPORTED_CHAINS.map((c) => [c.id, c]));

import { SUPPORTED_CHAINS, type SupportedChain } from "./chains";
import type { AddressMention } from "./extract";
import type { ContractInfo, ContractParam, FunctionInfo } from "./types";

const SOURCIFY = "https://sourcify.dev/server/v2/contract";
const MAX_LOOKUPS = 80;
const MAX_SHOWN_TOKENS = 6;
const RPC_BATCH_SIZE = 50;
const MAX_FUNCTIONS = 60;

interface DeployedAt {
  chain: SupportedChain;
  address: string;
  mentions: number;
  /** Bytecode implements the ERC-20 basics, so there is no need to look it up */
  tokenLike: boolean;
}

const ERC20_SELECTORS = ["a9059cbb", "70a08231", "095ea7b3"]; // transfer, balanceOf, approve
const isTokenCode = (code: string) => ERC20_SELECTORS.every((sel) => code.includes(sel));

interface AbiParam {
  name?: string;
  type: string;
  components?: AbiParam[];
}

interface AbiEntry {
  type: string;
  name?: string;
  stateMutability?: string;
  inputs?: AbiParam[];
}

interface SourcifyContract {
  abi?: AbiEntry[];
  compilation?: { name?: string };
  proxyResolution?: {
    isProxy?: boolean;
    implementations?: { address: string; name?: string }[];
  };
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** One batched eth_getCode per chain tells us where each address is really a contract. */
export async function findDeployedContracts(
  addresses: AddressMention[],
  signal?: AbortSignal,
): Promise<{ deployed: DeployedAt[]; failedChains: string[] }> {
  const deployed: DeployedAt[] = [];
  const failedChains: string[] = [];

  await Promise.all(
    SUPPORTED_CHAINS.map(async (chain) => {
      try {
        for (let offset = 0; offset < addresses.length; offset += RPC_BATCH_SIZE) {
          const chunk = addresses.slice(offset, offset + RPC_BATCH_SIZE);
          const body = chunk.map((a, id) => ({
            jsonrpc: "2.0",
            id,
            method: "eth_getCode",
            params: [a.address, "latest"],
          }));
          const timeout = AbortSignal.timeout(15_000);
          const res = await fetch(chain.rpcUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
            signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
          });
          if (!res.ok) throw new Error(`RPC ${res.status}`);
          const replies = (await res.json()) as { id: number; result?: string }[];
          for (const reply of replies) {
            const code = reply.result;
            if (typeof code === "string" && code.length > 2) {
              const mention = chunk[reply.id];
              deployed.push({
                chain,
                address: mention.address,
                mentions: mention.count,
                tokenLike: isTokenCode(code.toLowerCase()),
              });
            }
          }
        }
      } catch {
        failedChains.push(chain.name);
      }
    }),
  );

  return { deployed, failedChains };
}

function typeString(p: AbiParam): string {
  if (p.type.startsWith("tuple")) {
    const inner = (p.components ?? []).map(typeString).join(",");
    return `(${inner})${p.type.slice("tuple".length)}`;
  }
  return p.type;
}

function summarizeAbi(abi: AbiEntry[]): { functions: FunctionInfo[]; eventCount: number } {
  const functions: FunctionInfo[] = abi
    .filter((e) => e.type === "function" && e.name)
    .map((e) => ({
      name: e.name as string,
      signature: `${e.name}(${(e.inputs ?? []).map(typeString).join(",")})`,
      stateMutability: e.stateMutability ?? "nonpayable",
    }));

  // State-changing functions say the most about what a protocol does
  const isRead = (f: FunctionInfo) => f.stateMutability === "view" || f.stateMutability === "pure";
  functions.sort((a, b) => Number(isRead(a)) - Number(isRead(b)));

  return {
    functions: functions.slice(0, MAX_FUNCTIONS),
    eventCount: abi.filter((e) => e.type === "event").length,
  };
}

const PAYOUT_NAME = /referr|feeto|feereceiver|feerecipient|treasury|collector|affiliate|partner|commission|payee/i;
const RECIPIENT_NAME = /recipient|receiver|beneficiar/i;
const FEE_NAME = /fee|bps|basispoint|commission|referr|affiliate/i;
const MAX_PARAMS = 8;

/** Finds inputs of state-changing functions that look like a payout address or a fee. */
function detectParams(abi: AbiEntry[]): ContractParam[] {
  const found: ContractParam[] = [];
  for (const entry of abi) {
    if (entry.type !== "function" || !entry.name) continue;
    if (entry.stateMutability === "view" || entry.stateMutability === "pure") continue;
    for (const input of entry.inputs ?? []) {
      const name = input.name;
      if (!name) continue;
      if (input.type === "address" && PAYOUT_NAME.test(name)) {
        found.push({ function: entry.name, param: name, type: input.type, kind: "payout" });
      } else if (input.type === "address" && RECIPIENT_NAME.test(name)) {
        found.push({ function: entry.name, param: name, type: input.type, kind: "recipient" });
      } else if (/^u?int\d*$/.test(input.type) && FEE_NAME.test(name)) {
        found.push({ function: entry.name, param: name, type: input.type, kind: "fee" });
      }
    }
  }
  const seen = new Set<string>();
  return found
    .filter((p) => !seen.has(p.function + ":" + p.param) && seen.add(p.function + ":" + p.param))
    .slice(0, MAX_PARAMS);
}

function classify(abi: AbiEntry[] | undefined, isProxy: boolean): ContractInfo["kind"] {
  const names = new Set((abi ?? []).filter((e) => e.type === "function").map((e) => e.name));
  if (names.has("transfer") && names.has("balanceOf") && names.has("approve")) return "token";
  return isProxy ? "proxy" : "contract";
}

async function fetchSourcify(
  chainId: number,
  address: string,
  signal?: AbortSignal,
): Promise<SourcifyContract | null> {
  try {
    const res = await fetch(
      `${SOURCIFY}/${chainId}/${address}?fields=abi,compilation,proxyResolution`,
      {
        signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000),
        headers: { accept: "application/json" },
      },
    );
    if (!res.ok) return null;
    return (await res.json()) as SourcifyContract;
  } catch {
    return null;
  }
}

// Generic plumbing that says little about what a protocol does
const INFRA_NAMES = new Set([
  "Multicall",
  "Multicall2",
  "Multicall3",
  "WETH",
  "WETH9",
  "WrappedEther",
  "ERC1967Proxy",
  "TransparentUpgradeableProxy",
  "UpgradeableProxy",
  "ProxyAdmin",
]);

export function isInfraName(name: string | null | undefined): boolean {
  return name != null && INFRA_NAMES.has(name);
}

function rank(c: ContractInfo): number {
  const name = c.implementation?.name ?? c.name ?? "";
  if (c.kind === "token") return 3;
  if (INFRA_NAMES.has(name) || INFRA_NAMES.has(c.name ?? "")) return 2;
  return c.verified ? 0 : 1;
}

/** Protocol logic first, then unverified, then infrastructure, then tokens. */
export function rankContracts(contracts: ContractInfo[]): ContractInfo[] {
  return [...contracts].sort((a, b) => rank(a) - rank(b) || b.mentions - a.mentions);
}

export async function describeContracts(
  deployed: DeployedAt[],
  signal?: AbortSignal,
  onDescribed?: (contract: ContractInfo) => void,
): Promise<ContractInfo[]> {
  const byMentions = (a: DeployedAt, b: DeployedAt) => b.mentions - a.mentions;
  const picked = deployed.filter((d) => !d.tokenLike).sort(byMentions).slice(0, MAX_LOOKUPS);
  const tokens: ContractInfo[] = deployed
    .filter((d) => d.tokenLike)
    .sort(byMentions)
    .slice(0, MAX_SHOWN_TOKENS)
    .map(({ chain, address, mentions }) => ({
      address,
      chainId: chain.id,
      chainName: chain.name,
      mentions,
      verified: false,
      name: null,
      kind: "token" as const,
      implementation: null,
      functions: [],
      params: [],
      eventCount: 0,
    }));

  const described = await describePicked(picked, signal, onDescribed);
  return [...described, ...tokens];
}

async function describePicked(
  picked: DeployedAt[],
  signal?: AbortSignal,
  onDescribed?: (contract: ContractInfo) => void,
): Promise<ContractInfo[]> {
  const describeOne = async ({ chain, address, mentions }: DeployedAt): Promise<ContractInfo> => {
    const base: ContractInfo = {
      address,
      chainId: chain.id,
      chainName: chain.name,
      mentions,
      verified: false,
      name: null,
      kind: "contract",
      implementation: null,
      functions: [],
      params: [],
      eventCount: 0,
    };

    const match = await fetchSourcify(chain.id, address, signal);
    if (!match?.abi) return base;

    const proxy = match.proxyResolution;
    const impl = proxy?.isProxy ? proxy.implementations?.[0] : undefined;
    let abi = match.abi;
    let implementation: ContractInfo["implementation"] = null;

    if (impl) {
      implementation = { address: impl.address, name: impl.name ?? null };
      const implMatch = await fetchSourcify(chain.id, impl.address, signal);
      // A proxy's own ABI is mostly admin plumbing; the implementation holds the real logic
      if (implMatch?.abi?.length) abi = implMatch.abi;
    }

    const { functions, eventCount } = summarizeAbi(abi);
    return {
      ...base,
      verified: true,
      name: match.compilation?.name ?? null,
      kind: classify(abi, Boolean(impl)),
      implementation,
      functions,
      // Token transfers all have a recipient, which says nothing about the protocol
      params: classify(abi, Boolean(impl)) === "token" ? [] : detectParams(abi),
      eventCount,
    };
  };

  return mapPool(picked, 8, async (item) => {
    const contract = await describeOne(item);
    onDescribed?.(contract);
    return contract;
  });
}

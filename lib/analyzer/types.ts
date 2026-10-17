export type StepId = "fetch" | "scan" | "chains" | "abis" | "summary";

export type StepStatus = "running" | "done" | "error" | "skipped";

export interface FunctionInfo {
  name: string;
  signature: string;
  stateMutability: string;
}

/** A function input that looks like a setting you could brand: a payout address or a fee. */
export interface ContractParam {
  function: string;
  param: string;
  type: string;
  /** payout: where a fee or referral goes. recipient: who receives an action's output. */
  kind: "payout" | "recipient" | "fee";
}

export interface ContractInfo {
  address: string;
  chainId: number;
  chainName: string;
  /** How many times the address appears in the app's code */
  mentions: number;
  verified: boolean;
  name: string | null;
  kind: "token" | "proxy" | "contract";
  implementation: { address: string; name: string | null } | null;
  functions: FunctionInfo[];
  params: ContractParam[];
  eventCount: number;
}

export interface ChainInfo {
  id: number;
  name: string;
  contracts: number;
}

export interface ProtocolSummary {
  name: string;
  category: string;
  oneLiner: string;
  description: string;
  keyFlows: { title: string; description: string; contracts: string[] }[];
  fees: { name: string; description: string; source: string }[];
  customization: {
    option: string;
    description: string;
    feasibility: "easy" | "moderate" | "hard";
  }[];
  caveats: string[];
}

export interface AnalysisResult {
  url: string;
  host: string;
  title: string | null;
  /** The site's own icon as a data URL */
  icon: string | null;
  libraries: string[];
  scriptsScanned: number;
  addressesFound: number;
  chains: ChainInfo[];
  contracts: ContractInfo[];
  summary: ProtocolSummary | null;
  /** Whether the summary came from Claude or from the built-in rules */
  summarySource: "ai" | "rules" | null;
  /** Set when there is nothing to summarize or the AI summary was unavailable */
  summaryNote: string | null;
}

export type FoundKind = "file" | "contract" | "abi";

export type AnalysisEvent =
  | { type: "step"; id: StepId; status: StepStatus; detail?: string }
  /** Something the analyzer just discovered, shown live while it works */
  | { type: "found"; kind: FoundKind; label: string }
  | { type: "result"; data: AnalysisResult }
  | { type: "error"; message: string };

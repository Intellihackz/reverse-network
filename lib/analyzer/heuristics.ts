import { isInfraName } from "./contracts";
import type { ContractInfo, FunctionInfo, ProtocolSummary } from "./types";

/**
 * Describes a protocol from what its verified contracts expose, with no AI.
 * Every statement here is derived from real function names, so nothing is invented.
 */

interface FlowDef {
  title: string;
  description: string;
  pattern: RegExp;
}

interface CategoryDef {
  category: string;
  blurb: string;
  signals: RegExp;
  nameSignals?: RegExp;
  flows: FlowDef[];
}

const CATEGORIES: CategoryDef[] = [
  {
    category: "Decentralized exchange",
    blurb: "lets users swap tokens and provide liquidity",
    signals: /swap|liquidity|createPool|createPair|getPool|getPair|exactInput|exactOutput|getAmountsOut|quote/i,
    nameSignals: /Router|Pair|Quoter|PositionManager|PoolManager|(?:Uniswap|Swap|Pool|Pair)\w*Factory/i,
    flows: [
      { title: "Swap tokens", description: "Trade one token for another through the protocol's pools.", pattern: /swap|exactInput|exactOutput|quote/i },
      { title: "Provide liquidity", description: "Deposit tokens into a pool to earn a share of trading fees.", pattern: /addLiquidity|increaseLiquidity|mint|createPool|createPair/i },
      { title: "Remove liquidity", description: "Withdraw a liquidity position and collect earned fees.", pattern: /removeLiquidity|decreaseLiquidity|burn|collect/i },
    ],
  },
  {
    category: "Lending and borrowing",
    blurb: "lets users supply assets to earn interest and borrow against collateral",
    signals: /borrow|repay|liquidationCall|flashLoan|collateral|getReserveData|getUserAccountData/i,
    nameSignals: /Lending|Comptroller|Reserve|Pool(?!Manager)/i,
    flows: [
      { title: "Supply and earn", description: "Deposit assets into the market to earn interest.", pattern: /^supply|^deposit|^mint/i },
      { title: "Borrow", description: "Take out a loan against deposited collateral.", pattern: /borrow/i },
      { title: "Repay", description: "Pay back a loan to free up collateral.", pattern: /repay/i },
      { title: "Liquidations", description: "Let third parties close out under-collateralized positions.", pattern: /liquidat/i },
      { title: "Flash loans", description: "Borrow and repay within a single transaction.", pattern: /flashLoan/i },
    ],
  },
  {
    category: "Staking",
    blurb: "lets users stake assets and earn rewards",
    signals: /stake|unstake|getReward|claimReward|requestWithdrawal|restake|validator|slash/i,
    flows: [
      { title: "Stake", description: "Lock up assets to take part and earn rewards.", pattern: /stake|submit|deposit/i },
      { title: "Unstake", description: "Request or complete a withdrawal of staked assets.", pattern: /unstake|requestWithdraw|withdraw/i },
      { title: "Claim rewards", description: "Collect rewards earned from staking.", pattern: /reward|claim/i },
    ],
  },
  {
    category: "Yield vault",
    blurb: "pools user deposits into strategies that earn yield",
    signals: /totalAssets|convertToShares|convertToAssets|previewDeposit|previewRedeem|harvest|strategy/i,
    flows: [
      { title: "Deposit", description: "Put assets in and receive vault shares.", pattern: /deposit|mint/i },
      { title: "Withdraw", description: "Redeem shares for the underlying assets.", pattern: /withdraw|redeem/i },
      { title: "Harvest yield", description: "Collect and reinvest what the strategy has earned.", pattern: /harvest|compound/i },
    ],
  },
  {
    category: "Cross-chain bridge",
    blurb: "moves assets or messages between chains",
    signals: /bridge|relay|fillRelay|depositV3|finalizeWithdrawal|proveWithdrawal|sendMessage|spokePool/i,
    nameSignals: /Bridge|SpokePool|Portal|Messenger|Gateway/i,
    flows: [
      { title: "Send across chains", description: "Lock or burn funds on the source chain.", pattern: /deposit|bridge|send|initiate/i },
      { title: "Fill on the destination", description: "Release funds on the destination chain.", pattern: /fill|relay|finalize|claim/i },
      { title: "Prove and finalize withdrawals", description: "Confirm that a withdrawal is valid before funds are released.", pattern: /prove|finalize/i },
    ],
  },
  {
    category: "Perpetuals and derivatives",
    blurb: "lets users trade leveraged positions",
    signals: /increasePosition|decreasePosition|openPosition|closePosition|liquidatePosition|funding|leverage|margin/i,
    flows: [
      { title: "Open or increase a position", description: "Take a leveraged position.", pattern: /open|increase/i },
      { title: "Close or reduce a position", description: "Exit all or part of a position.", pattern: /close|decrease/i },
      { title: "Liquidations", description: "Close positions that no longer meet margin requirements.", pattern: /liquidat/i },
    ],
  },
  {
    category: "NFT marketplace",
    blurb: "matches buyers and sellers of NFTs",
    signals: /fulfillOrder|fulfillBasicOrder|fulfillAdvancedOrder|matchOrders|cancelOrder|makeBid|acceptOffer/i,
    flows: [
      { title: "Fulfil orders", description: "Complete a listing or offer.", pattern: /fulfil|match|accept/i },
      { title: "Cancel orders", description: "Withdraw a listing or offer.", pattern: /cancel/i },
    ],
  },
  {
    category: "Governance",
    blurb: "lets token holders propose and vote on changes",
    signals: /propose|castVote|getVotes|delegateBySig|queue\b/i,
    flows: [
      { title: "Propose", description: "Submit a change for a vote.", pattern: /propose/i },
      { title: "Vote", description: "Cast votes on open proposals.", pattern: /vote/i },
      { title: "Execute", description: "Carry out an approved proposal.", pattern: /queue|execute/i },
    ],
  },
  {
    category: "Naming service",
    blurb: "registers and resolves human-readable names",
    signals: /setResolver|setAddr|setText|nameWrapper|resolve/i,
    nameSignals: /Resolver|Registrar|NameWrapper/i,
    flows: [
      { title: "Register names", description: "Claim or renew a name.", pattern: /register|renew/i },
      { title: "Resolve names", description: "Look up what a name points to.", pattern: /resolve|setAddr|setText/i },
    ],
  },
];

const FEE_PATTERN = /fee|treasury|referr|rebate|commission|spread|recipient/i;
// Matches the word "fee" without being a protocol fee setting
const NOT_A_FEE = /OnTransfer|basefee|gasfee|feeData/i;
// Plumbing that every contract has and that says nothing about what a protocol does
const GENERIC_ACTIONS = new Set([
  "initialize",
  "multicall",
  "aggregate",
  "transferOwnership",
  "renounceOwnership",
  "acceptOwnership",
  "setOwner",
  "upgradeTo",
  "upgradeToAndCall",
  "changeAdmin",
  "approve",
  "permit",
]);
const REFERRAL_PATTERN = /referr|feeTo|feeRecipient|recipient|rebate/i;

const isRead = (f: FunctionInfo) => f.stateMutability === "view" || f.stateMutability === "pure";

function contractName(c: ContractInfo) {
  return c.implementation?.name ?? c.name ?? "Unnamed contract";
}

// A contract belongs to a category on a matching name or at least two matching functions;
// one stray keyword match is not enough
function belongsTo(c: ContractInfo, def: CategoryDef): boolean {
  if (def.nameSignals?.test(contractName(c))) return true;
  const matched = new Set(c.functions.filter((f) => def.signals.test(f.name)).map((f) => f.name));
  return matched.size >= 2;
}

function pickCategory(contracts: ContractInfo[]): CategoryDef | null {
  let best: { def: CategoryDef; score: number } | null = null;

  for (const def of CATEGORIES) {
    const matched = new Set<string>();
    let nameScore = 0;
    for (const c of contracts) {
      if (def.nameSignals?.test(contractName(c))) nameScore += 1;
      for (const f of c.functions) {
        if (def.signals.test(f.name)) matched.add(f.name);
      }
    }
    const score = matched.size + nameScore;
    if (score >= 3 && (!best || score > best.score)) best = { def, score };
  }
  return best?.def ?? null;
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function summarizeByRules(
  host: string,
  title: string | null,
  contracts: ContractInfo[],
): ProtocolSummary | null {
  const logic = contracts.filter((c) => c.verified && c.kind !== "token");
  if (logic.length === 0) return null;

  const category = pickCategory(logic);
  const name =
    (title ?? host)
      .split(/[|–-]/)[0]
      .replace(/\s+(interface|app|dapp)$/i, "")
      .trim() || host;
  const chains = new Set(logic.map((c) => c.chainName));
  const distinct = new Set(logic.map(contractName)).size;
  const unverified = contracts.filter((c) => !c.verified && c.kind !== "token").length;

  const actions = new Map<string, number>();
  for (const c of logic) {
    if (category && !belongsTo(c, category)) continue;
    for (const f of c.functions) {
      if (!isRead(f) && !GENERIC_ACTIONS.has(f.name)) actions.set(f.name, (actions.get(f.name) ?? 0) + 1);
    }
  }
  const topActions = [...actions.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([n]) => n);

  const flows: ProtocolSummary["keyFlows"] = [];
  if (category) {
    for (const flow of category.flows) {
      const names = new Set<string>();
      for (const c of logic) {
        if (!belongsTo(c, category)) continue;
        if (c.functions.some((f) => !isRead(f) && flow.pattern.test(f.name))) names.add(contractName(c));
      }
      if (names.size > 0) {
        flows.push({ title: flow.title, description: flow.description, contracts: [...names].slice(0, 4) });
      }
    }
  } else if (topActions.length > 0) {
    flows.push({
      title: "Main actions",
      description: `The state-changing functions used most across its contracts: ${topActions.join(", ")}.`,
      contracts: [...new Set(logic.map(contractName))].slice(0, 4),
    });
  }

  const feeFns = new Map<string, { contract: string; mutability: string }>();
  for (const c of logic) {
    if (isInfraName(contractName(c))) continue;
    if (category && !belongsTo(c, category)) continue;
    for (const f of c.functions) {
      if (FEE_PATTERN.test(f.name) && !NOT_A_FEE.test(f.name) && !feeFns.has(f.name)) {
        feeFns.set(f.name, { contract: contractName(c), mutability: f.stateMutability });
      }
    }
  }
  const fees: ProtocolSummary["fees"] = [...feeFns.entries()].slice(0, 6).map(([fn, info]) => ({
    name: fn,
    description:
      info.mutability === "view" || info.mutability === "pure"
        ? "Reads a fee-related setting, so the protocol has a configurable fee or recipient here."
        : "Changes a fee-related setting. This is usually restricted to the protocol's admin.",
    source: info.contract,
  }));
  const hasReferralHook = [...feeFns.keys()].some((n) => REFERRAL_PATTERN.test(n));

  const proxies = logic.filter((c) => c.kind === "proxy").length;
  const caveats = [
    "This summary is generated from the contracts' function names, not by AI. It shows what the contracts expose, not how the protocol is meant to be used.",
  ];
  if (unverified > 0) {
    caveats.push(`${plural(unverified, "contract")} had no verified source and ${unverified === 1 ? "is" : "are"} left out of this summary.`);
  }
  if (proxies > 0) {
    caveats.push(`${plural(proxies, "contract")} ${proxies === 1 ? "is an" : "are"} upgradeable prox${proxies === 1 ? "y" : "ies"}, so behavior can change when the owner upgrades.`);
  }
  caveats.push("Only contracts referenced in the app's code are covered. Contracts it discovers at runtime are not.");

  return {
    name,
    category: category?.category ?? "Smart contract application",
    oneLiner: category
      ? `${name} ${category.blurb}.`
      : `${name} is built on ${plural(distinct, "distinct verified contract")}.`,
    description: `Found ${plural(distinct, "distinct verified contract")} (${plural(logic.length, "deployment")}) across ${[...chains].join(", ")}.${
      topActions.length ? ` The functions that change state most often are ${topActions.join(", ")}.` : ""
    }`,
    keyFlows: flows,
    fees,
    customization: [
      {
        option: "Branding, theme and copy",
        description: "Your name, logo, colors and wording live entirely in the frontend.",
        feasibility: "easy",
      },
      {
        option: "Token list",
        description: "Choose which tokens appear in your version. The contracts accept any token they support.",
        feasibility: "easy",
      },
      {
        option: "Supported chains",
        description: `The original runs on ${plural(chains.size, "chain")} (${[...chains].join(", ")}). Your version can offer a subset.`,
        feasibility: "moderate",
      },
      {
        option: "Fee recipient or referral",
        description: hasReferralHook
          ? "The contracts expose fee or recipient settings, so a referral or fee recipient may be possible. Check which ones accept a caller-supplied address."
          : "No obvious referral or recipient hook was found. A fee would need to be added in the frontend, for example as a separate transfer.",
        feasibility: hasReferralHook ? "moderate" : "hard",
      },
      {
        option: "Changing contract logic",
        description: "A white-label frontend uses the original, unchanged contracts. Changing how they behave means deploying your own.",
        feasibility: "hard",
      },
    ],
    caveats,
  };
}

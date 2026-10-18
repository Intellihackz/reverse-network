import type { Project } from "@/lib/projects";

import type { ZipEntry } from "./zip";

const SOURCIFY = "https://sourcify.dev/server/v2/contract";
const MAX_CONTRACTS = 25;
const MAX_TOTAL_CHARS = 10_000_000;
const CONCURRENCY = 4;

export interface ContractUnit {
  role: "contract" | "implementation";
  chainId: number;
  address: string;
  /** For an implementation: the proxy that points to it */
  proxy?: string;
  name: string;
  language: string;
  compiler: string;
  compilerVersion: string;
  abi: unknown[];
  sources: Record<string, string>;
}

interface RawContract {
  abi?: unknown[];
  sources?: Record<string, { content?: string }>;
  compilation?: {
    name?: string;
    language?: string;
    compiler?: string;
    compilerVersion?: string;
  };
  proxyResolution?: {
    isProxy?: boolean;
    implementations?: { address: string }[];
  };
}

async function fetchRaw(
  chainId: number,
  address: string,
  signal?: AbortSignal,
): Promise<RawContract | null> {
  const res = await fetch(
    SOURCIFY +
      "/" +
      chainId +
      "/" +
      address +
      "?fields=abi,sources,compilation,proxyResolution",
    {
      signal,
    },
  );
  if (!res.ok) return null;
  return (await res.json()) as RawContract;
}

function toUnit(
  role: ContractUnit["role"],
  chainId: number,
  address: string,
  raw: RawContract,
  proxy?: string,
): ContractUnit {
  const sources: Record<string, string> = {};
  for (const [path, file] of Object.entries(raw.sources ?? {})) {
    if (typeof file?.content === "string") sources[path] = file.content;
  }
  return {
    role,
    chainId,
    address,
    proxy,
    name: raw.compilation?.name ?? "Contract",
    language: raw.compilation?.language ?? "Solidity",
    compiler: raw.compilation?.compiler ?? "solc",
    compilerVersion: raw.compilation?.compilerVersion ?? "unknown",
    abi: Array.isArray(raw.abi) ? raw.abi : [],
    sources,
  };
}

// One request set per address for the life of the page, so reopening files or downloading is instant
const cache = new Map<string, Promise<ContractUnit[] | null>>();

function loadContract(
  chainId: number,
  address: string,
): Promise<ContractUnit[] | null> {
  const key = chainId + ":" + address.toLowerCase();
  let pending = cache.get(key);
  if (!pending) {
    pending = (async () => {
      const main = await fetchRaw(chainId, address);
      if (!main || (main.abi?.length ?? 0) === 0) return null;
      const units = [toUnit("contract", chainId, address, main)];
      const impl = main.proxyResolution?.isProxy
        ? main.proxyResolution.implementations?.[0]?.address
        : undefined;
      if (impl) {
        const raw = await fetchRaw(chainId, impl);
        if (raw && (raw.abi?.length ?? 0) > 0)
          units.push(toUnit("implementation", chainId, impl, raw, address));
      }
      return units;
    })().catch(() => {
      cache.delete(key);
      return null;
    });
    cache.set(key, pending);
  }
  return pending;
}

export interface ContractBundle {
  units: ContractUnit[];
  skipped: {
    title: string;
    chainId: number;
    address: string;
    reason: string;
  }[];
}

/** Verified contracts first, on the chains the project keeps. */
function pickContracts(project: Project) {
  const chains = new Set(project.brand.chains);
  const all = (project.findings?.contracts ?? []).filter((c) =>
    chains.has(c.chainId),
  );
  return [...all.filter((c) => c.verified), ...all.filter((c) => !c.verified)];
}

/** Downloads the verified source and ABI of each contract from Sourcify. */
export async function fetchContractBundle(
  project: Project,
  signal?: AbortSignal,
): Promise<ContractBundle> {
  const picked = pickContracts(project);
  const bundle: ContractBundle = { units: [], skipped: [] };
  const work = picked.slice(0, MAX_CONTRACTS);

  for (const c of picked.slice(MAX_CONTRACTS)) {
    bundle.skipped.push({
      title: c.title,
      chainId: c.chainId,
      address: c.address,
      reason: "over the limit of " + MAX_CONTRACTS,
    });
  }

  let chars = 0;
  let next = 0;
  const results: (ContractUnit[] | null)[] = new Array(work.length).fill(null);
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, work.length) },
    async () => {
      while (next < work.length) {
        const i = next++;
        if (signal?.aborted) return;
        if (!work[i].verified) continue;
        results[i] = await loadContract(work[i].chainId, work[i].address);
      }
    },
  );
  await Promise.all(workers);

  work.forEach((c, i) => {
    const units = results[i];
    if (!c.verified) {
      bundle.skipped.push({
        title: c.title,
        chainId: c.chainId,
        address: c.address,
        reason: "not verified, so there is no published source",
      });
    } else if (!units) {
      bundle.skipped.push({
        title: c.title,
        chainId: c.chainId,
        address: c.address,
        reason: "its source could not be loaded",
      });
    } else {
      const size = units.reduce(
        (n, u) =>
          n + Object.values(u.sources).reduce((m, s) => m + s.length, 0),
        0,
      );
      if (chars + size > MAX_TOTAL_CHARS) {
        bundle.skipped.push({
          title: c.title,
          chainId: c.chainId,
          address: c.address,
          reason: "left out to keep the download small",
        });
      } else {
        chars += size;
        bundle.units.push(...units);
      }
    }
  });

  return bundle;
}

/** A path that is safe to write inside the zip: no drive letters, no climbing out of the folder. */
function safePath(path: string): string {
  const parts = path
    .replace(/\\/g, "/")
    .split("/")
    .map((p) => p.replace(/[^A-Za-z0-9._@+-]/g, "_"))
    .filter((p) => p !== "" && p !== "." && p !== "..");
  return parts.join("/") || "source";
}

const slug = (s: string) =>
  s.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 40) || "Contract";
const dirOf = (u: ContractUnit) =>
  u.chainId + "-" + slug(u.name) + "-" + u.address.slice(2, 8).toLowerCase();

const README = (project: Project, bundle: ContractBundle) => {
  const rows = bundle.units
    .map(
      (u) =>
        "| " +
        u.name +
        (u.role === "implementation" ? " (implementation)" : "") +
        " | " +
        u.chainId +
        " | `" +
        u.address +
        "` | " +
        u.language +
        " " +
        u.compilerVersion +
        " | `src/" +
        dirOf(u) +
        "/` |",
    )
    .join("\n");
  const skipped = bundle.skipped.length
    ? "\n## Not included\n\n" +
      bundle.skipped
        .map(
          (s) =>
            "- " +
            s.title +
            " on chain " +
            s.chainId +
            " (`" +
            s.address +
            "`): " +
            s.reason,
        )
        .join("\n") +
      "\n"
    : "";
  const first = bundle.units[0];
  const rpc = first ? "<RPC_URL for chain " + first.chainId + ">" : "<RPC_URL>";
  return `# Contracts

The contracts behind ${project.source.host} that this app talks to, as published by their authors.

Everything here is **verified source**: the Solidity (or Vyper) that was submitted to [Sourcify](https://sourcify.dev) and matched to the bytecode on-chain. Nothing was decompiled or guessed.

| Contract | Chain | Address | Compiler | Source |
| --- | --- | --- | --- | --- |
${rows || "| none | | | | |"}

## Layout

- \`src/<chain>-<name>-<address>/\` holds each contract's source files with their original paths.
- \`abis/\` holds one ABI JSON file per contract.
- \`addresses.json\` lists every contract with its address and where its files are.

For a proxy, both the proxy and its implementation are included. The implementation holds the logic.

## Try it

With [Foundry](https://getfoundry.sh):

\`\`\`bash
cast call ${first ? first.address : "<ADDRESS>"} "name()(string)" --rpc-url ${rpc}
\`\`\`

## Read this first

- This is a reference copy, not a ready-to-compile project. Imports of other packages may need remappings.
- Source files keep their authors' licenses. Check the SPDX line at the top of each file before you reuse any code.
${skipped}`;
};

/** Turns fetched contracts into files under contracts/ for the zip and the code view. */
export function buildContractFiles(
  project: Project,
  bundle: ContractBundle,
): ZipEntry[] {
  const files: ZipEntry[] = [];
  const index: unknown[] = [];

  for (const u of bundle.units) {
    const dir = dirOf(u);
    for (const [path, content] of Object.entries(u.sources)) {
      files.push({
        path: "contracts/src/" + dir + "/" + safePath(path),
        content,
      });
    }
    files.push({
      path: "contracts/abis/" + dir + ".json",
      content: JSON.stringify(u.abi, null, 2) + "\n",
    });
    index.push({
      name: u.name,
      role: u.role,
      chainId: u.chainId,
      address: u.address,
      proxy: u.proxy ?? null,
      compiler: u.compiler + " " + u.compilerVersion,
      language: u.language,
      source: "src/" + dir + "/",
      abi: "abis/" + dir + ".json",
    });
  }

  files.push({
    path: "contracts/addresses.json",
    content: JSON.stringify(index, null, 2) + "\n",
  });
  files.push({ path: "contracts/README.md", content: README(project, bundle) });
  return files;
}

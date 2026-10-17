/**
 * Source for the downloadable app. Kept as strings so the zip can be built in the browser.
 * The code inside avoids backticks and dollar-brace so it can sit in these literals.
 */

export const TEMPLATE_FILES: Record<string, string> = {
  ".gitignore": String.raw`node_modules
.next
.env.local
next-env.d.ts
`,

  ".env.example": String.raw`# Optional: use your own RPC endpoints instead of the public defaults.
NEXT_PUBLIC_RPC_1=
NEXT_PUBLIC_RPC_8453=
NEXT_PUBLIC_RPC_42161=
NEXT_PUBLIC_RPC_10=
NEXT_PUBLIC_RPC_137=
`,

  "next.config.mjs": String.raw`/** @type {import('next').NextConfig} */
const nextConfig = {};

export default nextConfig;
`,

  "tsconfig.json": String.raw`{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`,

  "app/layout.tsx": String.raw`import type { Metadata } from "next";

import config from "@/reverse.config.json";
import "./globals.css";

export const metadata: Metadata = {
  title: config.brand.name,
  description: config.brand.tagline,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme={config.brand.theme} data-font={config.brand.font} data-radius={config.brand.radius}>
      <body>{children}</body>
    </html>
  );
}
`,

  "app/page.tsx": String.raw`import App from "@/components/app";

export default function Page() {
  return <App />;
}
`,

  "app/globals.css": String.raw`:root {
  --font: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --r-card: 20px;
  --r-ctl: 12px;
  --bg: #ffffff;
  --fg: #111111;
  --muted: #6b7280;
  --surface: #f5f5f5;
  --border: #e5e7eb;
}

:root[data-theme="dark"] {
  --bg: #0b0b0c;
  --fg: #f4f4f5;
  --muted: #9ca3af;
  --surface: #151517;
  --border: #27272a;
}

:root[data-font="serif"] { --font: Georgia, "Times New Roman", serif; }
:root[data-font="mono"] { --font: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
:root[data-radius="sharp"] { --r-card: 4px; --r-ctl: 4px; }
:root[data-radius="pill"] { --r-card: 24px; --r-ctl: 999px; }

* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font);
  line-height: 1.5;
}

button, input, select, textarea { font: inherit; color: inherit; }

.wrap { max-width: 56rem; margin: 0 auto; padding: 1.5rem 1.25rem 5rem; }

.top { display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; }
.logo { width: 2.75rem; height: 2.75rem; border-radius: var(--r-ctl); object-fit: cover; }
.mark {
  display: grid; place-items: center; width: 2.75rem; height: 2.75rem;
  border-radius: var(--r-ctl); background: var(--brand); color: var(--on-brand);
  font-weight: 800; font-size: 1.25rem;
}
.title { margin: 0; font-size: 1.375rem; line-height: 1.2; }
.tagline { margin: 0.125rem 0 0; color: var(--muted); font-size: 0.9375rem; }
.grow { flex: 1; min-width: 0; }

.btn {
  border: 1px solid transparent; cursor: pointer; padding: 0.625rem 1.125rem;
  border-radius: var(--r-ctl); font-weight: 700; background: var(--brand); color: var(--on-brand);
}
.btn:hover:not(:disabled) { filter: brightness(1.08); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn.ghost { background: transparent; color: var(--fg); border-color: var(--border); }

:where(a, button, input, select, textarea, summary):focus-visible {
  outline: 2px solid var(--brand); outline-offset: 2px;
}

.tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin: 1.75rem 0 1rem; }
.tab {
  border: 1px solid var(--border); background: transparent; cursor: pointer;
  padding: 0.4375rem 0.875rem; border-radius: 999px; font-size: 0.875rem; font-weight: 600;
}
.tab[aria-pressed="true"] { background: var(--brand); color: var(--on-brand); border-color: var(--brand); }

.note {
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-card);
  padding: 0.875rem 1rem; color: var(--muted); font-size: 0.875rem; margin: 0 0 1rem;
}
.error { color: #dc2626; font-size: 0.875rem; margin: 0.5rem 0 0; overflow-wrap: anywhere; }

.card { border: 1px solid var(--border); border-radius: var(--r-card); background: var(--surface); margin-bottom: 0.875rem; }
.card > summary {
  list-style: none; cursor: pointer; padding: 1rem 1.125rem; display: flex; align-items: center;
  gap: 0.75rem; flex-wrap: wrap;
}
.card > summary::-webkit-details-marker { display: none; }
.card-title { font-weight: 700; }
.addr { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8125rem; color: var(--muted); overflow-wrap: anywhere; }
.badge { font-size: 0.75rem; border: 1px solid var(--border); padding: 0.0625rem 0.5rem; border-radius: 999px; color: var(--muted); }
.card-body { padding: 0 1.125rem 1.125rem; }

.search {
  width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--border);
  border-radius: var(--r-ctl); background: var(--bg); margin-bottom: 1rem;
}

.group-title { margin: 1.25rem 0 0.5rem; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }

.fn { border: 1px solid var(--border); border-radius: var(--r-ctl); background: var(--bg); margin-bottom: 0.5rem; }
.fn > summary { list-style: none; cursor: pointer; padding: 0.625rem 0.875rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem; }
.fn > summary::-webkit-details-marker { display: none; }
.fn-body { padding: 0 0.875rem 0.875rem; }
.field { display: block; margin-bottom: 0.625rem; font-size: 0.8125rem; color: var(--muted); }
.field input, .field textarea, .field select {
  display: block; width: 100%; margin-top: 0.25rem; padding: 0.5rem 0.75rem;
  border: 1px solid var(--border); border-radius: var(--r-ctl); background: var(--bg);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem;
}
.result {
  margin: 0.75rem 0 0; padding: 0.75rem; background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-ctl); font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.8125rem;
  white-space: pre-wrap; overflow-wrap: anywhere; max-height: 16rem; overflow: auto;
}
.foot { margin-top: 3rem; color: var(--muted); font-size: 0.8125rem; }
.foot a { color: inherit; }
`,

  "lib/chains.ts": String.raw`import { defineChain, type Chain } from "viem";

import config from "@/reverse.config.json";

// Next only inlines env vars it can see by name, so each override is listed out.
const RPC_OVERRIDES: Record<number, string | undefined> = {
  1: process.env.NEXT_PUBLIC_RPC_1,
  8453: process.env.NEXT_PUBLIC_RPC_8453,
  42161: process.env.NEXT_PUBLIC_RPC_42161,
  10: process.env.NEXT_PUBLIC_RPC_10,
  137: process.env.NEXT_PUBLIC_RPC_137,
};

export const CHAINS: Chain[] = config.chains.map((c) =>
  defineChain({
    id: c.id,
    name: c.name,
    nativeCurrency:
      c.id === 137
        ? { name: "POL", symbol: "POL", decimals: 18 }
        : { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [RPC_OVERRIDES[c.id] || c.rpcUrl] } },
    blockExplorers: { default: { name: "Explorer", url: c.explorerUrl } },
  }),
);

export const chainById = (id: number) => CHAINS.find((c) => c.id === id);
`,

  "lib/abi.ts": String.raw`import { isAddress, isHex, type Abi, type AbiFunction, type AbiParameter } from "viem";

const SOURCIFY = "https://sourcify.dev/server/v2/contract";

export interface LoadedAbi {
  abi: Abi;
  /** Set when the address is a proxy: calls go to the proxy, the ABI comes from here */
  implementation?: string;
}

async function sourcify(chainId: number, address: string) {
  const res = await fetch(
    SOURCIFY + "/" + chainId + "/" + address + "?fields=abi,proxyResolution",
  );
  if (!res.ok) return null;
  return (await res.json()) as {
    abi?: Abi;
    proxyResolution?: { isProxy?: boolean; implementations?: { address: string }[] };
  };
}

const sig = (item: Abi[number]) =>
  item.type + ":" + ("name" in item ? item.name : "") + ":" +
  ("inputs" in item ? item.inputs.map((i) => i.type).join(",") : "");

/** Loads a verified ABI from Sourcify, merging in the implementation's ABI for proxies. */
export async function loadAbi(chainId: number, address: string): Promise<LoadedAbi | null> {
  const main = await sourcify(chainId, address);
  if (!main) return null;
  let abi: Abi = Array.isArray(main.abi) ? main.abi : [];
  const impl = main.proxyResolution?.isProxy
    ? main.proxyResolution.implementations?.[0]?.address
    : undefined;

  if (impl) {
    const implMatch = await sourcify(chainId, impl);
    if (implMatch && Array.isArray(implMatch.abi)) {
      const seen = new Set(abi.map(sig));
      abi = [...abi, ...implMatch.abi.filter((item) => !seen.has(sig(item)))];
    }
  }
  return abi.length > 0 ? { abi, implementation: impl } : null;
}

export const isReadFn = (fn: AbiFunction) => fn.stateMutability === "view" || fn.stateMutability === "pure";

export const functionsOf = (abi: Abi): AbiFunction[] =>
  abi.filter((item): item is AbiFunction => item.type === "function");

export function signature(fn: AbiFunction): string {
  return fn.name + "(" + fn.inputs.map((i) => i.type + (i.name ? " " + i.name : "")).join(", ") + ")";
}

const isComplex = (p: AbiParameter) => p.type.endsWith("]") || p.type.startsWith("tuple");

function convert(p: AbiParameter, value: unknown): unknown {
  if (p.type.endsWith("]")) {
    if (!Array.isArray(value)) throw new Error(p.type + " needs a JSON array");
    const inner = { ...p, type: p.type.slice(0, p.type.lastIndexOf("[")) } as AbiParameter;
    return value.map((v) => convert(inner, v));
  }
  if (p.type === "tuple") {
    const components = (p as AbiParameter & { components: readonly AbiParameter[] }).components;
    return components.map((c, i) => {
      const v = Array.isArray(value) ? value[i] : (value as Record<string, unknown>)[c.name ?? ""];
      return convert(c, v);
    });
  }
  if (p.type.startsWith("uint") || p.type.startsWith("int")) return BigInt(String(value).trim());
  if (p.type === "bool") return value === true || String(value).trim() === "true";
  if (p.type === "address") {
    const text = String(value).trim();
    if (!isAddress(text)) throw new Error("Not a valid address: " + text);
    return text;
  }
  if (p.type.startsWith("bytes")) {
    const text = String(value).trim();
    if (!isHex(text)) throw new Error("Bytes must be hex starting with 0x");
    return text;
  }
  return String(value);
}

/** Turns what was typed in a form field into the value viem expects. */
export function parseArg(p: AbiParameter, text: string): unknown {
  try {
    if (isComplex(p)) return convert(p, JSON.parse(text));
    return convert(p, text);
  } catch (e) {
    const label = p.name || p.type;
    throw new Error(label + ": " + (e instanceof Error ? e.message : "invalid value"));
  }
}

export const placeholderFor = (p: AbiParameter) =>
  isComplex(p) ? "JSON, e.g. " + (p.type.endsWith("]") ? "[]" : "[]") : p.type;

export function formatResult(value: unknown): string {
  if (value === undefined) return "(no return value)";
  return JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2);
}
`,

  "lib/wallet.ts": String.raw`"use client";

import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, type Address, type Chain, type EIP1193Provider } from "viem";

declare global {
  interface Window {
    ethereum?: EIP1193Provider;
  }
}

export function useWallet() {
  const [available, setAvailable] = useState(false);
  const [account, setAccount] = useState<Address | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) return;
    setAvailable(true);

    const onAccounts = (accounts: unknown) => {
      const list = accounts as Address[];
      setAccount(list[0] ?? null);
    };
    const onChain = (id: unknown) => setChainId(Number(id));

    provider.request({ method: "eth_accounts" }).then(onAccounts).catch(() => {});
    provider.request({ method: "eth_chainId" }).then(onChain).catch(() => {});
    provider.on("accountsChanged", onAccounts);
    provider.on("chainChanged", onChain);
    return () => {
      provider.removeListener("accountsChanged", onAccounts);
      provider.removeListener("chainChanged", onChain);
    };
  }, []);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) throw new Error("No wallet found. Install a browser wallet to continue.");
    const accounts = (await provider.request({ method: "eth_requestAccounts" })) as Address[];
    setAccount(accounts[0] ?? null);
  }, []);

  const ensureChain = useCallback(async (chain: Chain) => {
    const provider = window.ethereum;
    if (!provider) throw new Error("No wallet found.");
    const current = Number(await provider.request({ method: "eth_chainId" }));
    if (current === chain.id) return;
    const hexId = "0x" + chain.id.toString(16);
    try {
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: hexId }] });
    } catch (e) {
      if ((e as { code?: number }).code !== 4902) throw e;
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: hexId,
            chainName: chain.name,
            nativeCurrency: chain.nativeCurrency,
            rpcUrls: chain.rpcUrls.default.http,
            blockExplorerUrls: chain.blockExplorers ? [chain.blockExplorers.default.url] : [],
          },
        ],
      });
    }
  }, []);

  const walletClient = useCallback(
    (chain: Chain) => {
      const provider = window.ethereum;
      if (!provider || !account) throw new Error("Connect your wallet first.");
      return createWalletClient({ account, chain, transport: custom(provider) });
    },
    [account],
  );

  return { available, account, chainId, connect, ensureChain, walletClient };
}

export type Wallet = ReturnType<typeof useWallet>;
`,

  "components/function-form.tsx": String.raw`"use client";

import { useState } from "react";
import { createPublicClient, http, parseEther, type Abi, type AbiFunction, type Address, type Chain } from "viem";

import { formatResult, isReadFn, parseArg, placeholderFor, signature } from "@/lib/abi";
import type { Wallet } from "@/lib/wallet";

interface Props {
  chain: Chain;
  address: Address;
  abi: Abi;
  fn: AbiFunction;
  wallet: Wallet;
  /** Prefilled inputs from the brand settings, keyed "function:param" */
  defaults?: Record<string, string>;
}

export default function FunctionForm({ chain, address, abi, fn, wallet, defaults }: Props) {
  const read = isReadFn(fn);
  const [values, setValues] = useState<string[]>(() =>
    fn.inputs.map((p) => defaults?.[fn.name + ":" + p.name] ?? ""),
  );
  const [ether, setEther] = useState("");
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setOutput(null);
    setTxHash(null);
    try {
      const args = fn.inputs.map((p, i) => parseArg(p, values[i] ?? ""));
      if (read) {
        const client = createPublicClient({ chain, transport: http() });
        const result = await client.readContract({ address, abi, functionName: fn.name, args });
        setOutput(formatResult(result));
      } else {
        await wallet.ensureChain(chain);
        const client = wallet.walletClient(chain);
        const hash = await client.writeContract({
          address,
          abi,
          functionName: fn.name,
          args,
          chain,
          account: client.account,
          ...(fn.stateMutability === "payable" && ether.trim() ? { value: parseEther(ether.trim()) } : {}),
        });
        setTxHash(hash);
      }
    } catch (err) {
      const e2 = err as { shortMessage?: string; message?: string };
      setError(e2.shortMessage ?? e2.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const explorer = chain.blockExplorers?.default.url;

  return (
    <details className="fn">
      <summary>{signature(fn)}</summary>
      <form className="fn-body" onSubmit={run}>
        {fn.inputs.map((p, i) => (
          <label key={i} className="field">
            {p.name || "arg" + i} <span>({p.type})</span>
            <input
              value={values[i]}
              placeholder={placeholderFor(p)}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setValues((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
            />
          </label>
        ))}
        {fn.stateMutability === "payable" && (
          <label className="field">
            Value to send ({chain.nativeCurrency.symbol})
            <input value={ether} placeholder="0.0" inputMode="decimal" onChange={(e) => setEther(e.target.value)} />
          </label>
        )}
        <button className="btn" type="submit" disabled={busy || (!read && !wallet.account)}>
          {busy ? "Working..." : read ? "Read" : wallet.account ? "Send transaction" : "Connect a wallet to write"}
        </button>
        {output !== null && <pre className="result">{output}</pre>}
        {txHash && (
          <p className="result">
            Sent.{" "}
            {explorer ? (
              <a href={explorer + "/tx/" + txHash} target="_blank" rel="noreferrer">
                View transaction
              </a>
            ) : (
              txHash
            )}
          </p>
        )}
        {error && <p role="alert" className="error">{error}</p>}
      </form>
    </details>
  );
}
`,

  "components/contract-card.tsx": String.raw`"use client";

import { useState } from "react";
import type { Abi, Address, Chain } from "viem";

import { functionsOf, isReadFn, loadAbi } from "@/lib/abi";
import type { Wallet } from "@/lib/wallet";
import FunctionForm from "@/components/function-form";

interface Props {
  title: string;
  chain: Chain;
  address: Address;
  wallet: Wallet;
  defaults?: Record<string, string>;
}

export default function ContractCard({ title, chain, address, wallet, defaults }: Props) {
  const [abi, setAbi] = useState<Abi | null>(null);
  const [implementation, setImplementation] = useState<string | undefined>();
  const [state, setState] = useState<"idle" | "loading" | "missing" | "ready">("idle");
  const [query, setQuery] = useState("");
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);

  async function load() {
    if (state !== "idle") return;
    setState("loading");
    try {
      const loaded = await loadAbi(chain.id, address);
      if (loaded) {
        setAbi(loaded.abi);
        setImplementation(loaded.implementation);
        setState("ready");
      } else {
        setState("missing");
      }
    } catch {
      setState("missing");
    }
  }

  function usePasted() {
    try {
      const parsed = JSON.parse(pasted);
      if (!Array.isArray(parsed)) throw new Error("not an array");
      setAbi(parsed as Abi);
      setPasteError(null);
      setState("ready");
    } catch {
      setPasteError("That isn't a valid ABI. Paste the JSON array of ABI entries.");
    }
  }

  const fns = abi ? functionsOf(abi) : [];
  const q = query.trim().toLowerCase();
  const shown = fns.filter((f) => f.name.toLowerCase().includes(q));
  const reads = shown.filter(isReadFn);
  const writes = shown.filter((f) => !isReadFn(f));
  const explorer = chain.blockExplorers?.default.url;

  return (
    <details className="card" onToggle={(e) => e.currentTarget.open && load()}>
      <summary>
        <span className="card-title">{title}</span>
        <span className="badge">{chain.name}</span>
        <span className="addr">{address}</span>
      </summary>
      <div className="card-body">
        {explorer && (
          <p className="addr">
            <a href={explorer + "/address/" + address} target="_blank" rel="noreferrer">
              View on explorer
            </a>
            {implementation ? " (proxy, ABI from implementation " + implementation.slice(0, 8) + "...)" : ""}
          </p>
        )}
        {state === "loading" && <p className="note">Loading the verified ABI...</p>}
        {state === "missing" && (
          <div>
            <p className="note">
              No verified ABI was found for this contract. Paste its ABI to use it here.
            </p>
            <label className="field">
              ABI (JSON)
              <textarea rows={5} value={pasted} onChange={(e) => setPasted(e.target.value)} spellCheck={false} />
            </label>
            <button className="btn ghost" type="button" onClick={usePasted} disabled={!pasted.trim()}>
              Use this ABI
            </button>
            {pasteError && <p role="alert" className="error">{pasteError}</p>}
          </div>
        )}
        {state === "ready" && (
          <div>
            <input
              className="search"
              placeholder="Search functions"
              aria-label="Search functions"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {reads.length > 0 && <h3 className="group-title">Read</h3>}
            {reads.map((fn, i) => (
              <FunctionForm key={"r" + i + fn.name} chain={chain} address={address} abi={abi!} fn={fn} wallet={wallet} defaults={defaults} />
            ))}
            {writes.length > 0 && <h3 className="group-title">Write</h3>}
            {writes.map((fn, i) => (
              <FunctionForm key={"w" + i + fn.name} chain={chain} address={address} abi={abi!} fn={fn} wallet={wallet} defaults={defaults} />
            ))}
            {shown.length === 0 && <p className="note">No functions match.</p>}
          </div>
        )}
      </div>
    </details>
  );
}
`,

  "components/app.tsx": String.raw`"use client";

import { useState } from "react";
import type { Address } from "viem";

import ContractCard from "@/components/contract-card";
import config from "@/reverse.config.json";
import { CHAINS, chainById } from "@/lib/chains";
import { useWallet } from "@/lib/wallet";

const short = (a: string) => a.slice(0, 6) + "..." + a.slice(-4);

export default function App() {
  const wallet = useWallet();
  const [walletError, setWalletError] = useState<string | null>(null);
  const withContracts = CHAINS.filter((c) => config.contracts.some((k) => k.chainId === c.id));
  const [chainId, setChainId] = useState<number>(withContracts[0]?.id ?? CHAINS[0]?.id ?? 1);
  const chain = chainById(chainId);
  const contracts = config.contracts.filter((k) => k.chainId === chainId);

  const brandStyle = {
    "--brand": config.brand.primary,
    "--on-brand": config.brand.onPrimary,
  } as React.CSSProperties;

  async function connect() {
    setWalletError(null);
    try {
      await wallet.connect();
    } catch (e) {
      setWalletError(e instanceof Error ? e.message : "Couldn't connect.");
    }
  }

  return (
    <div className="wrap" style={brandStyle}>
      <header className="top">
        {config.brand.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="logo" src={config.brand.logo} alt="" />
        ) : (
          <span className="mark" aria-hidden="true">
            {config.brand.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="grow">
          <h1 className="title">{config.brand.name}</h1>
          {config.brand.tagline && <p className="tagline">{config.brand.tagline}</p>}
        </div>
        <button className="btn" type="button" onClick={connect} disabled={!wallet.available || Boolean(wallet.account)}>
          {wallet.account ? short(wallet.account) : wallet.available ? "Connect wallet" : "No wallet found"}
        </button>
      </header>
      {walletError && <p role="alert" className="error">{walletError}</p>}

      <nav className="tabs" aria-label="Network">
        {withContracts.map((c) => (
          <button key={c.id} type="button" className="tab" aria-pressed={c.id === chainId} onClick={() => setChainId(c.id)}>
            {c.name}
          </button>
        ))}
      </nav>

      <p className="note">
        Talk directly to {config.source.name}&apos;s contracts. Open a contract to read its state or send a
        transaction. Transactions are signed by your wallet and nothing is sent anywhere else.
      </p>

      {chain && contracts.length === 0 && <p className="note">No contracts were found on this network.</p>}
      {chain &&
        contracts.map((k) => (
          <ContractCard key={k.chainId + k.address} title={k.title} chain={chain} address={k.address as Address} wallet={wallet} defaults={k.defaults} />
        ))}

      <p className="foot">
        Built with Reverse Network from {config.source.host}. Contract addresses belong to the original
        protocol. Check its license and brand rules before you launch.
      </p>
    </div>
  );
}
`,
};

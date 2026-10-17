import { CHAIN_BY_ID } from "./chains";
import { safeFetchText, UnsafeUrlError } from "./safe-fetch";

const ADDRESS_RE = /(?<![0-9a-fA-F])0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g;
const CHAIN_ID_RE = /chain_?id["']?\s*[:=]\s*(\d{1,9})/gi;
const CHUNK_RE = /["'`]((?:\.{0,2}\/)?[A-Za-z0-9_\-./]{3,110}\.m?js)["'`]/g;

const MAX_ADDRESSES = 300;
const MAX_INITIAL_SCRIPTS = 12;
const MAX_FILES = 100;
const MAX_TOTAL_BYTES = 40_000_000;
const MAX_FILE_BYTES = 3_000_000;
const CONCURRENCY = 10;

const LIBRARY_HINTS: [label: string, test: RegExp][] = [
  ["wagmi", /\bwagmi\b/],
  ["viem", /\bviem\b/],
  ["ethers.js", /@ethersproject|\bethers\.js\b|\bethers\b\.(?:providers|Contract)/],
  ["web3.js", /\bweb3\.js\b|\bnew Web3\(/],
  ["RainbowKit", /rainbowkit|@rainbow-me/i],
  ["WalletConnect", /walletconnect|web3modal|reown/i],
  ["Uniswap SDK", /@uniswap\//],
  ["Safe", /@safe-global/],
  ["thirdweb", /thirdweb/i],
  ["Privy", /@privy-io|privy\.io/],
  ["React", /react-dom|__reactFiber/],
  ["Next.js", /__NEXT_DATA__|\/_next\//],
  ["Vite", /\/@vite\/|type="module" crossorigin/],
];

export interface PageFacts {
  finalUrl: string;
  title: string | null;
  html: string;
}

export interface AddressMention {
  address: string;
  count: number;
}

export interface ScanFacts {
  scriptsScanned: number;
  addresses: AddressMention[];
  chainIds: number[];
  libraries: string[];
}

export async function fetchPage(url: string, signal?: AbortSignal): Promise<PageFacts> {
  const request = () =>
    safeFetchText(url, {
      signal,
      maxBytes: 2_000_000,
      accept: "text/html,application/xhtml+xml",
    });
  // One retry covers the occasional dropped first connection
  const page = await request().catch((error) => {
    if (error instanceof UnsafeUrlError || signal?.aborted) throw error;
    return request();
  });
  if (page.status >= 400) {
    throw new UnsafeUrlError(
      page.status === 403 || page.status === 401 || page.status === 429
        ? `The site blocked automated access (status ${page.status}), so we couldn't read it.`
        : `The site responded with status ${page.status}.`,
    );
  }
  const title = page.text.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]?.trim();
  return { finalUrl: page.url, title: title || null, html: page.text };
}

function sameSite(a: URL, b: URL) {
  if (a.hostname === b.hostname) return true;
  const root = (h: string) => h.split(".").slice(-2).join(".");
  return root(a.hostname) === root(b.hostname);
}

function scriptUrlsFromHtml(html: string, base: URL): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)) {
    found.add(m[1]);
  }
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/rel=["'](?:modulepreload|preload)["']/i.test(tag)) continue;
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href && /\.m?js(?:\?|$)/i.test(href)) found.add(href);
  }
  return resolveSameSite([...found], base);
}

function resolveSameSite(candidates: string[], base: URL): string[] {
  const out: string[] = [];
  for (const c of candidates) {
    try {
      const u = new URL(c, base);
      if ((u.protocol === "https:" || u.protocol === "http:") && sameSite(u, base)) {
        u.hash = "";
        out.push(u.toString());
      }
    } catch {
      // ignore malformed references
    }
  }
  return out;
}

/** Lazy-loaded chunks are only named inside the entry bundles, so look for those names. */
function chunkUrlsFromBundle(text: string, bundleUrl: string, origin: URL): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(CHUNK_RE)) {
    const ref = m[1];
    if (ref.includes("node_modules") || ref.startsWith("//")) continue;
    let resolved: string;
    if (ref.startsWith("/")) resolved = new URL(ref, origin).toString();
    else if (ref.startsWith("./") || ref.startsWith("../")) {
      resolved = new URL(ref, bundleUrl).toString();
    } else if (ref.startsWith("static/")) {
      resolved = new URL(`/_next/${ref}`, origin).toString();
    } else {
      resolved = new URL(`/${ref}`, origin).toString();
    }
    out.add(resolved);
    if (out.size >= 150) break;
  }
  return [...out];
}

function looksLikePlaceholder(address: string) {
  const hex = address.slice(2).toLowerCase();
  return /^(.)\1+$/.test(hex) || /^0{24}/.test(hex);
}

export async function scanApp(
  page: PageFacts,
  signal?: AbortSignal,
  onFile?: (name: string) => void,
): Promise<ScanFacts> {
  const origin = new URL(page.finalUrl);
  const mentions = new Map<string, AddressMention>();
  const chainIds = new Set<number>();
  const libraries = new Set<string>();

  const absorb = (text: string) => {
    for (const m of text.matchAll(ADDRESS_RE)) {
      if (looksLikePlaceholder(m[0])) continue;
      const key = m[0].toLowerCase();
      const entry = mentions.get(key);
      if (entry) entry.count += 1;
      else mentions.set(key, { address: m[0], count: 1 });
    }
    for (const m of text.matchAll(CHAIN_ID_RE)) {
      const id = Number(m[1]);
      if (CHAIN_BY_ID.has(id)) chainIds.add(id);
    }
    for (const [label, test] of LIBRARY_HINTS) {
      if (test.test(text)) libraries.add(label);
    }
  };

  absorb(page.html);

  const seen = new Set<string>();
  let queue = scriptUrlsFromHtml(page.html, origin).slice(0, MAX_INITIAL_SCRIPTS);
  let scanned = 0;
  let totalBytes = 0;
  let depth = 0;

  while (queue.length > 0 && depth < 2 && scanned < MAX_FILES) {
    const batch = queue.filter((u) => !seen.has(u)).slice(0, MAX_FILES - scanned);
    batch.forEach((u) => seen.add(u));
    const discovered: string[] = [];

    for (let i = 0; i < batch.length; i += CONCURRENCY) {
      if (totalBytes >= MAX_TOTAL_BYTES) break;
      const slice = batch.slice(i, i + CONCURRENCY);
      const results = await Promise.allSettled(
        slice.map((u) =>
          safeFetchText(u, { signal, maxBytes: MAX_FILE_BYTES, accept: "*/*" }),
        ),
      );
      for (const [idx, r] of results.entries()) {
        if (r.status !== "fulfilled" || r.value.status >= 400) continue;
        if (!/javascript|ecmascript|text\/plain/i.test(r.value.contentType)) continue;
        scanned += 1;
        totalBytes += r.value.text.length;
        onFile?.(new URL(slice[idx]).pathname.split("/").pop() || slice[idx]);
        absorb(r.value.text);
        if (depth === 0) {
          discovered.push(...chunkUrlsFromBundle(r.value.text, slice[idx], origin));
        }
      }
    }

    queue = discovered;
    depth += 1;
  }

  const addresses = [...mentions.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_ADDRESSES);

  return {
    scriptsScanned: scanned,
    addresses,
    chainIds: [...chainIds],
    libraries: [...libraries],
  };
}

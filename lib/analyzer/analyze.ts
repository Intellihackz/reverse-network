import { fetchSiteIcon } from "./icon";
import { describeContracts, findDeployedContracts, rankContracts } from "./contracts";
import { fetchPage, scanApp } from "./extract";
import { summarizeByRules } from "./heuristics";
import { parsePublicUrl, UnsafeUrlError } from "./safe-fetch";
import { summarizeProtocol } from "./summarize";
import type { AnalysisEvent, ChainInfo, ContractInfo } from "./types";

/** Adds https:// when the user typed a bare domain. */
export function normalizeUserUrl(raw: string): string {
  const value = raw.trim();
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function plural(n: number, word: string, many = `${word}s`) {
  return `${n} ${n === 1 ? word : many}`;
}

const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

// Live discoveries are cosmetic, so cap them to keep the stream small
const MAX_FOUND_EVENTS = 60;

/** A tiny async queue so callbacks deep in the pipeline can feed the event stream. */
function createChannel<T>() {
  const items: T[] = [];
  let wake: (() => void) | null = null;
  let closed = false;

  return {
    push(item: T) {
      items.push(item);
      wake?.();
    },
    close() {
      closed = true;
      wake?.();
    },
    async *[Symbol.asyncIterator](): AsyncGenerator<T> {
      for (;;) {
        const next = items.shift();
        if (next !== undefined) {
          yield next;
          continue;
        }
        if (closed) return;
        await new Promise<void>((resolve) => {
          wake = resolve;
        });
        wake = null;
      }
    },
  };
}

async function runPipeline(
  rawUrl: string,
  emit: (event: AnalysisEvent) => void,
  signal?: AbortSignal,
) {
  let foundCount = 0;
  const found = (kind: "file" | "contract" | "abi", label: string) => {
    if (foundCount >= MAX_FOUND_EVENTS) return;
    foundCount += 1;
    emit({ type: "found", kind, label });
  };

  try {
    const target = parsePublicUrl(normalizeUserUrl(rawUrl));

    emit({ type: "step", id: "fetch", status: "running", detail: target.hostname });
    const page = await fetchPage(target.toString(), signal);
    const host = new URL(page.finalUrl).hostname;
    emit({ type: "step", id: "fetch", status: "done", detail: page.title ?? host });
    // Fetched alongside the scan; a missing icon never stops it
    const iconPromise = fetchSiteIcon(page.html, page.finalUrl, signal).catch(() => null);

    emit({ type: "step", id: "scan", status: "running" });
    const scan = await scanApp(page, signal, (file) => found("file", file));
    emit({
      type: "step",
      id: "scan",
      status: "done",
      detail: `${plural(scan.scriptsScanned, "script")}, ${plural(scan.addresses.length, "address", "addresses")} found`,
    });

    emit({ type: "step", id: "chains", status: "running" });
    const { deployed, failedChains } = scan.addresses.length
      ? await findDeployedContracts(scan.addresses, signal)
      : { deployed: [], failedChains: [] };
    deployed
      .filter((d) => !d.tokenLike)
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 14)
      .forEach((d) => found("contract", `${shortAddress(d.address)} on ${d.chain.name}`));
    if (deployed.length === 0) {
      emit({
        type: "step",
        id: "chains",
        status: "done",
        detail: failedChains.length
          ? `No contracts found (could not reach ${failedChains.join(", ")})`
          : "No on-chain contracts found",
      });
    } else {
      const chainNames = new Set(deployed.map((d) => d.chain.name));
      emit({
        type: "step",
        id: "chains",
        status: "done",
        detail: `${plural(deployed.length, "deployment")} on ${[...chainNames].join(", ")}`,
      });
    }

    emit({ type: "step", id: "abis", status: "running" });
    const contracts: ContractInfo[] = deployed.length
      ? rankContracts(
          await describeContracts(deployed, signal, (c) => {
            if (c.verified) found("abi", c.implementation?.name ?? c.name ?? shortAddress(c.address));
          }),
        )
      : [];
    const verified = contracts.filter((c) => c.verified).length;
    emit({
      type: "step",
      id: "abis",
      status: contracts.length ? "done" : "skipped",
      detail: contracts.length ? `${verified} of ${contracts.length} verified` : undefined,
    });

    emit({ type: "step", id: "summary", status: "running" });
    const ai = await summarizeProtocol(host, page.title, scan.libraries, contracts, signal);
    const summary = ai.summary ?? summarizeByRules(host, page.title, contracts);
    const summarySource = ai.summary ? "ai" : summary ? "rules" : null;
    const summaryNote =
      summary || contracts.length === 0
        ? ai.note
        : (ai.note ?? "No verified contracts were found, so there was nothing reliable to summarize.");
    emit({
      type: "step",
      id: "summary",
      status: summary ? "done" : "skipped",
      detail: summary
        ? summarySource === "ai"
          ? "Summarized by Claude"
          : "Built from the contracts' functions"
        : (summaryNote ?? undefined),
    });

    const chainCounts = new Map<number, ChainInfo>();
    for (const c of contracts) {
      const entry = chainCounts.get(c.chainId);
      if (entry) entry.contracts += 1;
      else chainCounts.set(c.chainId, { id: c.chainId, name: c.chainName, contracts: 1 });
    }

    emit({
      type: "result",
      data: {
        url: page.finalUrl,
        host,
        title: page.title,
        icon: await iconPromise,
        libraries: scan.libraries,
        scriptsScanned: scan.scriptsScanned,
        addressesFound: scan.addresses.length,
        chains: [...chainCounts.values()].sort((a, b) => b.contracts - a.contracts),
        contracts,
        summary,
        summarySource,
        summaryNote,
      },
    });
  } catch (error) {
    if (signal?.aborted) return;
    if (error instanceof UnsafeUrlError) {
      emit({ type: "error", message: error.message });
      return;
    }
    console.error("[analyze] unexpected failure:", error);
    emit({
      type: "error",
      message: "We couldn't analyze that site. Check the URL and try again.",
    });
  }
}

export async function* analyzeProtocol(
  rawUrl: string,
  signal?: AbortSignal,
): AsyncGenerator<AnalysisEvent> {
  const channel = createChannel<AnalysisEvent>();
  const done = runPipeline(rawUrl, (event) => channel.push(event), signal).finally(() =>
    channel.close(),
  );
  yield* channel;
  await done;
}

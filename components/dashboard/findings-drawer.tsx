"use client";

import { useEffect } from "react";
import Link from "next/link";

import { CHAIN_BY_ID } from "@/lib/analyzer/chains";
import type { Findings, FindingsContract, ProjectSource } from "@/lib/projects";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-xs uppercase tracking-[0.2em] text-zinc-500";

const FEASIBILITY_STYLE = {
  easy: "bg-emerald-50 text-emerald-700",
  moderate: "bg-amber-50 text-amber-700",
  hard: "bg-zinc-100 text-zinc-600",
} as const;

const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

interface ContractGroup {
  key: string;
  title: string;
  kind: FindingsContract["kind"];
  verified: boolean;
  deployments: FindingsContract[];
}

/** The same contract is often deployed on several chains; show it once. */
function groupContracts(contracts: FindingsContract[]): ContractGroup[] {
  const groups = new Map<string, ContractGroup>();
  for (const c of contracts) {
    const key = `${c.title}|${c.kind}|${c.verified}`;
    const existing = groups.get(key);
    if (existing) existing.deployments.push(c);
    else groups.set(key, { key, title: c.title, kind: c.kind, verified: c.verified, deployments: [c] });
  }
  return [...groups.values()];
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-zinc-200 pt-6">
      <h3 className={eyebrow}>{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ContractList({ contracts }: { contracts: FindingsContract[] }) {
  const groups = groupContracts(contracts);

  return (
    <ul className="divide-y divide-zinc-200">
      {groups.map((group) => (
        <li key={group.key} className="py-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <p className="min-w-0 break-words font-semibold">{group.title}</p>
            {group.kind !== "contract" && (
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">
                {group.kind === "proxy" ? "Proxy" : "Token"}
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                group.verified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700",
              )}
            >
              {group.verified ? "Verified" : "Unverified"}
            </span>
          </div>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {group.deployments.map((d) => {
              const chain = CHAIN_BY_ID.get(d.chainId);
              const label = (
                <>
                  <span className="font-sans font-medium text-zinc-700">{d.chainName}</span>
                  <span className="ml-1.5 font-mono">{shortAddress(d.address)}</span>
                </>
              );
              const pill = "inline-flex rounded-full border border-zinc-200 px-2.5 py-0.5 text-xs text-zinc-500";
              return (
                <li key={`${d.chainId}-${d.address}`}>
                  {chain ? (
                    <a
                      href={`${chain.explorerUrl}/address/${d.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(pill, "transition-colors hover:border-zinc-950 hover:text-zinc-950")}
                    >
                      {label}
                    </a>
                  ) : (
                    <span className={pill}>{label}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}

function FindingsBody({ findings }: { findings: Findings }) {
  const { summary } = findings;
  const verified = findings.contracts.filter((c) => c.verified).length;
  const chainCount = new Set(findings.contracts.map((c) => c.chainId)).size;

  return (
    <div className="space-y-6">
      {summary ? (
        <section>
          <p className={eyebrow}>{summary.category}</p>
          <p className="mt-2 text-2xl font-semibold leading-snug tracking-tight">{summary.oneLiner}</p>
          <p className="mt-3 leading-relaxed text-zinc-600">{summary.description}</p>
          <p className="mt-3 text-xs text-zinc-400">
            {findings.summarySource === "ai"
              ? "Summarized by Claude from the contracts' verified source."
              : "Generated from the contracts' functions, without AI."}
          </p>
        </section>
      ) : (
        findings.summaryNote && (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {findings.summaryNote}
          </p>
        )
      )}

      <p className="text-sm text-zinc-500">
        {findings.contracts.length} contract deployments, {verified} with verified source, on{" "}
        {chainCount} {chainCount === 1 ? "chain" : "chains"}. Scanned {findings.scriptsScanned} scripts.
      </p>

      {summary && summary.keyFlows.length > 0 && (
        <Block title="Key flows">
          <ul className="space-y-4">
            {summary.keyFlows.map((flow) => (
              <li key={flow.title}>
                <p className="font-semibold">{flow.title}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{flow.description}</p>
                {flow.contracts.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-zinc-500">{flow.contracts.join(" · ")}</p>
                )}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {summary && summary.fees.length > 0 && (
        <Block title="Fees">
          <ul className="space-y-4">
            {summary.fees.map((fee) => (
              <li key={fee.name}>
                <p className="font-semibold">{fee.name}</p>
                <p className="mt-0.5 text-sm text-zinc-600">{fee.description}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">{fee.source}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {summary && summary.customization.length > 0 && (
        <Block title="What you can customize">
          <ul className="space-y-4">
            {summary.customization.map((item) => (
              <li key={item.option}>
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{item.option}</p>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      FEASIBILITY_STYLE[item.feasibility],
                    )}
                  >
                    {item.feasibility}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-zinc-600">{item.description}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      {summary && summary.caveats.length > 0 && (
        <Block title="Worth knowing">
          <ul className="list-disc space-y-2 pl-5 text-sm text-zinc-600">
            {summary.caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Block>
      )}

      <Block title={`Contracts (${findings.contracts.length})`}>
        {findings.contracts.length === 0 ? (
          <p className="text-sm text-zinc-600">
            No on-chain contracts were found in this app&apos;s code. It may load them from a
            separate API, or run on a chain we don&apos;t cover yet.
          </p>
        ) : (
          <details>
            <summary className="cursor-pointer text-sm font-semibold text-zinc-500 hover:text-zinc-950">
              Show technical details
            </summary>
            <div className="mt-2">
              <ContractList contracts={findings.contracts} />
            </div>
          </details>
        )}
      </Block>

      {findings.libraries.length > 0 && (
        <Block title="Frontend stack (detected)">
          <ul className="flex flex-wrap gap-2">
            {findings.libraries.map((lib) => (
              <li key={lib} className="rounded-full border border-zinc-200 px-3 py-1 text-sm font-medium">
                {lib}
              </li>
            ))}
          </ul>
        </Block>
      )}
    </div>
  );
}

export default function FindingsDrawer({
  open,
  onClose,
  source,
  findings,
}: {
  open: boolean;
  onClose: () => void;
  source: ProjectSource;
  findings: Findings | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close findings"
        onClick={onClose}
        className="absolute inset-0 bg-zinc-950/40"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="findings-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-zinc-200 px-6 py-5">
          <div className="min-w-0">
            <p className={eyebrow}>What we found</p>
            <h2 id="findings-title" className="mt-1 truncate text-2xl font-semibold tracking-tight">
              {source.host}
            </h2>
          </div>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2" strokeLinecap="round">
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {findings ? (
            <FindingsBody findings={findings} />
          ) : (
            <div>
              <p className="text-zinc-600">
                This project was saved before findings were kept. Reverse {source.host} again
                from your workspace to refresh them. Your branding stays as it is.
              </p>
              <Link
                href={`/project/analyze?url=${encodeURIComponent(source.url)}`}
                className="mt-5 inline-flex rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white hover:bg-zinc-800"
              >
                Reverse it again
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

import type { FoundKind, StepId, StepStatus } from "@/lib/analyzer/types";
import { cn } from "@/lib/utils";

export type StepState = { status: StepStatus | "pending"; detail?: string };
export type Steps = Record<StepId, StepState>;
export interface FoundItem {
  id: number;
  kind: FoundKind;
  label: string;
}

const ORDER: StepId[] = ["fetch", "scan", "chains", "abis", "summary"];

const ACTIVE_LABEL: Record<StepId, string> = {
  fetch: "Opening the app",
  scan: "Reading its code",
  chains: "Finding contracts on-chain",
  abis: "Reading verified contracts",
  summary: "Mapping the protocol",
};

const CHIP_DOT: Record<FoundKind, string> = {
  file: "bg-zinc-400",
  contract: "bg-sky-400",
  abi: "bg-signal",
};

const finished = (s: StepState) => s.status === "done" || s.status === "skipped" || s.status === "error";

function Wire({ className }: { className?: string }) {
  return <div className={cn("rounded-lg bg-zinc-100", className)} />;
}

/** A page being read: browser frame, a wireframe of the site, a scan beam and live discoveries. */
export default function ScanStage({
  host,
  steps,
  found,
}: {
  host: string;
  steps: Steps;
  found: FoundItem[];
}) {
  const doneCount = ORDER.filter((id) => finished(steps[id])).length;
  const runningId = ORDER.find((id) => steps[id].status === "running");
  const lastDone = [...ORDER].reverse().find((id) => finished(steps[id]));
  const progress = Math.min(100, ((doneCount + (runningId ? 0.5 : 0)) / ORDER.length) * 100);
  const label = runningId ? ACTIVE_LABEL[runningId] : doneCount === 0 ? "Getting ready" : "Wrapping up";
  const detail = runningId ? steps[runningId].detail : lastDone ? steps[lastDone].detail : undefined;
  const recent = found.slice(-4);

  return (
    <div className="mx-auto w-full max-w-md text-left">
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_40px_80px_-30px_rgba(0,0,0,0.35)]"
      >
        <div className="flex items-center gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-300" />
          </span>
          <span className="min-w-0 flex-1 truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-center font-mono text-xs text-zinc-500">
            {host}
          </span>
          <span className="w-10" />
        </div>

        <div className="relative aspect-[16/10] overflow-hidden p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Wire className="h-6 w-6 rounded-md bg-zinc-200" />
            <Wire className="h-3 w-16" />
            <Wire className="h-3 w-12" />
            <Wire className="h-3 w-14" />
            <Wire className="ml-auto h-7 w-20 rounded-full bg-zinc-200" />
          </div>
          <div className="mx-auto mt-8 flex max-w-sm flex-col items-center gap-3">
            <Wire className="h-5 w-4/5 bg-zinc-200" />
            <Wire className="h-5 w-3/5 bg-zinc-200" />
            <Wire className="mt-1 h-3 w-2/3" />
            <Wire className="mt-2 h-8 w-28 rounded-full bg-zinc-200" />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3">
            <Wire className="h-16" />
            <Wire className="h-16" />
            <Wire className="h-16" />
          </div>

          <div className="scan-beam pointer-events-none absolute inset-x-0 top-0">
            <div className="h-24 -translate-y-full bg-gradient-to-t from-signal/25 to-transparent" />
            <div className="h-0.5 bg-signal shadow-[0_0_24px_4px_rgba(255,90,31,0.55)]" />
          </div>

          <ul className="absolute inset-x-4 bottom-4 flex flex-col items-start gap-1.5 sm:inset-x-5 sm:bottom-5">
            {recent.map((item) => (
              <li
                key={item.id}
                className="chip-in flex max-w-full items-center gap-2 rounded-full bg-zinc-950 px-3 py-1 font-mono text-xs text-white shadow-lg"
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", CHIP_DOT[item.kind])} />
                <span className="truncate">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 px-1">
        <div
          role="progressbar"
          aria-label="Analysis progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          className="h-1.5 overflow-hidden rounded-full bg-ink/15"
        >
          <div
            className="bar-shimmer h-full rounded-full bg-zinc-950 transition-[width] duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-4 flex items-baseline justify-between gap-4">
          <p role="status" className="text-lg font-semibold">
            {label}&hellip;
          </p>
          <p className="shrink-0 font-mono text-sm text-ink/70">
            {Math.min(doneCount + (runningId ? 1 : 0), ORDER.length)}/{ORDER.length}
          </p>
        </div>
        <p className="mt-1 min-h-5 truncate text-sm text-ink/70">{detail}</p>
      </div>
    </div>
  );
}

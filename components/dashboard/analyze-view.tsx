"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import ScanStage, { type FoundItem, type Steps } from "@/components/dashboard/scan-stage";
import type { AnalysisEvent, AnalysisResult, StepId } from "@/lib/analyzer/types";
import { saveAnalysis } from "@/lib/projects";
import { normalizeUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

const STEP_IDS: StepId[] = ["fetch", "scan", "chains", "abis", "summary"];

const freshSteps = (): Steps =>
  Object.fromEntries(STEP_IDS.map((id) => [id, { status: "pending" }])) as Steps;

const eyebrow = "font-mono text-sm uppercase tracking-[0.2em] text-zinc-500";

/**
 * Scans a protocol and, when it finishes, opens the customize editor with a project
 * already created. The findings travel with the project and open from the editor.
 */
export default function AnalyzeView() {
  const router = useRouter();
  const params = useSearchParams();
  const { getAccessToken, user } = usePrivy();
  const userId = user?.id ?? "";
  const target = normalizeUrl(params.get("url") ?? "");

  const [attempt, setAttempt] = useState(0);
  const [steps, setSteps] = useState<Steps>(freshSteps);
  const [found, setFound] = useState<FoundItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Set when the scan worked but the project could not be saved
  const [unsaved, setUnsaved] = useState<AnalysisResult | null>(null);

  useEffect(() => {
    if (!target || !userId) return;
    const controller = new AbortController();

    async function run(url: string) {
      setSteps(freshSteps());
      setFound([]);
      setError(null);
      setUnsaved(null);

      try {
        const token = await getAccessToken();
        const res = await fetch("/api/analyze", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ url }),
        });

        if (res.status === 401) {
          router.replace("/sign-in");
          return;
        }
        if (!res.ok || !res.body) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setError(body?.error ?? "Something went wrong. Please try again.");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let foundId = 0;

        const handle = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line) as AnalysisEvent;
          if (event.type === "step") {
            setSteps((prev) => ({
              ...prev,
              [event.id]: { status: event.status, detail: event.detail },
            }));
          } else if (event.type === "found") {
            foundId += 1;
            const item: FoundItem = { id: foundId, kind: event.kind, label: event.label };
            setFound((prev) => [...prev.slice(-29), item]);
          } else if (event.type === "result") {
            const project = saveAnalysis(userId, event.data);
            if (project) router.replace(`/dashboard/customize?project=${project.id}`);
            else setUnsaved(event.data);
          } else {
            setError(event.message);
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(handle);
        }
        handle(buffer);
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("The connection dropped. Please try again.");
        }
      }
    }

    // Deferred so React's dev double-mount cancels before sending a request
    const timer = setTimeout(() => run(target), 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [target, userId, attempt, getAccessToken, router]);

  if (!target) {
    return (
      <div>
        <h1 className="text-5xl font-semibold tracking-tighter">No URL to reverse</h1>
        <p className="mt-4 text-zinc-600">Paste a web3 app URL on your workspace to start.</p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-full bg-zinc-950 px-6 py-3 text-base font-bold text-white hover:bg-zinc-800"
        >
          Back to workspace
        </Link>
      </div>
    );
  }

  const host = new URL(target).hostname;
  const failed = Boolean(error) || Boolean(unsaved);

  return (
    <div className="w-full">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950"
      >
        &larr; Workspace
      </Link>
      <p className={cn(eyebrow, "mt-8")}>{failed ? "Couldn't finish" : "Reversing"}</p>
      <h1 className="mt-3 break-all text-5xl font-semibold leading-[0.95] tracking-tighter sm:text-7xl">
        {host}
      </h1>

      {!failed && (
        <div className="mt-12">
          <ScanStage host={host} steps={steps} found={found} />
        </div>
      )}

      {error && (
        <div role="alert" className="mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Try again
          </button>
        </div>
      )}

      {unsaved && (
        <div role="alert" className="mt-10 max-w-xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4">
          <p className="font-semibold text-red-800">
            The scan worked, but your project couldn&apos;t be saved. Browser storage is full or
            blocked.
          </p>
          <button
            type="button"
            onClick={() => {
              const project = saveAnalysis(userId, unsaved);
              if (project) router.replace(`/dashboard/customize?project=${project.id}`);
            }}
            className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
          >
            Try saving again
          </button>
        </div>
      )}
    </div>
  );
}

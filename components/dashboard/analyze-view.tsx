"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import StageFrame from "@/components/project/stage-frame";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import ScanStage, { type FoundItem, type Steps } from "@/components/dashboard/scan-stage";
import type { AnalysisEvent, AnalysisResult, StepId } from "@/lib/analyzer/types";
import { saveAnalysis } from "@/lib/projects";
import { normalizeUrl } from "@/lib/url";

const STEP_IDS: StepId[] = ["fetch", "scan", "chains", "abis", "summary"];

const freshSteps = (): Steps =>
  Object.fromEntries(STEP_IDS.map((id) => [id, { status: "pending" }])) as Steps;

const eyebrow = "font-mono text-xs uppercase tracking-[0.22em] text-ink/70 sm:text-sm";
const alertBox = "mt-8 w-full max-w-xl rounded-2xl bg-white px-5 py-4 text-left shadow-lg";
const alertButton =
  "mt-3 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-signal hover:text-ink";
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
            if (project) router.replace(`/project/review?project=${project.id}`);
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
      <StageFrame>
        <h1 className="text-5xl font-semibold tracking-tighter sm:text-7xl">No URL to reverse</h1>
        <p className="mt-4 text-ink/75">Paste a web3 app URL to start.</p>
        <Link href="/project/new" className={`${alertButton} mt-8 px-6 py-3 text-base`}>
          Start a project
        </Link>
      </StageFrame>
    );
  }

  const host = new URL(target).hostname;
  const failed = Boolean(error) || Boolean(unsaved);

  return (
    <StageFrame>
      <p className={eyebrow}>{failed ? "Couldn't finish" : "Reversing"}</p>
      <h1 className="mt-3 mb-10 max-w-4xl break-all text-4xl font-semibold leading-[0.95] tracking-tighter sm:text-6xl">
        {host}
      </h1>

      {!failed && <ScanStage host={host} steps={steps} found={found} />}

      {error && (
        <div role="alert" className={alertBox}>
          <p className="font-semibold text-red-700">{error}</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className={alertButton}>
            Try again
          </button>
        </div>
      )}

      {unsaved && (
        <div role="alert" className={alertBox}>
          <p className="font-semibold text-red-700">
            The scan worked, but your project couldn&apos;t be saved. Browser storage is full or
            blocked.
          </p>
          <button
            type="button"
            onClick={() => {
              const project = saveAnalysis(userId, unsaved);
              if (project) router.replace(`/project/review?project=${project.id}`);
            }}
            className={alertButton}
          >
            Try saving again
          </button>
        </div>
      )}
    </StageFrame>
  );
}

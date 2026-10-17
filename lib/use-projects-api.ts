"use client";

import { useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";

import type { AnalysisResult } from "@/lib/analyzer/types";
import type { Brand, Project, ProjectSummary } from "@/lib/projects";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Calls to the projects API, signed with the current Privy session. */
export function useProjectsApi() {
  const { getAccessToken } = usePrivy();

  return useMemo(() => {
    async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
      const token = await getAccessToken();
      let res: Response;
      try {
        res = await fetch(path, {
          ...init,
          headers: {
            ...(init.body ? { "content-type": "application/json" } : {}),
            ...(token ? { authorization: "Bearer " + token } : {}),
          },
        });
      } catch {
        throw new ApiError(0, "Couldn't reach the server. Check your connection.");
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(res.status, body?.error ?? "Something went wrong. Please try again.");
      }
      return (await res.json()) as T;
    }

    return {
      list: () => call<{ projects: ProjectSummary[] }>("/api/projects").then((r) => r.projects),
      listFull: () => call<{ projects: Project[] }>("/api/projects?full=1").then((r) => r.projects),
      get: (id: string) => call<{ project: Project }>("/api/projects/" + id).then((r) => r.project),
      save: (id: string, patch: { brand?: Brand; edits?: Record<string, string> }) =>
        call<{ project: Project }>("/api/projects/" + id, { method: "PUT", body: JSON.stringify(patch) }).then(
          (r) => r.project,
        ),
      remove: (id: string) => call<{ ok: true }>("/api/projects/" + id, { method: "DELETE" }),
      saveScan: (result: AnalysisResult) =>
        call<{ project: Project }>("/api/projects/analysis", {
          method: "POST",
          body: JSON.stringify({ result }),
        }).then((r) => r.project),
      importLocal: (projects: Project[]) =>
        call<{ added: number }>("/api/projects/import", {
          method: "POST",
          body: JSON.stringify({ projects }),
        }).then((r) => r.added),
    };
  }, [getAccessToken]);
}

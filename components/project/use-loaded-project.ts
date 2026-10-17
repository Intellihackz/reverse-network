"use client";

import { useEffect, useState } from "react";

import { ApiError, useProjectsApi } from "@/lib/use-projects-api";
import type { Project } from "@/lib/projects";

export type LoadedProject =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; project: Project };

/** Loads one project from the server. Remount (key by id) to load a different one. */
export function useLoadedProject(id: string): LoadedProject {
  const api = useProjectsApi();
  const [state, setState] = useState<LoadedProject>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    api
      .get(id)
      .then((project) => !cancelled && setState({ status: "ready", project }))
      .catch((e: unknown) => {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) setState({ status: "missing" });
        else setState({ status: "error", message: e instanceof Error ? e.message : "Couldn't load this project." });
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  return state;
}

"use client";

import { useSyncExternalStore } from "react";

/**
 * A counter that goes up whenever this browser changes a project. Pages that list projects
 * depend on it, so they reload even when Next keeps an earlier page alive and reuses it.
 */
let version = 0;
const listeners = new Set<() => void>();

export function projectsChanged() {
  version += 1;
  listeners.forEach((l) => l());
}

export function useProjectsVersion(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => version,
    () => 0,
  );
}

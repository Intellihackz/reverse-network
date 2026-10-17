"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "failed";

/**
 * Saves the latest value shortly after changes stop. flush() saves right away and resolves
 * when the write is done, so callers can wait before navigating away.
 */
export function useDebouncedSave<T>(save: (value: T) => Promise<unknown>, delay = 500) {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const job = pending.current;
    if (!job) return true;
    pending.current = null;
    setState("saving");
    try {
      await saveRef.current(job.value);
      setState(pending.current ? "saving" : "idle");
      setError(null);
      return true;
    } catch (e) {
      setState("failed");
      setError(e instanceof Error ? e.message : "Couldn't save.");
      return false;
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      setState("saving");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  // Leaving the page sends whatever is still waiting
  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  return { state, error, schedule, flush };
}

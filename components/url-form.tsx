"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { normalizeUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

export default function UrlForm({ className }: { className?: string }) {
  const [value, setValue] = useState("");
  const router = useRouter();
  const [status, setStatus] = useState<{ kind: "idle" } | { kind: "error" }>({
    kind: "idle",
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(value);
    if (!url) {
      setStatus({ kind: "error" });
      return;
    }
    // Keep the URL so the app can pick it up once the user has signed in
    try {
      sessionStorage.setItem("reverse:pending-url", url);
    } catch {}
    router.push("/sign-in");
  }

  return (
    <form onSubmit={onSubmit} noValidate className={cn("w-full", className)}>
      <label htmlFor="protocol-url" className="sr-only">
        Web3 app URL
      </label>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-3xl border bg-white p-2 shadow-sm transition-colors sm:flex-row sm:rounded-full",
          status.kind === "error"
            ? "border-red-500"
            : "border-zinc-300 focus-within:border-zinc-950",
        )}
      >
        <input
          id="protocol-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="app.uniswap.org"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status.kind !== "idle") setStatus({ kind: "idle" });
          }}
          aria-invalid={status.kind === "error"}
          aria-describedby="protocol-url-hint"
          className="min-w-0 flex-1 bg-transparent px-5 py-3 font-mono text-base text-zinc-950 outline-none placeholder:text-zinc-400"
        />
        <button
          type="submit"
          className="rounded-full bg-ink px-6 py-3 text-base font-bold text-white transition-colors hover:bg-signal hover:text-ink"
        >
          Reverse it
        </button>
      </div>
      <p
        id="protocol-url-hint"
        role="status"
        className={cn(
          "px-5 text-sm empty:hidden",
          status.kind !== "idle" && "mt-3",
          status.kind === "error" ? "text-red-600" : "text-zinc-500",
        )}
      >
        {status.kind === "error" && "Enter a valid web3 app URL, like app.uniswap.org."}
      </p>
    </form>
  );
}

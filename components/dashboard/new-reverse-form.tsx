"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { normalizeUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

const PENDING_URL_KEY = "reverse:pending-url";

function readPendingUrl(): string {
  try {
    const stored = sessionStorage.getItem(PENDING_URL_KEY);
    return stored ? new URL(stored).hostname : "";
  } catch {
    return "";
  }
}

// Only rendered once the sign-in gate has passed, so reading storage never runs during SSR
export default function NewReverseForm() {
  const router = useRouter();
  const [value, setValue] = useState(readPendingUrl);
  const [prefilled, setPrefilled] = useState(() => value !== "");
  const [invalid, setInvalid] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = normalizeUrl(value);
    if (!url) {
      setInvalid(true);
      return;
    }
    try {
      sessionStorage.removeItem(PENDING_URL_KEY);
    } catch {}
    router.push(`/dashboard/analyze?url=${encodeURIComponent(url)}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-10 max-w-2xl">
      <label htmlFor="new-reverse-url" className="sr-only">
        Web3 app URL
      </label>
      <div
        className={cn(
          "flex flex-col gap-2 rounded-3xl border bg-white p-2 shadow-sm transition-colors sm:flex-row sm:rounded-full",
          invalid ? "border-red-500" : "border-zinc-300 focus-within:border-zinc-950",
        )}
      >
        <input
          id="new-reverse-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder="app.uniswap.org"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setInvalid(false);
            setPrefilled(false);
          }}
          aria-invalid={invalid}
          aria-describedby="new-reverse-hint"
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
        id="new-reverse-hint"
        role="status"
        className={cn("px-5 text-sm empty:hidden", (invalid || prefilled) && "mt-3", invalid ? "text-red-600" : "text-zinc-500")}
      >
        {invalid && "Enter a valid web3 app URL, like app.uniswap.org."}
        {!invalid && prefilled && "We filled in the URL you pasted earlier."}
      </p>
    </form>
  );
}

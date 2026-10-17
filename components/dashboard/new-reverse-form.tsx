"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BorderBeam } from "border-beam";

import LogoMark from "@/components/logo-mark";
import { usePrefersReducedMotion } from "@/lib/use-prefers-reduced-motion";
import { normalizeUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

const PENDING_URL_KEY = "reverse:pending-url";

// Apps the scanner has been tried on, offered as one-click starting points
const EXAMPLES = ["app.uniswap.org", "app.aave.com", "curve.finance"];

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
  const reducedMotion = usePrefersReducedMotion();
  const inputRef = useRef<HTMLInputElement>(null);
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

  function fillExample(host: string) {
    setValue(host);
    setInvalid(false);
    setPrefilled(false);
    inputRef.current?.focus();
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="mx-auto mt-8 w-full max-w-2xl"
    >
      <label htmlFor="new-reverse-url" className="sr-only">
        Web3 app URL
      </label>
      <BorderBeam
        size="md"
        colorVariant="sunset"
        theme="light"
        strength={0.7}
        borderRadius={28}
        active={!invalid && !reducedMotion}
      >
        <div
          className={cn(
            "rounded-[28px] border bg-white p-3 shadow-[0_10px_34px_-14px_rgba(0,0,0,0.22)] transition-colors",
            invalid
              ? "border-red-500"
              : "border-zinc-200 focus-within:border-ink",
          )}
        >
          <div className="flex items-center gap-3 px-3 pt-2">
            <LogoMark className="h-5 w-auto shrink-0 text-zinc-400" />
            <input
              ref={inputRef}
              id="new-reverse-url"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="Paste a web3 app URL"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setInvalid(false);
                setPrefilled(false);
              }}
              aria-invalid={invalid}
              aria-describedby="new-reverse-hint"
              className="min-w-0 flex-1 bg-transparent py-2 font-mono text-base text-ink outline-none placeholder:text-zinc-400 sm:text-lg"
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 pl-3">
              <span className="text-xs font-medium text-zinc-400">Try</span>
              {EXAMPLES.map((host) => (
                <button
                  key={host}
                  type="button"
                  onClick={() => fillExample(host)}
                  className="rounded-full border border-zinc-200 px-3 py-1 font-mono text-xs text-zinc-600 transition-colors hover:border-ink hover:text-ink"
                >
                  {host}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="rounded-full bg-ink px-6 py-2.5 text-base font-bold text-white transition-colors hover:bg-signal hover:text-ink"
            >
              Reverse it
            </button>
          </div>
        </div>
      </BorderBeam>

      <p
        id="new-reverse-hint"
        role="status"
        className={cn(
          "text-center text-sm empty:hidden",
          (invalid || prefilled) && "mt-3",
          invalid ? "text-red-600" : "text-zinc-500",
        )}
      >
        {invalid && "Enter a valid web3 app URL, like app.uniswap.org."}
        {!invalid && prefilled && "We filled in the URL you pasted earlier."}
      </p>
    </form>
  );
}

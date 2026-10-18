"use client";

import { useMemo, useRef } from "react";
import Prism from "prismjs";
import "prismjs/components/prism-clike";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-css";
import "prismjs/components/prism-markdown";

import type { CodeLanguage } from "@/lib/code-languages";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Prism returns escaped HTML, so the only markup in it is its own token spans. */
function highlight(text: string, language: CodeLanguage): string {
  const grammar = language.prism ? Prism.languages[language.prism] : undefined;
  const html =
    grammar && language.prism
      ? Prism.highlight(text, grammar, language.prism)
      : escapeHtml(text);
  // A trailing newline needs a line of its own, or the colored layer ends a line short
  return html + "\n";
}

const text = "font-mono text-[13px] leading-5 [tab-size:2]";

/**
 * A real textarea with a colored copy of its text layered behind it. Typing, selection
 * and undo all use the textarea, so they behave like any other text field.
 */
export default function CodeEditor({
  path,
  value,
  language,
  onChange,
  onFormat,
}: {
  path: string;
  value: string;
  language: CodeLanguage;
  onChange: (value: string) => void;
  onFormat?: () => void;
}) {
  const gutter = useRef<HTMLPreElement>(null);
  const colored = useRef<HTMLPreElement>(null);
  // After Escape, Tab moves focus on instead of indenting, so keyboard users aren't trapped
  const escaped = useRef(false);

  const html = useMemo(() => highlight(value, language), [value, language]);
  const lines = useMemo(
    () =>
      Array.from({ length: value.split("\n").length }, (_, i) => i + 1).join(
        "\n",
      ),
    [value],
  );

  return (
    <div className="flex min-h-0 flex-1">
      <pre
        ref={gutter}
        aria-hidden="true"
        className={`${text} m-0 w-12 shrink-0 select-none overflow-hidden bg-zinc-950 py-3 pr-3 text-right text-zinc-600`}
      >
        {lines}
      </pre>
      <div className="relative min-w-0 flex-1 bg-zinc-950">
        <pre
          ref={colored}
          aria-hidden="true"
          className={`${text} code-view pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre py-3 pr-4 text-zinc-100`}
        >
          <code dangerouslySetInnerHTML={{ __html: html }} />
        </pre>
        <textarea
          key={path}
          aria-label={"Edit " + path}
          value={value}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          wrap="off"
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            const { scrollTop, scrollLeft } = e.currentTarget;
            if (gutter.current) gutter.current.scrollTop = scrollTop;
            if (colored.current) {
              colored.current.scrollTop = scrollTop;
              colored.current.scrollLeft = scrollLeft;
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") escaped.current = true;
            else if (e.altKey && e.shiftKey && e.key.toLowerCase() === "f") {
              e.preventDefault();
              onFormat?.();
            } else if (e.key === "Tab" && !e.shiftKey && !escaped.current) {
              e.preventDefault();
              const ta = e.currentTarget;
              ta.setRangeText("  ", ta.selectionStart, ta.selectionEnd, "end");
              onChange(ta.value);
            } else if (e.key !== "Shift" && e.key !== "Alt")
              escaped.current = false;
          }}
          className={`${text} absolute inset-0 h-full w-full resize-none whitespace-pre bg-transparent py-3 pr-4 text-transparent caret-white outline-none selection:bg-white/25`}
        />
      </div>
    </div>
  );
}

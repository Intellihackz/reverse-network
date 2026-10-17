import Link from "next/link";

import LogoMark from "@/components/logo-mark";

// Our logo mark, scattered and tilted, is the decoration. Positions are fixed so the page is stable.
const MARKS = [
  { className: "left-[4%] top-[18%] h-28 sm:h-40", rotate: -18, delay: 0 },
  { className: "right-[5%] top-[12%] h-24 sm:h-36", rotate: 24, delay: 1.5 },
  { className: "left-[14%] bottom-[10%] h-24 sm:h-32", rotate: 12, delay: 3 },
  { className: "right-[12%] bottom-[14%] h-28 sm:h-44", rotate: -26, delay: 4.5 },
  { className: "left-[46%] bottom-[3%] hidden h-20 sm:block", rotate: 8, delay: 6 },
] as const;

/** Full-screen orange stage shared by the new project and reversing pages. */
export default function StageFrame({
  backLabel = "Workspace",
  children,
}: {
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white p-3">
      <div className="relative flex min-h-[calc(100vh-1.5rem)] flex-col overflow-hidden rounded-[28px] bg-signal text-ink">
        {MARKS.map((mark, i) => (
          <LogoMark
            key={i}
            className={`drift pointer-events-none absolute w-auto text-white/25 ${mark.className}`}
            // The tilt and start delay are per-mark, so they travel as CSS variables and inline style
            {...({
              style: {
                "--r": `${mark.rotate}deg`,
                animationDelay: `${mark.delay}s`,
              },
            } as object)}
          />
        ))}

        <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center px-5 py-5 sm:px-8">
          <Link
            href="/dashboard"
            className="flex w-fit items-center gap-1.5 rounded-full py-1 pr-3 text-sm font-semibold transition-colors hover:text-white"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-4 w-4 fill-none stroke-current stroke-2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 6-6 6 6 6" />
            </svg>
            {backLabel}
          </Link>
          <Link
            href="/dashboard"
            aria-label="Reverse Network workspace"
            className="flex items-center gap-2 font-display text-base font-extrabold tracking-[-0.08em] [word-spacing:0.22em] sm:text-lg"
          >
            <LogoMark className="h-6 w-auto" />
            REVERSE NETWORK
          </Link>
          <span aria-hidden="true" />
        </header>

        <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-24 text-center sm:px-8">
          {children}
        </section>
      </div>
    </main>
  );
}

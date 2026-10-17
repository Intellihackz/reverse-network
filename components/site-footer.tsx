const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Protocols", href: "#protocols" },
  { label: "Get started", href: "/sign-in" },
];

const STEPS = [
  { label: "Paste", href: "#how" },
  { label: "Reverse", href: "#how" },
  { label: "Customize", href: "#how" },
  { label: "Deploy", href: "#how" },
];

export default function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-[110rem] px-6 pb-8 pt-6 sm:px-10">
      <div className="border-t border-zinc-200 pt-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <p className="text-xl font-semibold tracking-tight text-zinc-950 sm:text-2xl">
            Rewind any protocol. Make it yours.
          </p>
          <nav
            aria-label="Footer"
            className="flex flex-wrap gap-x-7 gap-y-2 text-base text-zinc-600"
          >
            {NAV.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-zinc-950"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* textLength stretches the glyphs so the wordmark spans the full width at any size */}
        <svg
          role="img"
          aria-label="Reverse"
          viewBox="0 0 1000 250"
          className="mt-8 block w-full overflow-visible text-zinc-950"
        >
          <text
            x="0"
            y="238"
            textLength="1000"
            lengthAdjust="spacingAndGlyphs"
            fill="currentColor"
            fontSize="300"
            fontWeight="800"
            style={{ fontFamily: "var(--font-bricolage), Impact, 'Arial Narrow Bold', Arial, sans-serif" }}
          >
            REVERSE
          </text>
        </svg>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 text-base text-zinc-600">
          <div className="flex flex-wrap gap-x-7 gap-y-2">
            {STEPS.map((step) => (
              <a
                key={step.label}
                href={step.href}
                className="transition-colors hover:text-zinc-950"
              >
                {step.label}
              </a>
            ))}
          </div>
          <a href="#" className="transition-colors hover:text-zinc-950">
            Back to top
          </a>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-6 text-sm text-zinc-500">
          <p>Reverse engineer. Customize. Deploy.</p>
          <p>© 2026 Reverse Network. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

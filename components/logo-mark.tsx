/**
 * The brand mark: one rewind icon (two arrows chasing each other) with a slash passing
 * through the gaps between the arrows, so it echoes the code symbol "</>". The slash
 * touches neither arrow. Drawn with currentColor.
 */
export default function LogoMark({ className }: { className?: string }) {
  const arrow = (
    <>
      <path d="M8.83 3.58A9 9 0 0 0 3.95 16.03" />
      <path d="M5.83 19.79 1 17.51 6.9 14.55Z" fill="currentColor" strokeWidth="1" />
    </>
  );

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <g strokeWidth="2.75">
        <g>{arrow}</g>
        <g transform="rotate(180 12 12)">{arrow}</g>
      </g>
      <path d="M16 1.8 8 22.2" strokeWidth="2.4" />
    </svg>
  );
}

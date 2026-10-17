import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Reverse Network: Rewind any protocol. Make it yours.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#0e0e10";
const GRAPHITE = "#5b5b63";
const SIGNAL = "#ff5a1f";

const assets = (file: string) => join(process.cwd(), "assets", file);

const [bold, medium, watch] = await Promise.all([
  readFile(assets("fonts/bricolage-grotesque-latin-800-normal.woff")),
  readFile(assets("fonts/bricolage-grotesque-latin-500-normal.woff")),
  readFile(assets("og-watch.jpg")),
]);
const watchSrc = `data:image/jpeg;base64,${watch.toString("base64")}`;

/** The brand mark with explicit colors, because this renderer has no currentColor. */
function Mark({ height }: { height: number }) {
  const arrow = (
    <>
      <path d="M8.83 3.58A9 9 0 0 0 3.95 16.03" />
      <path d="M5.83 19.79 1 17.51 6.9 14.55Z" fill={INK} strokeWidth="1" />
    </>
  );
  return (
    <svg width={height} height={height} viewBox="0 0 24 24" fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
      <g strokeWidth="2.75">
        <g>{arrow}</g>
        <g transform="rotate(180 12 12)">{arrow}</g>
      </g>
      <path d="M16 1.8 8 22.2" strokeWidth="2.4" />
    </svg>
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#ffffff",
          fontFamily: "Bricolage",
          color: INK,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", padding: "56px 0 0 72px", width: 720 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <Mark height={52} />
            <div style={{ display: "flex", marginLeft: 16, fontSize: 34, fontWeight: 800, letterSpacing: -1.5 }}>
              REVERSE NETWORK
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 70,
              fontSize: 92,
              fontWeight: 800,
              lineHeight: 0.98,
              letterSpacing: -4,
            }}
          >
            <div style={{ display: "flex" }}>Rewind any</div>
            <div style={{ display: "flex" }}>protocol.</div>
            <div style={{ display: "flex" }}>
              <span>Make it&nbsp;</span>
              <span style={{ color: SIGNAL }}>yours.</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 34,
              width: 620,
              fontSize: 27,
              fontWeight: 500,
              lineHeight: 1.3,
              color: GRAPHITE,
            }}
          >
            Paste a web3 app URL. We map its contracts, you brand it and launch your own version.
          </div>
        </div>

        <img
          src={watchSrc}
          width={399}
          height={560}
          alt=""
          style={{ position: "absolute", right: 64, top: 40 }}
        />

        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 14, background: SIGNAL, display: "flex" }} />
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bold, weight: 800, style: "normal" },
        { name: "Bricolage", data: medium, weight: 500, style: "normal" },
      ],
    },
  );
}

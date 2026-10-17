import { CHAIN_BY_ID } from "@/lib/analyzer/chains";
import {
  type Brand,
  EVM_ADDRESS,
  type FontStyle,
  type ProjectSource,
  type Radius,
  readableTextOn,
} from "@/lib/projects";

const FONT_STACKS: Record<FontStyle, string> = {
  sans: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  serif: 'ui-serif, Georgia, "Times New Roman", serif',
  mono: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

const CONTROL_RADIUS: Record<Radius, string> = {
  sharp: "4px",
  rounded: "12px",
  pill: "9999px",
};

const CARD_RADIUS: Record<Radius, string> = {
  sharp: "4px",
  rounded: "20px",
  pill: "28px",
};

const PALETTE = {
  light: { bg: "#ffffff", surface: "#f4f4f5", text: "#111111", muted: "#71717a", line: "#e4e4e7" },
  dark: { bg: "#0b0b0d", surface: "#17171a", text: "#fafafa", muted: "#a1a1aa", line: "#27272a" },
} as const;

/** The brand logo, else the source site's icon if given, else a letter. */
export function BrandMark({ brand, size, icon }: { brand: Brand; size: number; icon?: string | null }) {
  const fg = readableTextOn(brand.primary);
  const image = brand.logo ?? icon;
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: "contain" }} />;
  }
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        background: brand.primary,
        color: fg,
        borderRadius: CONTROL_RADIUS[brand.radius === "sharp" ? "sharp" : "rounded"],
        fontSize: size * 0.5,
        fontWeight: 800,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {(brand.name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}

function shortAddress(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

/** A mock of the white-label app shell. It previews branding only, not the protocol's real interface. */
export default function BrandedPreview({ brand, source }: { brand: Brand; source: ProjectSource }) {
  const colors = PALETTE[brand.theme];
  const onPrimary = readableTextOn(brand.primary);
  const nav = source.flows.length > 0 ? source.flows.map((f) => f.title).slice(0, 3) : ["Home", "Markets", "Docs"];
  const chains = brand.chains.map((id) => CHAIN_BY_ID.get(id)?.name).filter((n): n is string => Boolean(n));
  const feeActive = brand.feeBps > 0 && EVM_ADDRESS.test(brand.feeRecipient);
  const name = brand.name.trim() || "Your brand";

  const button = {
    background: brand.primary,
    color: onPrimary,
    borderRadius: CONTROL_RADIUS[brand.radius],
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 14,
    border: "none",
  } as const;

  return (
    <div
      role="img"
      aria-label={`Preview of ${name}`}
      style={{
        background: colors.bg,
        color: colors.text,
        fontFamily: FONT_STACKS[brand.font],
        borderRadius: 24,
        border: `1px solid ${colors.line}`,
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: `1px solid ${colors.line}`, flexWrap: "wrap" }}>
        <BrandMark brand={brand} size={28} />
        <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>{name}</span>
        <nav style={{ display: "flex", gap: 16, marginLeft: 12, color: colors.muted, fontSize: 14, flexWrap: "wrap" }}>
          {nav.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </nav>
        <span style={{ ...button, marginLeft: "auto", padding: "8px 14px", fontSize: 13 }}>Connect wallet</span>
      </div>

      <div style={{ padding: "48px 24px 36px", textAlign: "center" }}>
        <h3 style={{ margin: 0, fontSize: 34, lineHeight: 1.05, fontWeight: 800, letterSpacing: "-0.03em" }}>
          {brand.tagline.trim() || "Add a tagline"}
        </h3>
        <p style={{ margin: "14px auto 0", maxWidth: 420, color: colors.muted, fontSize: 15 }}>
          {source.category}, on {chains.length > 0 ? chains.join(", ") : "your chosen chains"}.
        </p>
        <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <span style={button}>{nav[0] ?? "Get started"}</span>
          <span
            style={{
              ...button,
              background: "transparent",
              color: colors.text,
              border: `1.5px solid ${colors.line}`,
            }}
          >
            Learn more
          </span>
        </div>
        {chains.length > 0 && (
          <div style={{ marginTop: 22, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            {chains.map((c) => (
              <span
                key={c}
                style={{
                  background: colors.surface,
                  color: colors.muted,
                  borderRadius: CONTROL_RADIUS[brand.radius],
                  padding: "4px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {c}
              </span>
            ))}
          </div>
        )}
      </div>

      {source.flows.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, padding: "0 20px 24px" }}>
          {source.flows.slice(0, 3).map((flow) => (
            <div key={flow.title} style={{ background: colors.surface, borderRadius: CARD_RADIUS[brand.radius], padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{flow.title}</div>
              <div style={{ marginTop: 6, color: colors.muted, fontSize: 13, lineHeight: 1.45 }}>{flow.description}</div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          borderTop: `1px solid ${colors.line}`,
          padding: "14px 20px",
          color: colors.muted,
          fontSize: 12,
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <span>
          {feeActive
            ? `${(brand.feeBps / 100).toFixed(2)}% fee to ${shortAddress(brand.feeRecipient)}`
            : `Runs on ${source.name}’s original contracts`}
        </span>
        <span>{name}</span>
      </div>
    </div>
  );
}

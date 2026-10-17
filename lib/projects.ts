import type { AnalysisResult, ContractParam, ProtocolSummary } from "@/lib/analyzer/types";

/**
 * Projects live in this browser's localStorage, keyed by user. They do not sync
 * across devices until a real database is added.
 */

export type Theme = "light" | "dark";
export type Radius = "sharp" | "rounded" | "pill";
export type FontStyle = "sans" | "serif" | "mono";

export interface Brand {
  name: string;
  tagline: string;
  primary: string;
  theme: Theme;
  radius: Radius;
  font: FontStyle;
  /** An image data URL, or null to use the monogram */
  logo: string | null;
  chains: number[];
  feeRecipient: string;
  feeBps: number;
  /** Values to prefill in the generated app's forms, keyed by paramKey() */
  paramDefaults: Record<string, string>;
}

export interface ProjectSource {
  /** The site's own icon as a data URL, when we could read one */
  icon?: string | null;
  host: string;
  url: string;
  name: string;
  category: string;
  oneLiner: string;
  chains: { id: number; name: string }[];
  flows: { title: string; description: string }[];
  feeFeasibility: "easy" | "moderate" | "hard" | null;
  feeNote: string | null;
}

/** A trimmed copy of what the analysis found, kept so the editor can show it. */
export interface FindingsContract {
  title: string;
  kind: "token" | "proxy" | "contract";
  verified: boolean;
  chainId: number;
  chainName: string;
  address: string;
  /** Missing on projects saved before settings were detected */
  params?: ContractParam[];
}

export interface Findings {
  summary: ProtocolSummary | null;
  summarySource: "ai" | "rules" | null;
  summaryNote: string | null;
  contracts: FindingsContract[];
  libraries: string[];
  scriptsScanned: number;
}

export interface Project {
  id: string;
  createdAt: number;
  updatedAt: number;
  source: ProjectSource;
  brand: Brand;
  /** Missing on projects saved before findings were stored */
  findings: Findings | null;
  /** Files the user changed in the project editor, by path. Overrides the generated version. */
  edits: Record<string, string>;
}

export const EDIT_LIMITS = { files: 80, bytes: 200_000, pathChars: 200 } as const;

export const BRAND_LIMITS = {
  name: 40,
  tagline: 120,
  logoBytes: 256 * 1024,
  maxFeeBps: 500,
  maxProjects: 50,
} as const;

/** Identifies one input of one function of one contract. */
export const paramKey = (chainId: number, address: string, fn: string, param: string) =>
  `${chainId}:${address.toLowerCase()}:${fn}:${param}`;

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
export const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const LOGO_DATA_URL = /^data:image\/(?:png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/;
export const isLogoDataUrl = (v: string) => LOGO_DATA_URL.test(v);
const SITE_ICON = /^data:image\/(?:png|jpeg|webp|gif|svg\+xml|x-icon);base64,[A-Za-z0-9+/=]+$/;
const MAX_ICON_CHARS = Math.ceil((64 * 1024 * 4) / 3) + 100;
const cleanIcon = (v: unknown) =>
  typeof v === "string" && v.length <= MAX_ICON_CHARS && SITE_ICON.test(v) ? v : null;

const MAX_STORED_LOGO_CHARS = Math.ceil((BRAND_LIMITS.logoBytes * 4) / 3) + 100;

const storageKey = (userId: string) => `reverse:projects:v1:${userId}`;

const THEMES: Theme[] = ["light", "dark"];
const RADII: Radius[] = ["sharp", "rounded", "pill"];
const FONTS: FontStyle[] = ["sans", "serif", "mono"];

function sanitizeDefaults(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw).slice(0, 200)) {
    if (typeof v === "string" && k.length <= 200) out[k] = v.slice(0, 300);
  }
  return out;
}

function sanitizeEdits(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw).slice(0, EDIT_LIMITS.files)) {
    if (typeof v === "string" && k.length <= EDIT_LIMITS.pathChars && v.length <= EDIT_LIMITS.bytes) out[k] = v;
  }
  return out;
}

function sanitizeBrand(raw: unknown, fallback: Brand): Brand {
  const b = (raw && typeof raw === "object" ? raw : {}) as Partial<Brand>;
  const str = (v: unknown, max: number, d: string) =>
    typeof v === "string" ? v.slice(0, max) : d;

  return {
    name: str(b.name, BRAND_LIMITS.name, fallback.name),
    tagline: str(b.tagline, BRAND_LIMITS.tagline, fallback.tagline),
    primary: typeof b.primary === "string" && HEX_COLOR.test(b.primary) ? b.primary : fallback.primary,
    theme: THEMES.includes(b.theme as Theme) ? (b.theme as Theme) : fallback.theme,
    radius: RADII.includes(b.radius as Radius) ? (b.radius as Radius) : fallback.radius,
    font: FONTS.includes(b.font as FontStyle) ? (b.font as FontStyle) : fallback.font,
    logo:
      typeof b.logo === "string" && b.logo.length <= MAX_STORED_LOGO_CHARS && LOGO_DATA_URL.test(b.logo)
        ? b.logo
        : null,
    chains: Array.isArray(b.chains) ? b.chains.filter((c): c is number => Number.isInteger(c)) : fallback.chains,
    feeRecipient: typeof b.feeRecipient === "string" ? b.feeRecipient.slice(0, 42) : "",
    feeBps:
      Number.isInteger(b.feeBps) && (b.feeBps as number) >= 0 && (b.feeBps as number) <= BRAND_LIMITS.maxFeeBps
        ? (b.feeBps as number)
        : 0,
    paramDefaults: sanitizeDefaults(b.paramDefaults),
  };
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(isStr);

function isSummary(v: unknown): v is ProtocolSummary {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    isStr(s.name) &&
    isStr(s.category) &&
    isStr(s.oneLiner) &&
    isStr(s.description) &&
    Array.isArray(s.keyFlows) &&
    s.keyFlows.every((f) => f && isStr(f.title) && isStr(f.description) && isStrArray(f.contracts)) &&
    Array.isArray(s.fees) &&
    s.fees.every((f) => f && isStr(f.name) && isStr(f.description) && isStr(f.source)) &&
    Array.isArray(s.customization) &&
    s.customization.every(
      (c) => c && isStr(c.option) && isStr(c.description) && ["easy", "moderate", "hard"].includes(c.feasibility),
    ) &&
    isStrArray(s.caveats)
  );
}

function sanitizeFindings(raw: unknown): Findings | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Partial<Findings>;
  if (!Array.isArray(f.contracts) || !isStrArray(f.libraries)) return null;

  const contracts = f.contracts.filter(
    (c): c is FindingsContract =>
      Boolean(c) &&
      isStr(c.title) &&
      isStr(c.address) &&
      isStr(c.chainName) &&
      Number.isInteger(c.chainId) &&
      typeof c.verified === "boolean" &&
      ["token", "proxy", "contract"].includes(c.kind),
  ).map((c) => ({
    ...c,
    params: Array.isArray(c.params)
      ? c.params.filter(
          (p): p is ContractParam =>
            Boolean(p) &&
            isStr(p.function) &&
            isStr(p.param) &&
            isStr(p.type) &&
            (p.kind === "payout" || p.kind === "recipient" || p.kind === "fee"),
        )
      : [],
  }));

  return {
    summary: isSummary(f.summary) ? f.summary : null,
    summarySource: f.summarySource === "ai" || f.summarySource === "rules" ? f.summarySource : null,
    summaryNote: isStr(f.summaryNote) ? f.summaryNote : null,
    contracts,
    libraries: f.libraries,
    scriptsScanned: Number.isInteger(f.scriptsScanned) ? (f.scriptsScanned as number) : 0,
  };
}

function readAll(userId: string): Project[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): Project[] => {
      if (!item || typeof item !== "object") return [];
      const p = item as Partial<Project>;
      if (typeof p.id !== "string" || !p.source || typeof p.source !== "object") return [];
      const source = { ...(p.source as ProjectSource), icon: cleanIcon((p.source as ProjectSource).icon) };
      const fallback = defaultBrand(source);
      return [
        {
          id: p.id,
          createdAt: Number(p.createdAt) || Date.now(),
          updatedAt: Number(p.updatedAt) || Date.now(),
          source,
          brand: sanitizeBrand(p.brand, fallback),
          findings: sanitizeFindings(p.findings),
          edits: sanitizeEdits(p.edits),
        },
      ];
    });
  } catch {
    return [];
  }
}

function writeAll(userId: string, projects: Project[]): boolean {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(projects));
    return true;
  } catch {
    return false;
  }
}

export function listProjects(userId: string): Project[] {
  return readAll(userId).sort((a, b) => b.updatedAt - a.updatedAt);
}

/** Everything saved for this user as JSON, for a manual backup file. */
export function exportAllProjects(userId: string): string {
  return JSON.stringify({ exportedAt: new Date().toISOString(), projects: readAll(userId) }, null, 2);
}

export function getProject(userId: string, id: string): Project | null {
  return readAll(userId).find((p) => p.id === id) ?? null;
}

/** Returns false when the browser refused the write (storage full or blocked). */
export function saveProject(userId: string, project: Project): boolean {
  const all = readAll(userId).filter((p) => p.id !== project.id);
  all.push({ ...project, updatedAt: Date.now() });
  const kept = all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, BRAND_LIMITS.maxProjects);
  return writeAll(userId, kept);
}

export function deleteProject(userId: string, id: string): boolean {
  return writeAll(userId, readAll(userId).filter((p) => p.id !== id));
}

function defaultBrand(source: ProjectSource): Brand {
  return {
    name: `My ${source.name}`.slice(0, BRAND_LIMITS.name),
    tagline: source.oneLiner.slice(0, BRAND_LIMITS.tagline),
    primary: "#111111",
    theme: "light",
    radius: "rounded",
    font: "sans",
    logo: null,
    chains: source.chains.map((c) => c.id),
    feeRecipient: "",
    feeBps: 0,
    paramDefaults: {},
  };
}

function buildSource(result: AnalysisResult): ProjectSource {
  const summary = result.summary;
  const feeOption = summary?.customization.find((c) => /fee|referral/i.test(c.option));

  return {
    icon: cleanIcon(result.icon),
    host: result.host,
    url: result.url,
    name: summary?.name ?? result.title ?? result.host,
    category: summary?.category ?? "Smart contract application",
    oneLiner: summary?.oneLiner ?? `A version of ${result.host} on your own brand.`,
    chains: result.chains.map((c) => ({ id: c.id, name: c.name })),
    flows: (summary?.keyFlows ?? []).slice(0, 4).map((f) => ({ title: f.title, description: f.description })),
    feeFeasibility: feeOption?.feasibility ?? null,
    feeNote: feeOption?.description ?? null,
  };
}

function buildFindings(result: AnalysisResult): Findings {
  return {
    summary: result.summary,
    summarySource: result.summarySource,
    summaryNote: result.summaryNote,
    contracts: result.contracts.map((c) => ({
      title:
        c.implementation?.name ??
        c.name ??
        (c.kind === "token" ? "Token contract" : "Unverified contract"),
      kind: c.kind,
      verified: c.verified,
      chainId: c.chainId,
      chainName: c.chainName,
      address: c.address,
      params: c.params,
    })),
    libraries: result.libraries,
    scriptsScanned: result.scriptsScanned,
  };
}

/**
 * Saves an analysis as a project. Re-reversing an app you already have refreshes its
 * findings and keeps your branding, instead of creating a duplicate.
 */
export function saveAnalysis(userId: string, result: AnalysisResult): Project | null {
  const source = buildSource(result);
  const findings = buildFindings(result);
  const existing = readAll(userId).find((p) => p.source.host === result.host);

  if (existing) {
    const available = new Set(source.chains.map((c) => c.id));
    const kept = existing.brand.chains.filter((id) => available.has(id));
    const project: Project = {
      ...existing,
      source,
      findings,
      brand: { ...existing.brand, chains: kept.length > 0 ? kept : source.chains.map((c) => c.id) },
    };
    return saveProject(userId, project) ? project : null;
  }

  const project: Project = {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    source,
    brand: defaultBrand(source),
    findings,
    edits: {},
  };
  return saveProject(userId, project) ? project : null;
}

/** Picks black or white text for readability on a given background color. */
export function readableTextOn(hex: string): "#111111" | "#ffffff" {
  if (!HEX_COLOR.test(hex)) return "#ffffff";
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.4 ? "#111111" : "#ffffff";
}

"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import BrandedPreview from "@/components/dashboard/branded-preview";
import FindingsDrawer from "@/components/dashboard/findings-drawer";
import {
  BRAND_LIMITS,
  type Brand,
  EVM_ADDRESS,
  type FontStyle,
  getProject,
  HEX_COLOR,
  isLogoDataUrl,
  type Project,
  type Radius,
  saveProject,
  type Theme,
} from "@/lib/projects";
import { cn } from "@/lib/utils";

const eyebrow = "font-mono text-sm uppercase tracking-[0.2em] text-zinc-500";
const label = "block text-sm font-semibold text-zinc-800";
const input =
  "mt-2 w-full rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-base text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-950";

export const SWATCHES = ["#111111", "#2563eb", "#7c3aed", "#db2777", "#dc2626", "#ea580c", "#16a34a", "#0891b2"];
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

const FEASIBILITY_STYLE = {
  easy: "bg-emerald-50 text-emerald-700",
  moderate: "bg-amber-50 text-amber-700",
  hard: "bg-zinc-100 text-zinc-600",
} as const;

export function Segmented<T extends string>({
  legend,
  value,
  options,
  onChange,
}: {
  legend: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className={label}>{legend}</legend>
      <div role="radiogroup" aria-label={legend} className="mt-2 flex rounded-full bg-zinc-100 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors",
              value === o.value ? "bg-zinc-950 text-white" : "text-zinc-600 hover:text-zinc-950",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-5 border-t border-zinc-200 pt-6 first:border-t-0 first:pt-0">
      <h2 className={eyebrow}>{title}</h2>
      {children}
    </section>
  );
}

function downloadConfig(project: Project) {
  const slug = project.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
  const blob = new Blob([JSON.stringify({ brand: project.brand, source: project.source }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug}-config.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CustomizeEditor({ userId, projectId }: { userId: string; projectId: string }) {
  const [project, setProject] = useState<Project | null>(() => getProject(userId, projectId));
  // Always the latest edit, so several changes before a re-render never overwrite each other
  const latest = useRef<Project | null>(project);
  const [saveFailed, setSaveFailed] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [showFindings, setShowFindings] = useState(false);
  const closeFindings = useCallback(() => setShowFindings(false), []);
  const [feeText, setFeeText] = useState(() => (project ? String(project.brand.feeBps / 100) : "0"));

  if (!project) {
    return (
      <div>
        <h1 className="text-5xl font-semibold tracking-tighter">Project not found</h1>
        <p className="mt-4 text-zinc-600">
          It may have been saved in a different browser. Projects are stored in the browser
          you created them in.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-full bg-zinc-950 px-6 py-3 text-base font-bold text-white hover:bg-zinc-800"
        >
          Back to workspace
        </Link>
      </div>
    );
  }

  const { brand, source } = project;

  function update(patch: Partial<Brand>) {
    const base = latest.current;
    if (!base) return;
    const next: Project = { ...base, brand: { ...base.brand, ...patch }, updatedAt: Date.now() };
    latest.current = next;
    setProject(next);
    setSaveFailed(!saveProject(userId, next));
  }

  function onLogo(file: File | undefined) {
    setLogoError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError("Use a PNG, JPEG, WebP or SVG image.");
      return;
    }
    if (file.size > BRAND_LIMITS.logoBytes) {
      setLogoError(`Keep the logo under ${BRAND_LIMITS.logoBytes / 1024} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (isLogoDataUrl(result)) update({ logo: result });
      else setLogoError("That image couldn't be read.");
    };
    reader.onerror = () => setLogoError("That image couldn't be read.");
    reader.readAsDataURL(file);
  }

  function onFee(text: string) {
    setFeeText(text);
    const n = Number(text);
    const max = BRAND_LIMITS.maxFeeBps / 100;
    if (text.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= max) {
      update({ feeBps: Math.round(n * 100) });
    }
  }

  const feeNumber = Number(feeText);
  const feeInvalid =
    feeText.trim() === "" || !Number.isFinite(feeNumber) || feeNumber < 0 || feeNumber > BRAND_LIMITS.maxFeeBps / 100;
  const recipientInvalid = brand.feeRecipient !== "" && !EVM_ADDRESS.test(brand.feeRecipient);
  const colorText = HEX_COLOR.test(brand.primary) ? brand.primary : "#111111";

  return (
    <div className="w-full">
      <Link
        href="/dashboard"
        className="text-sm font-semibold text-zinc-500 transition-colors hover:text-zinc-950"
      >
        &larr; Workspace
      </Link>
      <p className={cn(eyebrow, "mt-8")}>Customize</p>
      <h1 className="mt-3 text-5xl font-semibold leading-[0.95] tracking-tighter sm:text-7xl">
        Make it yours
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-zinc-600">
        Brand your version of {source.name}. It keeps using the original contracts, so
        only the look and your own settings change.
      </p>
      <button
        type="button"
        onClick={() => setShowFindings(true)}
        aria-haspopup="dialog"
        className="mt-6 rounded-full border-2 border-zinc-950 px-5 py-2.5 text-sm font-bold transition-colors hover:bg-zinc-950/5"
      >
        What we found in {source.host}
      </button>
      <FindingsDrawer
        open={showFindings}
        onClose={closeFindings}
        source={source}
        findings={project.findings}
      />

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-8">
          <Section title="Identity">
            <div>
              <label htmlFor="brand-name" className={label}>Name</label>
              <input
                id="brand-name"
                className={input}
                value={brand.name}
                maxLength={BRAND_LIMITS.name}
                onChange={(e) => update({ name: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="brand-tagline" className={label}>Tagline</label>
              <textarea
                id="brand-tagline"
                rows={2}
                className={cn(input, "resize-none")}
                value={brand.tagline}
                maxLength={BRAND_LIMITS.tagline}
                onChange={(e) => update({ tagline: e.target.value })}
              />
              <p className="mt-1 text-right text-xs text-zinc-400">
                {brand.tagline.length}/{BRAND_LIMITS.tagline}
              </p>
            </div>
            <div>
              <label htmlFor="brand-logo" className={label}>Logo</label>
              <div className="mt-2 flex items-center gap-3">
                <input
                  id="brand-logo"
                  type="file"
                  accept={LOGO_TYPES.join(",")}
                  onChange={(e) => {
                    onLogo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                  className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-zinc-950 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-zinc-800"
                />
                {brand.logo && (
                  <button
                    type="button"
                    onClick={() => update({ logo: null })}
                    className="shrink-0 text-sm font-semibold text-zinc-500 hover:text-zinc-950"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">
                Square works best. PNG, JPEG, WebP or SVG up to {BRAND_LIMITS.logoBytes / 1024} KB.
                Without one we use your first letter.
              </p>
              {logoError && <p role="alert" className="mt-1 text-sm text-red-600">{logoError}</p>}
            </div>
          </Section>

          <Section title="Look">
            <div>
              <label htmlFor="brand-color" className={label}>Brand color</label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use ${c}`}
                    aria-pressed={brand.primary.toLowerCase() === c}
                    onClick={() => update({ primary: c })}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      brand.primary.toLowerCase() === c ? "border-zinc-950" : "border-white ring-1 ring-zinc-200",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pick a custom color"
                  value={colorText}
                  onChange={(e) => update({ primary: e.target.value })}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-zinc-300 bg-white p-1"
                />
                <input
                  id="brand-color"
                  className={cn(input, "mt-0 font-mono")}
                  value={brand.primary}
                  maxLength={7}
                  spellCheck={false}
                  aria-invalid={!HEX_COLOR.test(brand.primary)}
                  onChange={(e) => update({ primary: e.target.value })}
                />
              </div>
              {!HEX_COLOR.test(brand.primary) && (
                <p role="alert" className="mt-1 text-sm text-red-600">Use a color like #2563eb.</p>
              )}
            </div>
            <Segmented<Theme>
              legend="Theme"
              value={brand.theme}
              options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }]}
              onChange={(theme) => update({ theme })}
            />
            <Segmented<Radius>
              legend="Corners"
              value={brand.radius}
              options={[{ value: "sharp", label: "Sharp" }, { value: "rounded", label: "Rounded" }, { value: "pill", label: "Pill" }]}
              onChange={(radius) => update({ radius })}
            />
            <Segmented<FontStyle>
              legend="Font"
              value={brand.font}
              options={[{ value: "sans", label: "Sans" }, { value: "serif", label: "Serif" }, { value: "mono", label: "Mono" }]}
              onChange={(font) => update({ font })}
            />
          </Section>

          {source.chains.length > 0 && (
            <Section title="Chains">
              <fieldset>
                <legend className="sr-only">Supported chains</legend>
                <ul className="space-y-2">
                  {source.chains.map((chain) => {
                    const checked = brand.chains.includes(chain.id);
                    const onlyOne = checked && brand.chains.length === 1;
                    return (
                      <li key={chain.id}>
                        <label className="flex items-center gap-3 text-base">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={onlyOne}
                            onChange={() =>
                              update({
                                chains: checked
                                  ? brand.chains.filter((c) => c !== chain.id)
                                  : [...brand.chains, chain.id],
                              })
                            }
                            className="h-5 w-5 accent-zinc-950"
                          />
                          {chain.name}
                        </label>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-xs text-zinc-500">Keep at least one chain.</p>
              </fieldset>
            </Section>
          )}

          <Section title="Fees">
            {source.feeFeasibility && (
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Fee recipient or referral</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
                      FEASIBILITY_STYLE[source.feeFeasibility],
                    )}
                  >
                    {source.feeFeasibility}
                  </span>
                </div>
                {source.feeNote && <p className="mt-2 text-sm text-zinc-600">{source.feeNote}</p>}
              </div>
            )}
            <div>
              <label htmlFor="fee-percent" className={label}>Your fee (%)</label>
              <input
                id="fee-percent"
                inputMode="decimal"
                className={input}
                value={feeText}
                aria-invalid={feeInvalid}
                onChange={(e) => onFee(e.target.value)}
              />
              {feeInvalid && (
                <p role="alert" className="mt-1 text-sm text-red-600">
                  Enter a number from 0 to {BRAND_LIMITS.maxFeeBps / 100}.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="fee-recipient" className={label}>Recipient address</label>
              <input
                id="fee-recipient"
                className={cn(input, "font-mono")}
                value={brand.feeRecipient}
                placeholder="0x..."
                spellCheck={false}
                maxLength={42}
                aria-invalid={recipientInvalid}
                onChange={(e) => update({ feeRecipient: e.target.value.trim() })}
              />
              {recipientInvalid && (
                <p role="alert" className="mt-1 text-sm text-red-600">That isn&apos;t a valid address.</p>
              )}
              <p className="mt-1 text-xs text-zinc-500">
                This records your intent. A fee only takes effect if the contracts accept a
                recipient, so check the analysis before relying on it.
              </p>
            </div>
          </Section>
        </div>

        <div className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <p className={cn(eyebrow, "mb-4")}>Live preview</p>
          <BrandedPreview brand={brand} source={source} />
          <p className="mt-3 text-xs text-zinc-500">
            A preview of your branding on a sample shell. It is not the protocol&apos;s real
            interface yet.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => downloadConfig(project)}
              className="rounded-full border-2 border-zinc-950 px-6 py-3 text-base font-bold transition-colors hover:bg-zinc-950/5"
            >
              Download config
            </button>
            <button
              type="button"
              disabled
              className="cursor-not-allowed rounded-full bg-zinc-100 px-6 py-3 text-base font-bold text-zinc-400"
            >
              Deploy (soon)
            </button>
            <p role="status" className={cn("text-sm", saveFailed ? "text-red-600" : "text-zinc-500")}>
              {saveFailed
                ? "Couldn't save: browser storage is full or blocked."
                : "Saved in this browser."}
            </p>
          </div>

          <p className="mt-8 rounded-2xl bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-500">
            Before you launch, check the original app&apos;s license and brand rules. Reusing its
            name, logo or code may not be allowed even though its contracts are public.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CustomizeView() {
  const params = useSearchParams();
  const { user } = usePrivy();
  const projectId = params.get("project");

  if (!projectId || !user) {
    return (
      <div>
        <h1 className="text-5xl font-semibold tracking-tighter">Nothing to customize</h1>
        <p className="mt-4 text-zinc-600">Reverse a protocol first, then customize it.</p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex rounded-full bg-zinc-950 px-6 py-3 text-base font-bold text-white hover:bg-zinc-800"
        >
          Back to workspace
        </Link>
      </div>
    );
  }

  return <CustomizeEditor key={projectId} userId={user.id} projectId={projectId} />;
}

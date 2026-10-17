"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";

import { Segmented, SWATCHES } from "@/components/project/controls";
import StageFrame from "@/components/project/stage-frame";
import {
  BRAND_LIMITS,
  type Brand,
  EVM_ADDRESS,
  getProject,
  isLogoDataUrl,
  HEX_COLOR,
  paramKey,
  type FontStyle,
  type Radius,
  type Project,
  saveProject,
} from "@/lib/projects";
import { cn } from "@/lib/utils";

const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const label = "block text-sm font-medium text-zinc-700";
const input =
  "mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-base text-ink outline-none placeholder:text-zinc-400 focus:border-ink";

function Accordion({
  id,
  title,
  hint,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  hint?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-zinc-200 py-4 first:border-t-0 first:pt-0">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="font-semibold">{title}</span>
          <span className="flex min-w-0 flex-1 items-center gap-2 text-xs text-zinc-500">
            {hint}
          </span>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className={cn(
              "h-4 w-4 shrink-0 fill-none stroke-current stroke-2 transition-transform",
              open && "rotate-180",
            )}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>
      {open && (
        <div id={`${id}-panel`} className="mt-4 space-y-5">
          {children}
        </div>
      )}
    </section>
  );
}

function Review({ userId, projectId }: { userId: string; projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(() =>
    getProject(userId, projectId),
  );
  // Always the latest edit, so quick changes never overwrite each other
  const latest = useRef<Project | null>(project);
  const [saveFailed, setSaveFailed] = useState(false);
  const [open, setOpen] = useState<string>("project");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [feeText, setFeeText] = useState(() =>
    project ? String(project.brand.feeBps / 100) : "0",
  );

  if (!project) {
    return (
      <StageFrame>
        <h1 className="text-5xl font-semibold tracking-tighter sm:text-7xl">
          Project not found
        </h1>
        <p className="mt-4 max-w-md text-ink/75">
          It may have been saved in a different browser. Projects stay in the
          browser you created them in.
        </p>
        <Link
          href="/project/new"
          className="mt-8 rounded-full bg-ink px-6 py-3 text-base font-bold text-white transition-colors hover:bg-white hover:text-ink"
        >
          Start a project
        </Link>
      </StageFrame>
    );
  }

  const { brand, source } = project;
  const colorOk = HEX_COLOR.test(brand.primary);

  function update(patch: Partial<Brand>) {
    const base = latest.current;
    if (!base) return;
    const next: Project = { ...base, brand: { ...base.brand, ...patch } };
    latest.current = next;
    setProject(next);
    setSaveFailed(!saveProject(userId, next));
  }

  const maxFee = BRAND_LIMITS.maxFeeBps / 100;
  const feeNumber = Number(feeText);
  const feeInvalid =
    feeText.trim() === "" ||
    !Number.isFinite(feeNumber) ||
    feeNumber < 0 ||
    feeNumber > maxFee;
  const recipientInvalid =
    brand.feeRecipient !== "" && !EVM_ADDRESS.test(brand.feeRecipient);

  function onFee(text: string) {
    setFeeText(text);
    const n = Number(text);
    if (text.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= maxFee)
      update({ feeBps: Math.round(n * 100) });
  }

  function onLogo(file: File | undefined) {
    setLogoError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setLogoError("Use a PNG, JPEG, WebP or SVG image.");
      return;
    }
    if (file.size > BRAND_LIMITS.logoBytes) {
      setLogoError(
        "Keep the logo under " + BRAND_LIMITS.logoBytes / 1024 + " KB.",
      );
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

  function setDefault(key: string, value: string) {
    update({ paramDefaults: { ...brand.paramDefaults, [key]: value } });
  }

  // Settings found in the contracts' write functions, on the chains being kept
  const settings = (project.findings?.contracts ?? [])
    .filter(
      (c) => brand.chains.includes(c.chainId) && (c.params?.length ?? 0) > 0,
    )
    .slice(0, 12);
  // Fees only make sense where a contract already has a fee, referral or payout input
  const hasFees = settings.some((c) =>
    (c.params ?? []).some((p) => p.kind === "fee" || p.kind === "payout"),
  );
  const defaultsInvalid = settings.some((c) =>
    (c.params ?? []).some((p) => {
      const v =
        brand.paramDefaults[
          paramKey(c.chainId, c.address, p.function, p.param)
        ] ?? "";
      return (
        (p.kind === "payout" || p.kind === "recipient") &&
        v.trim() !== "" &&
        !EVM_ADDRESS.test(v.trim())
      );
    }),
  );

  const toggle = (id: string) => setOpen((cur) => (cur === id ? "" : id));

  return (
    <StageFrame backLabel="New project">
      <div className="w-full max-w-4xl rounded-[34px] bg-white/30 p-2 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.35)]">
        <div className="grid overflow-hidden rounded-[28px] bg-white text-left md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="flex flex-col p-6 sm:p-9">
            <h1 className="text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl">
              Review your brand setup
            </h1>
            <p className="mt-3 text-base text-zinc-500">
              We pulled this from {source.host}. Adjust anything before creating
              your project.
            </p>
            <div className="mt-8 md:mt-auto">
              {saveFailed && (
                <p role="alert" className="mb-3 text-sm text-red-600">
                  Couldn&apos;t save: browser storage is full or blocked.
                </p>
              )}
              <button
                type="button"
                disabled={
                  !colorOk ||
                  brand.name.trim() === "" ||
                  (hasFees && (feeInvalid || recipientInvalid)) ||
                  defaultsInvalid
                }
                onClick={() => router.push("/project/" + project.id)}
                className="w-full rounded-full bg-ink px-6 py-3 text-base font-bold text-white transition-colors enabled:hover:bg-signal enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Create project
              </button>
              <Link
                href="/project/new"
                className="mt-3 flex items-center justify-center gap-1 rounded-full py-2 text-sm font-semibold text-ink/80 transition-colors hover:text-ink"
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
                Back
              </Link>
            </div>
          </div>

          <div className="max-h-[32rem] overflow-y-auto border-t border-zinc-200 p-6 sm:p-9 md:border-l md:border-t-0">
            <Accordion
              id="project"
              title="Project"
              open={open === "project"}
              onToggle={() => toggle("project")}
            >
              <div>
                <label htmlFor="review-name" className={label}>
                  Name
                </label>
                <input
                  id="review-name"
                  className={input}
                  value={brand.name}
                  maxLength={BRAND_LIMITS.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="review-tagline" className={label}>
                  Tagline <span className="text-zinc-400">(optional)</span>
                </label>
                <textarea
                  id="review-tagline"
                  rows={3}
                  className={cn(input, "resize-none")}
                  value={brand.tagline}
                  maxLength={BRAND_LIMITS.tagline}
                  onChange={(e) => update({ tagline: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="review-logo" className={label}>
                  Logo
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="review-logo"
                    type="file"
                    accept={LOGO_TYPES.join(",")}
                    onChange={(e) => {
                      onLogo(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                    className="min-w-0 flex-1 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white"
                  />
                  {brand.logo && (
                    <button
                      type="button"
                      onClick={() => update({ logo: null })}
                      className="shrink-0 text-sm font-semibold text-zinc-500 hover:text-ink"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Square works best, up to {BRAND_LIMITS.logoBytes / 1024} KB.
                  Without one we use your first letter.
                </p>
                {logoError && (
                  <p role="alert" className="mt-1 text-sm text-red-600">
                    {logoError}
                  </p>
                )}
              </div>
              <div>
                <p className={label}>Category</p>
                <p className="mt-2 rounded-2xl bg-zinc-50 px-4 py-3 text-base text-zinc-600">
                  {source.category}
                </p>
              </div>
            </Accordion>

            <Accordion
              id="colors"
              title="Brand colors"
              hint={
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-full ring-1 ring-black/10"
                  style={{ background: colorOk ? brand.primary : "#111111" }}
                />
              }
              open={open === "colors"}
              onToggle={() => toggle("colors")}
            >
              <div className="flex flex-wrap items-center gap-2">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Use ${c}`}
                    aria-pressed={brand.primary.toLowerCase() === c}
                    onClick={() => update({ primary: c })}
                    className={cn(
                      "h-8 w-8 rounded-full border-2 transition-transform hover:scale-110",
                      brand.primary.toLowerCase() === c
                        ? "border-ink"
                        : "border-white ring-1 ring-zinc-200",
                    )}
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  aria-label="Pick a custom color"
                  value={colorOk ? brand.primary : "#111111"}
                  onChange={(e) => update({ primary: e.target.value })}
                  className="h-11 w-14 cursor-pointer rounded-xl border border-zinc-200 bg-white p-1"
                />
                <input
                  aria-label="Brand color hex"
                  className={cn(input, "mt-0 font-mono")}
                  value={brand.primary}
                  maxLength={7}
                  spellCheck={false}
                  aria-invalid={!colorOk}
                  onChange={(e) => update({ primary: e.target.value })}
                />
              </div>
              {!colorOk && (
                <p role="alert" className="text-sm text-red-600">
                  Use a color like #2563eb.
                </p>
              )}
            </Accordion>

            <Accordion
              id="look"
              title="Style"
              hint={
                <span className="capitalize">
                  {brand.font} &middot; {brand.theme} &middot; {brand.radius}
                </span>
              }
              open={open === "look"}
              onToggle={() => toggle("look")}
            >
              <Segmented<FontStyle>
                legend="Font"
                value={brand.font}
                options={[
                  { value: "sans", label: "Sans" },
                  { value: "serif", label: "Serif" },
                  { value: "mono", label: "Mono" },
                ]}
                onChange={(font) => update({ font })}
              />
              <Segmented
                legend="Theme"
                value={brand.theme}
                options={[
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
                onChange={(theme) => update({ theme })}
              />
              <Segmented<Radius>
                legend="Corners"
                value={brand.radius}
                options={[
                  { value: "sharp", label: "Sharp" },
                  { value: "rounded", label: "Rounded" },
                  { value: "pill", label: "Pill" },
                ]}
                onChange={(radius) => update({ radius })}
              />
            </Accordion>

            {source.chains.length > 0 && (
              <Accordion
                id="chains"
                title="Networks"
                hint={
                  <span>
                    {brand.chains.length} of {source.chains.length}
                  </span>
                }
                open={open === "chains"}
                onToggle={() => toggle("chains")}
              >
                <fieldset>
                  <legend className="sr-only">Supported networks</legend>
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
                              className="h-5 w-5 accent-ink"
                            />
                            {chain.name}
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-zinc-500">
                    Keep at least one network.
                  </p>
                </fieldset>
              </Accordion>
            )}

            {hasFees && (
              <Accordion
                id="fees"
                title="Fees and payouts"
                hint={
                  brand.feeBps > 0 ? (
                    <span>{brand.feeBps / 100}%</span>
                  ) : undefined
                }
                open={open === "fees"}
                onToggle={() => toggle("fees")}
              >
                {source.feeNote && (
                  <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600">
                    <span className="font-semibold capitalize">
                      {source.feeFeasibility ?? "Fees"}:
                    </span>{" "}
                    {source.feeNote}
                  </p>
                )}
                <div>
                  <label htmlFor="review-fee" className={label}>
                    Your fee (%)
                  </label>
                  <input
                    id="review-fee"
                    inputMode="decimal"
                    className={input}
                    value={feeText}
                    aria-invalid={feeInvalid}
                    onChange={(e) => onFee(e.target.value)}
                  />
                  {feeInvalid && (
                    <p role="alert" className="mt-1 text-sm text-red-600">
                      Enter a number from 0 to {maxFee}.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="review-recipient" className={label}>
                    Payout address
                  </label>
                  <input
                    id="review-recipient"
                    className={cn(input, "font-mono")}
                    value={brand.feeRecipient}
                    placeholder="0x..."
                    spellCheck={false}
                    maxLength={42}
                    aria-invalid={recipientInvalid}
                    onChange={(e) =>
                      update({ feeRecipient: e.target.value.trim() })
                    }
                  />
                  {recipientInvalid && (
                    <p role="alert" className="mt-1 text-sm text-red-600">
                      That isn&apos;t a valid address.
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    Prefilled into fee and referral inputs below, never into
                    inputs that receive a swap or transfer. A fee only takes
                    effect where a contract accepts one.
                  </p>
                </div>
              </Accordion>
            )}

            {settings.length > 0 && (
              <Accordion
                id="params"
                title="Contract settings"
                hint={
                  <span>
                    {settings.reduce((n, c) => n + (c.params?.length ?? 0), 0)}{" "}
                    found
                  </span>
                }
                open={open === "params"}
                onToggle={() => toggle("params")}
              >
                <>
                  <p className="text-sm text-zinc-500">
                    Inputs in these contracts that look like a payout address or
                    a fee. Set what the generated app should prefill.
                  </p>
                  {settings.map((c) => (
                    <fieldset key={c.chainId + c.address} className="space-y-3">
                      <legend className="text-sm font-semibold">
                        {c.title}{" "}
                        <span className="font-normal text-zinc-400">
                          on {c.chainName}
                        </span>
                      </legend>
                      {(c.params ?? []).map((p) => {
                        const key = paramKey(
                          c.chainId,
                          c.address,
                          p.function,
                          p.param,
                        );
                        const value = brand.paramDefaults[key] ?? "";
                        const bad =
                          (p.kind === "payout" || p.kind === "recipient") &&
                          value.trim() !== "" &&
                          !EVM_ADDRESS.test(value.trim());
                        const id = "param-" + key;
                        return (
                          <div key={key}>
                            <label htmlFor={id} className={label}>
                              <span className="font-mono">{p.function}</span>{" "}
                              &middot; {p.param}{" "}
                              <span className="text-zinc-400">({p.type})</span>
                            </label>
                            <input
                              id={id}
                              className={cn(input, "font-mono")}
                              value={value}
                              spellCheck={false}
                              aria-invalid={bad}
                              placeholder={
                                p.kind === "fee"
                                  ? "Value, as the contract expects it"
                                  : p.kind === "payout" &&
                                      EVM_ADDRESS.test(brand.feeRecipient)
                                    ? "Uses your payout address"
                                    : "0x..."
                              }
                              onChange={(e) => setDefault(key, e.target.value)}
                            />
                            {bad && (
                              <p
                                role="alert"
                                className="mt-1 text-sm text-red-600"
                              >
                                That isn&apos;t a valid address.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </fieldset>
                  ))}
                </>
              </Accordion>
            )}
          </div>
        </div>
      </div>
    </StageFrame>
  );
}

/** Step between the scan and the full editor: confirm the basics of the new brand. */
export default function ReviewBrand() {
  const params = useSearchParams();
  const { user } = usePrivy();
  const projectId = params.get("project");

  if (!projectId || !user) {
    return (
      <StageFrame>
        <h1 className="text-5xl font-semibold tracking-tighter sm:text-7xl">
          Nothing to review
        </h1>
        <p className="mt-4 text-ink/75">Reverse a web3 app first.</p>
        <Link
          href="/project/new"
          className="mt-8 rounded-full bg-ink px-6 py-3 text-base font-bold text-white transition-colors hover:bg-white hover:text-ink"
        >
          Start a project
        </Link>
      </StageFrame>
    );
  }

  return <Review key={projectId} userId={user.id} projectId={projectId} />;
}

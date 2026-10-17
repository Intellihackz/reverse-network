"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";

import LogoMark from "@/components/logo-mark";
import NewReverseForm from "@/components/dashboard/new-reverse-form";
import ProjectList from "@/components/dashboard/project-list";
import { SUPPORTED_CHAINS } from "@/lib/analyzer/chains";
import {
  clearLocalProjects,
  exportAllProjects,
  type ProjectSummary,
  readLocalProjects,
} from "@/lib/projects";
import { useProjectsApi } from "@/lib/use-projects-api";

function firstName(user: ReturnType<typeof usePrivy>["user"]): string {
  const raw =
    user?.google?.name ??
    user?.github?.name ??
    user?.github?.username ??
    user?.email?.address.split("@")[0] ??
    user?.google?.email.split("@")[0] ??
    "";
  const first = raw.trim().split(/[\s._-]+/)[0] ?? "";
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function downloadBackup(json: string) {
  const blob = new Blob([json], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `reverse-network-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

const card = "rounded-3xl border border-zinc-200 bg-white p-6";
const cardTitle = "text-xl font-semibold tracking-tight";

export default function DashboardHome() {
  const { user } = usePrivy();
  const userId = user?.id ?? "";
  const name = firstName(user);
  const api = useProjectsApi();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    async function load() {
      try {
        // Projects saved in this browser before accounts had a database move over once
        const local = readLocalProjects(userId);
        if (local.length > 0) {
          const added = await api.importLocal(local).catch(() => null);
          if (added !== null) {
            clearLocalProjects(userId);
            if (!cancelled) setImportedCount(added);
          }
        }
        const list = await api.list();
        if (!cancelled) setProjects(list);
      } catch (e) {
        if (!cancelled)
          setLoadError(
            e instanceof Error ? e.message : "Couldn't load your projects.",
          );
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, api]);

  async function removeProject(project: ProjectSummary) {
    if (
      !window.confirm(
        `Delete ${project.brand.name || "this project"}? This can't be undone.`,
      )
    )
      return;
    setActionError(null);
    try {
      await api.remove(project.id);
      setProjects((list) => list?.filter((p) => p.id !== project.id) ?? list);
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Couldn't delete that project.",
      );
    }
  }

  async function backup() {
    setActionError(null);
    try {
      downloadBackup(exportAllProjects(await api.listFull()));
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Couldn't prepare your backup.",
      );
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <section className="pt-4 text-center sm:pt-10">
        <h1 className="text-4xl font-semibold leading-[1.04] tracking-tighter sm:text-5xl lg:text-6xl">
          {greeting()}
          {name ? `, ${name}` : ""}
          <span className="mt-1 block text-zinc-400">
            What will you rewind today?
          </span>
        </h1>
        <NewReverseForm />
      </section>

      <div className="mt-14 grid gap-4 md:grid-cols-3">
        <section
          aria-labelledby="projects-heading"
          className={`${card} md:col-span-2`}
        >
          <div className="flex items-center justify-between">
            <h2 id="projects-heading" className={cardTitle}>
              Recent projects
            </h2>
            <Link
              href="/project/new"
              aria-label="Start a new project"
              className="rounded-full border border-zinc-200 p-2 text-zinc-600 transition-colors hover:border-ink hover:text-ink"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="h-4 w-4 fill-none stroke-current stroke-2"
                strokeLinecap="round"
              >
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Link>
          </div>
          <div className="mt-4">
            {importedCount > 0 && (
              <p
                role="status"
                className="mb-3 rounded-2xl bg-zinc-50 px-4 py-3 text-sm text-zinc-600"
              >
                Moved {importedCount} project{importedCount === 1 ? "" : "s"}{" "}
                from this browser to your account.
              </p>
            )}
            {actionError && (
              <p role="alert" className="mb-3 text-sm text-red-600">
                {actionError}
              </p>
            )}
            {loadError ? (
              <p
                role="alert"
                className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {loadError}
              </p>
            ) : projects === null ? (
              <p
                role="status"
                className="py-10 text-center text-sm text-zinc-500"
              >
                Loading your projects...
              </p>
            ) : (
              <ProjectList projects={projects} onDelete={removeProject} />
            )}
          </div>
        </section>

        <section
          aria-labelledby="backup-heading"
          className="relative flex min-h-64 flex-col overflow-hidden rounded-3xl bg-ink p-6 text-white"
        >
          <LogoMark className="pointer-events-none absolute -bottom-10 -right-8 h-48 w-auto text-signal" />
          <h2 id="backup-heading" className={cardTitle}>
            Back up your work
          </h2>
          <p className="relative mt-2 max-w-[16rem] text-sm leading-relaxed text-white/65">
            Your projects are saved to your account. Download a copy of all of
            them, including any file edits, to keep your own.
          </p>
          <button
            type="button"
            onClick={backup}
            disabled={!projects || projects.length === 0}
            className="relative mt-auto w-fit rounded-full bg-white px-5 py-2.5 text-sm font-bold text-ink transition-colors enabled:hover:bg-signal disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download backup
          </button>
        </section>
      </div>

      <div className="mt-4 grid gap-4 pb-2 md:grid-cols-2">
        <section aria-labelledby="chains-heading" className={card}>
          <h2 id="chains-heading" className={cardTitle}>
            Networks we read
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Contracts are looked up across these chains, then matched to
            verified source.
          </p>
          <ul className="mt-5 flex flex-wrap gap-2">
            {SUPPORTED_CHAINS.map((chain) => (
              <li
                key={chain.id}
                className="flex items-center gap-2 rounded-full border border-zinc-200 px-3.5 py-1.5 text-sm font-medium"
              >
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-signal"
                />
                {chain.name}
              </li>
            ))}
          </ul>
        </section>

        <section
          aria-labelledby="ship-heading"
          className={`${card} flex flex-col bg-gradient-to-br from-white to-bone`}
        >
          <div className="flex items-center gap-3">
            <h2 id="ship-heading" className={cardTitle}>
              Ship your app
            </h2>
            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-500 ring-1 ring-black/5">
              Soon
            </span>
          </div>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Turn a saved project into a live, wallet-ready site with your brand
            on it.
          </p>
          <button
            type="button"
            disabled
            className="mt-5 w-fit cursor-not-allowed rounded-full bg-white px-5 py-2.5 text-sm font-bold text-zinc-400 ring-1 ring-black/5"
          >
            Coming soon
          </button>
        </section>
      </div>
    </div>
  );
}

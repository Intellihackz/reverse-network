"use client";

import Link from "next/link";

import { BrandMark } from "@/components/dashboard/branded-preview";
import { downloadBrandedApp } from "@/lib/export/download";
import type { Project } from "@/lib/projects";

function updatedLabel(timestamp: number) {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  return `Updated ${new Date(timestamp).toLocaleDateString()}`;
}

/** Saved projects as compact rows, meant to sit inside a card. */
export default function ProjectList({
  projects,
  onDelete,
}: {
  projects: Project[];
  onDelete: (project: Project) => void;
}) {
  if (projects.length === 0) {
    return (
      <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 px-6 py-10 text-center">
        <p className="font-semibold">No projects yet</p>
        <p className="mt-1 max-w-xs text-sm text-zinc-500">
          Paste a web3 app URL above. Once you customize it, it shows up here.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-zinc-100">
      {projects.map((project) => (
        <li key={project.id} className="flex items-center gap-3 py-3.5">
          <BrandMark brand={project.brand} size={40} icon={project.source.icon} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{project.brand.name || "Untitled"}</p>
            <p className="truncate text-sm text-zinc-500">
              {project.source.host} &middot; {updatedLabel(project.updatedAt)}
            </p>
          </div>
          <Link
            href={`/project/${project.id}`}
            className="shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-signal hover:text-ink"
          >
            Open
          </Link>
          <button
            type="button"
            onClick={() => downloadBrandedApp(project)}
            aria-label={`Download ${project.brand.name || "project"} as an app`}
            title="Download app"
            className="shrink-0 rounded-full p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-ink"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onDelete(project)}
            aria-label={`Delete ${project.brand.name || "project"}`}
            className="shrink-0 rounded-full p-2 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}

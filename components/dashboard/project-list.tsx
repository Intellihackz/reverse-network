"use client";

import { useState } from "react";
import Link from "next/link";
import { BrandMark } from "@/components/dashboard/branded-preview";
import { deleteProject, listProjects, type Project } from "@/lib/projects";

function updatedLabel(timestamp: number) {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr ago`;
  return `Updated ${new Date(timestamp).toLocaleDateString()}`;
}

// Only rendered once the sign-in gate has passed, so reading storage never runs during SSR
export default function ProjectList({ userId }: { userId: string }) {
  const [projects, setProjects] = useState<Project[]>(() => (userId ? listProjects(userId) : []));

  function remove(project: Project) {
    if (!window.confirm(`Delete ${project.brand.name || "this project"}? This can't be undone.`)) return;
    deleteProject(userId, project.id);
    setProjects(listProjects(userId));
  }

  if (projects.length === 0) {
    return (
      <div className="mt-4 flex min-h-72 flex-1 flex-col items-center justify-center rounded-3xl border border-dashed border-zinc-300 px-8 py-16 text-center">
        <p className="text-xl font-semibold">Nothing here yet</p>
        <p className="mx-auto mt-2 max-w-md text-zinc-500">
          Protocols you reverse engineer will show up here once you customize them.
        </p>
      </div>
    );
  }

  return (
    <ul className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <li key={project.id} className="flex flex-col rounded-3xl border border-zinc-200 p-6">
          <div className="flex items-center gap-3">
            <BrandMark brand={project.brand} size={40} />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{project.brand.name || "Untitled"}</p>
              <p className="truncate text-sm text-zinc-500">Based on {project.source.host}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            {project.source.category} &middot; {updatedLabel(project.updatedAt)}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Link
              href={`/dashboard/customize?project=${project.id}`}
              className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={() => remove(project)}
              className="rounded-full px-4 py-2.5 text-sm font-semibold text-zinc-500 transition-colors hover:text-red-600"
            >
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

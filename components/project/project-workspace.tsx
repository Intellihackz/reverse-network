"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { BrandMark } from "@/components/dashboard/branded-preview";
import FindingsDrawer from "@/components/dashboard/findings-drawer";
import StageFrame from "@/components/project/stage-frame";
import { useLoadedProject } from "@/components/project/use-loaded-project";
import { downloadBrandedApp } from "@/lib/export/download";
import { generateFiles } from "@/lib/export/build-app";
import { EDIT_LIMITS, type Project } from "@/lib/projects";
import { useDebouncedSave } from "@/lib/use-debounced-save";
import { useProjectsApi } from "@/lib/use-projects-api";
import { cn } from "@/lib/utils";

interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  isFile: boolean;
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode = { name: "", path: "", children: [], isFile: false };
  for (const path of paths) {
    let node = root;
    path.split("/").forEach((part, i, parts) => {
      const isFile = i === parts.length - 1;
      const childPath = parts.slice(0, i + 1).join("/");
      let child = node.children.find(
        (c) => c.name === part && c.isFile === isFile,
      );
      if (!child) {
        child = { name: part, path: childPath, children: [], isFile };
        node.children.push(child);
      }
      node = child;
    });
  }
  const order = (nodes: TreeNode[]) => {
    nodes.sort(
      (a, b) =>
        Number(a.isFile) - Number(b.isFile) || a.name.localeCompare(b.name),
    );
    nodes.forEach((n) => order(n.children));
  };
  order(root.children);
  return root.children;
}

const LANGUAGE: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript React",
  json: "JSON",
  css: "CSS",
  md: "Markdown",
  mjs: "JavaScript",
};

const languageOf = (path: string) =>
  LANGUAGE[path.split(".").pop() ?? ""] ?? "Plain text";

function TreeView({
  nodes,
  depth,
  active,
  edited,
  onOpen,
}: {
  nodes: TreeNode[];
  depth: number;
  active: string;
  edited: Set<string>;
  onOpen: (path: string) => void;
}) {
  return (
    <ul>
      {nodes.map((node) =>
        node.isFile ? (
          <li key={node.path}>
            <button
              type="button"
              onClick={() => onOpen(node.path)}
              aria-current={active === node.path ? "true" : undefined}
              style={{ paddingLeft: 12 + depth * 14 }}
              className={cn(
                "flex w-full items-center gap-2 py-1.5 pr-3 text-left font-mono text-[13px] transition-colors",
                active === node.path
                  ? "bg-zinc-200/70 font-semibold text-ink"
                  : "text-zinc-600 hover:bg-zinc-100",
              )}
            >
              <span className="truncate">{node.name}</span>
              {edited.has(node.path) && (
                <span
                  aria-label="modified"
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-signal"
                />
              )}
            </button>
          </li>
        ) : (
          <li key={node.path}>
            <details open={depth === 0 || node.name === "app"}>
              <summary
                style={{ paddingLeft: 12 + depth * 14 }}
                className="cursor-pointer select-none py-1.5 pr-3 font-mono text-[13px] font-semibold text-zinc-800 hover:bg-zinc-100"
              >
                {node.name}
              </summary>
              <TreeView
                nodes={node.children}
                depth={depth + 1}
                active={active}
                edited={edited}
                onOpen={onOpen}
              />
            </details>
          </li>
        ),
      )}
    </ul>
  );
}

const DEFAULT_FILE = "reverse.config.json";

function Workspace({ initial }: { initial: Project }) {
  const api = useProjectsApi();
  const [project, setProject] = useState<Project>(initial);
  const latest = useRef<Project>(initial);
  const saver = useDebouncedSave((edits: Record<string, string>) =>
    api.save(initial.id, { edits }),
  );
  const [open, setOpen] = useState<string[]>([DEFAULT_FILE]);
  const [active, setActive] = useState(DEFAULT_FILE);
  const [showFindings, setShowFindings] = useState(false);
  const closeFindings = useCallback(() => setShowFindings(false), []);
  const gutter = useRef<HTMLPreElement>(null);
  const escaped = useRef(false);

  const generated = useMemo(() => generateFiles(project), [project]);
  const base = useMemo(
    () => new Map(generated.map((f) => [f.path, f.content])),
    [generated],
  );
  const tree = useMemo(
    () => buildTree(generated.map((f) => f.path)),
    [generated],
  );

  const contentOf = (path: string) =>
    project.edits[path] ?? base.get(path) ?? "";
  const edited = new Set(
    Object.keys(project.edits).filter(
      (p) => base.has(p) && project.edits[p] !== base.get(p),
    ),
  );

  function setEdit(path: string, content: string) {
    const current = latest.current;
    const edits = { ...current.edits };
    if (content === base.get(path)) delete edits[path];
    else if (content.length <= EDIT_LIMITS.bytes) edits[path] = content;
    else return;
    const next = { ...current, edits };
    latest.current = next;
    setProject(next);
    saver.schedule(edits);
  }

  function openFile(path: string) {
    setOpen((tabs) => (tabs.includes(path) ? tabs : [...tabs, path]));
    setActive(path);
  }

  function closeTab(path: string) {
    const remaining = open.filter((p) => p !== path);
    if (remaining.length === 0) remaining.push(DEFAULT_FILE);
    setOpen(remaining);
    if (active === path) setActive(remaining[remaining.length - 1]);
  }

  const text = contentOf(active);
  const lines = text.split("\n").length;
  const slug = project.brand.name || project.source.name;

  return (
    <main className="flex h-dvh flex-col bg-white p-3">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white">
        <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 sm:px-5">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-full py-1 pr-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-ink"
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
            Workspace
          </Link>
          <BrandMark
            brand={project.brand}
            size={32}
            icon={project.source.icon}
          />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold leading-tight">
              {slug}
            </h1>
            <p className="truncate text-xs text-zinc-500">
              {project.source.host}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowFindings(true)}
            aria-haspopup="dialog"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold transition-colors hover:border-ink"
          >
            What we found
          </button>
          <Link
            href={"/project/review?project=" + project.id}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold transition-colors hover:border-ink"
          >
            Edit brand
          </Link>
          <button
            type="button"
            onClick={() => downloadBrandedApp(project)}
            className="rounded-full bg-ink px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-signal hover:text-ink"
          >
            Download app
          </button>
        </header>

        <FindingsDrawer
          open={showFindings}
          onClose={closeFindings}
          source={project.source}
          findings={project.findings}
        />
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <nav
            aria-label="Files"
            className="hidden w-64 shrink-0 overflow-y-auto border-r border-zinc-200 bg-zinc-50 py-2 md:block"
          >
            <TreeView
              nodes={tree}
              depth={0}
              active={active}
              edited={edited}
              onOpen={openFile}
            />
          </nav>
          <div className="border-b border-zinc-200 p-3 md:hidden">
            <label htmlFor="file-select" className="sr-only">
              File
            </label>
            <select
              id="file-select"
              value={active}
              onChange={(e) => openFile(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 font-mono text-sm"
            >
              {generated.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.path}
                </option>
              ))}
            </select>
          </div>

          <section
            aria-label="Editor"
            className="flex min-h-0 min-w-0 flex-1 flex-col bg-zinc-950 text-zinc-100"
          >
            <div
              role="tablist"
              className="flex shrink-0 overflow-x-auto border-b border-white/10 bg-zinc-900"
            >
              {open.map((path) => (
                <div
                  key={path}
                  className={cn(
                    "flex shrink-0 items-center gap-2 border-r border-white/10 pl-4 pr-2 font-mono text-[13px]",
                    active === path
                      ? "bg-zinc-950 text-white"
                      : "text-zinc-400",
                  )}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={active === path}
                    onClick={() => setActive(path)}
                    className="py-2.5"
                  >
                    {path.split("/").pop()}
                    {edited.has(path) && (
                      <span className="ml-1.5 text-signal">&bull;</span>
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label={"Close " + path}
                    onClick={() => closeTab(path)}
                    className="rounded p-1 text-zinc-500 hover:bg-white/10 hover:text-white"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            <div className="flex min-h-0 flex-1">
              <pre
                ref={gutter}
                aria-hidden="true"
                className="m-0 w-12 shrink-0 select-none overflow-hidden bg-zinc-950 py-3 pr-3 text-right font-mono text-[13px] leading-5 text-zinc-600"
              >
                {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
              </pre>
              <textarea
                key={active}
                aria-label={"Edit " + active}
                value={text}
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                wrap="off"
                onChange={(e) => setEdit(active, e.target.value)}
                onScroll={(e) => {
                  if (gutter.current)
                    gutter.current.scrollTop = e.currentTarget.scrollTop;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") escaped.current = true;
                  else if (e.key === "Tab" && !e.shiftKey && !escaped.current) {
                    e.preventDefault();
                    const ta = e.currentTarget;
                    ta.setRangeText(
                      "  ",
                      ta.selectionStart,
                      ta.selectionEnd,
                      "end",
                    );
                    setEdit(active, ta.value);
                  } else if (e.key !== "Shift") escaped.current = false;
                }}
                className="min-w-0 flex-1 resize-none bg-zinc-950 py-3 pr-4 font-mono text-[13px] leading-5 text-zinc-100 outline-none"
              />
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-zinc-900 px-4 py-2 font-mono text-xs text-zinc-400">
              <span className="truncate">{active}</span>
              <span>{languageOf(active)}</span>
              {edited.has(active) && (
                <button
                  type="button"
                  onClick={() => setEdit(active, base.get(active) ?? "")}
                  className="font-semibold text-signal hover:underline"
                >
                  Reset to generated
                </button>
              )}
              <span
                role="status"
                className={cn(
                  "ml-auto",
                  saver.state === "failed" && "text-red-400",
                )}
              >
                {saver.state === "failed"
                  ? "Couldn't save: " + saver.error
                  : saver.state === "saving"
                    ? "Saving..."
                    : "Saved to your account"}
              </span>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Load({ id }: { id: string }) {
  const state = useLoadedProject(id);
  if (state.status === "ready") return <Workspace initial={state.project} />;
  return (
    <StageFrame>
      {state.status === "loading" ? (
        <p role="status">Loading your project...</p>
      ) : (
        <>
          <h1 className="text-5xl font-semibold tracking-tighter sm:text-7xl">
            {state.status === "missing"
              ? "Project not found"
              : "Couldn't load it"}
          </h1>
          <p className="mt-4 max-w-md text-ink/75">
            {state.status === "missing"
              ? "It may have been deleted."
              : state.message}
          </p>
          <Link
            href="/dashboard"
            className="mt-8 rounded-full bg-ink px-6 py-3 text-base font-bold text-white transition-colors hover:bg-white hover:text-ink"
          >
            Back to workspace
          </Link>
        </>
      )}
    </StageFrame>
  );
}

export default function ProjectWorkspace() {
  const params = useParams<{ id: string }>();
  return <Load key={params.id} id={params.id} />;
}

import { and, count, desc, eq } from "drizzle-orm";

import {
  BRAND_LIMITS,
  type Brand,
  mergeAnalysis,
  type Project,
  type ProjectSummary,
  sanitizeBrand,
  sanitizeEdits,
  sanitizeProject,
} from "@/lib/projects";
import type { AnalysisResult } from "@/lib/analyzer/types";

import { db } from "./db";
import { type ProjectRow, projects } from "./db/schema";

const toProject = (row: ProjectRow): Project => ({
  id: row.id,
  createdAt: row.createdAt.getTime(),
  updatedAt: row.updatedAt.getTime(),
  source: row.source,
  brand: row.brand,
  findings: row.findings ?? null,
  edits: row.edits ?? {},
});

const toSummary = (row: ProjectRow): ProjectSummary => ({
  id: row.id,
  createdAt: row.createdAt.getTime(),
  updatedAt: row.updatedAt.getTime(),
  source: row.source,
  brand: row.brand,
});

export async function listSummaries(userId: string): Promise<ProjectSummary[]> {
  const rows = await db().select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  return rows.map(toSummary);
}

export async function listFull(userId: string): Promise<Project[]> {
  const rows = await db().select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  return rows.map(toProject);
}

export async function getOne(userId: string, id: string): Promise<Project | null> {
  const [row] = await db()
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, id)));
  return row ? toProject(row) : null;
}

export class ProjectLimitError extends Error {}

async function assertRoom(userId: string) {
  const [{ n }] = await db().select({ n: count() }).from(projects).where(eq(projects.userId, userId));
  if (n >= BRAND_LIMITS.maxProjects) {
    throw new ProjectLimitError("You have reached the limit of " + BRAND_LIMITS.maxProjects + " projects.");
  }
}

/** Saves a scan: refreshes an app you already reversed (keeping your branding) or adds a new project. */
export async function saveScan(userId: string, result: AnalysisResult): Promise<Project> {
  const [existingRow] = await db()
    .select()
    .from(projects)
    .where(and(eq(projects.userId, userId), eq(projects.host, result.host)));

  const merged = mergeAnalysis(existingRow ? toProject(existingRow) : null, result);

  if (existingRow) {
    const [row] = await db()
      .update(projects)
      .set({ source: merged.source, findings: merged.findings, brand: merged.brand, updatedAt: new Date() })
      .where(and(eq(projects.userId, userId), eq(projects.id, existingRow.id)))
      .returning();
    return toProject(row);
  }

  await assertRoom(userId);
  const [row] = await db()
    .insert(projects)
    .values({
      userId,
      host: merged.source.host,
      source: merged.source,
      brand: merged.brand,
      findings: merged.findings,
      edits: {},
    })
    .returning();
  return toProject(row);
}

/** Updates the parts a person edits. Source and findings only change through a scan. */
export async function updateOne(
  userId: string,
  id: string,
  patch: { brand?: unknown; edits?: unknown },
): Promise<Project | null> {
  const current = await getOne(userId, id);
  if (!current) return null;

  const set: Partial<{ brand: Brand; edits: Record<string, string>; updatedAt: Date }> = { updatedAt: new Date() };
  if (patch.brand !== undefined) set.brand = sanitizeBrand(patch.brand, current.brand);
  if (patch.edits !== undefined) set.edits = sanitizeEdits(patch.edits);

  const [row] = await db()
    .update(projects)
    .set(set)
    .where(and(eq(projects.userId, userId), eq(projects.id, id)))
    .returning();
  return row ? toProject(row) : null;
}

export async function removeOne(userId: string, id: string): Promise<boolean> {
  const rows = await db()
    .delete(projects)
    .where(and(eq(projects.userId, userId), eq(projects.id, id)))
    .returning({ id: projects.id });
  return rows.length > 0;
}

/** Adds projects from this browser's old local storage. Apps already in the account are skipped. */
export async function importProjects(userId: string, raw: unknown[]): Promise<number> {
  const incoming = raw.flatMap((item) => {
    const p = sanitizeProject(item);
    return p ? [p] : [];
  });
  if (incoming.length === 0) return 0;

  const existing = new Set((await listSummaries(userId)).map((p) => p.source.host));
  let room = BRAND_LIMITS.maxProjects - existing.size;
  let added = 0;

  for (const p of incoming) {
    if (room <= 0) break;
    if (existing.has(p.source.host)) continue;
    existing.add(p.source.host);
    await db()
      .insert(projects)
      .values({
        userId,
        host: p.source.host,
        source: p.source,
        brand: p.brand,
        findings: p.findings,
        edits: p.edits,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      })
      .onConflictDoNothing();
    room -= 1;
    added += 1;
  }
  return added;
}

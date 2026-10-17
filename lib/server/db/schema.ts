import { jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import type { Brand, Findings, ProjectSource } from "@/lib/projects";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // The verified Privy user id. Every query is scoped by it.
    userId: text("user_id").notNull(),
    host: text("host").notNull(),
    source: jsonb("source").$type<ProjectSource>().notNull(),
    brand: jsonb("brand").$type<Brand>().notNull(),
    findings: jsonb("findings").$type<Findings | null>(),
    edits: jsonb("edits").$type<Record<string, string>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("projects_user_host").on(t.userId, t.host)],
);

export type ProjectRow = typeof projects.$inferSelect;

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

export class DatabaseNotConfigured extends Error {}

let cached: ReturnType<typeof create> | null = null;

function create(url: string) {
  return drizzle(neon(url), { schema });
}

/** Connects on first use, so builds and pages that never touch the database don't need the URL. */
export function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DatabaseNotConfigured("DATABASE_URL is not set.");
  return (cached ??= create(url));
}

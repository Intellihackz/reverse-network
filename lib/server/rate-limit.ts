const hits = new Map<string, number[]>();

const DEFAULT_LIMIT = 6;
const WINDOW_MS = 10 * 60_000;

function configuredLimit() {
  const fromEnv = Number(process.env.ANALYZE_RATE_LIMIT);
  return Number.isInteger(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_LIMIT;
}

/** Sliding-window limiter. In-memory, so it applies per server instance. */
export function rateLimit(
  key: string,
): { ok: true } | { ok: false; retryAfterSeconds: number } {
  const limit = configuredLimit();
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000)),
    };
  }

  recent.push(now);
  hits.set(key, recent);

  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return { ok: true };
}

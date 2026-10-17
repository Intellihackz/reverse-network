import { safeFetchText } from "./safe-fetch";

const MAX_ICON_BYTES = 64 * 1024;
const IMAGE_TYPES = new Map([
  ["image/png", "image/png"],
  ["image/jpeg", "image/jpeg"],
  ["image/webp", "image/webp"],
  ["image/gif", "image/gif"],
  ["image/svg+xml", "image/svg+xml"],
  ["image/x-icon", "image/x-icon"],
  ["image/vnd.microsoft.icon", "image/x-icon"],
]);

/** Icon links in the page, best first: touch icons are large and square, then plain icons. */
function iconLinks(html: string, base: string): string[] {
  const found: { href: string; score: number }[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1]?.toLowerCase() ?? "";
    const href = tag.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (!href || !/\bicon\b|apple-touch-icon/.test(rel) || /mask-icon/.test(rel)) continue;
    const size = Number(tag.match(/\bsizes=["'](\d+)x\d+/i)?.[1] ?? 0);
    const score = (rel.includes("apple-touch-icon") ? 1000 : 0) + (size > 0 && size <= 256 ? size : 0);
    try {
      found.push({ href: new URL(href, base).toString(), score });
    } catch {}
  }
  found.sort((a, b) => b.score - a.score);
  const links = found.map((f) => f.href);
  links.push(new URL("/favicon.ico", base).toString());
  return [...new Set(links)].slice(0, 4);
}

/** The site's own icon as a small data URL, or null. Never fails the scan. */
export async function fetchSiteIcon(
  html: string,
  pageUrl: string,
  signal?: AbortSignal,
): Promise<string | null> {
  for (const href of iconLinks(html, pageUrl)) {
    try {
      const res = await safeFetchText(href, { maxBytes: MAX_ICON_BYTES + 1, signal, accept: "image/*" });
      if (res.status !== 200 || res.truncated || res.bytes.length === 0) continue;
      const type = IMAGE_TYPES.get(res.contentType.split(";")[0].trim().toLowerCase());
      if (!type) continue;
      return "data:" + type + ";base64," + res.bytes.toString("base64");
    } catch {
      // Try the next candidate
    }
  }
  return null;
}

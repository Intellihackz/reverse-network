import dns from "node:dns";
import net from "node:net";
import { Agent, fetch as undiciFetch } from "undici";

/**
 * Fetches user-supplied URLs, so every request must be unable to reach our own
 * network. Blocking happens at connection time (the custom lookup below), which
 * also defeats DNS rebinding, because the address we validate is the one we dial.
 */

const blocked = new net.BlockList();
for (const [net4, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blocked.addSubnet(net4, prefix, "ipv4");
}
for (const [net6, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["64:ff9b::", 96], // NAT64
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const) {
  blocked.addSubnet(net6, prefix, "ipv6");
}

// BlockList stores IPv4 as IPv4-mapped IPv6 internally, so a ::ffff:0:0/96 rule would
// match every IPv4 address. Reject mapped literals by form instead.
const IPV4_MAPPED = /^(?:0{1,4}:){5}ffff:|^::ffff:/i;

export function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (family === 0) return true;
  if (family === 6 && IPV4_MAPPED.test(address)) return true;
  return blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

const safeLookup = ((
  hostname: string,
  options: dns.LookupOptions,
  callback: (...args: unknown[]) => void,
) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return callback(new Error("That address is not allowed."));
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}) as unknown as net.LookupFunction;

const agent = new Agent({
  connect: { lookup: safeLookup },
  headersTimeout: 10_000,
  bodyTimeout: 15_000,
});

/** An error whose message is safe to show to the user. */
export class UnsafeUrlError extends Error {}

/** Parses and validates a URL before we ever open a connection to it. */
export function parsePublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new UnsafeUrlError("That doesn't look like a valid URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UnsafeUrlError("Only http and https URLs are supported.");
  }
  if (url.username || url.password) {
    throw new UnsafeUrlError("URLs with credentials are not supported.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new UnsafeUrlError("Only standard web ports are supported.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new UnsafeUrlError("That address is not allowed.");
  }
  if (host === "localhost" || host.endsWith(".localhost") || !host.includes(".")) {
    if (!net.isIP(host)) throw new UnsafeUrlError("That address is not allowed.");
  }
  return url;
}

export interface FetchedText {
  url: string;
  status: number;
  contentType: string;
  text: string;
  truncated: boolean;
}

interface SafeFetchOptions {
  maxBytes?: number;
  signal?: AbortSignal;
  accept?: string;
}

const MAX_REDIRECTS = 3;

export async function safeFetchText(
  rawUrl: string,
  { maxBytes = 2_000_000, signal, accept = "*/*" }: SafeFetchOptions = {},
): Promise<FetchedText> {
  let current = parsePublicUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const timeout = AbortSignal.timeout(12_000);
    const res = await undiciFetch(current, {
      dispatcher: agent,
      redirect: "manual",
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      headers: {
        accept,
        "user-agent": "ReverseProtocolBot/1.0 (+protocol analysis)",
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      await res.body?.cancel();
      if (!location) throw new Error("Redirect without a destination.");
      current = parsePublicUrl(new URL(location, current).toString());
      continue;
    }

    const reader = res.body?.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    let truncated = false;
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          chunks.push(value.subarray(0, value.byteLength - (received - maxBytes)));
          truncated = true;
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    }

    return {
      url: current.toString(),
      status: res.status,
      contentType: res.headers.get("content-type") ?? "",
      text: Buffer.concat(chunks).toString("utf8"),
      truncated,
    };
  }

  throw new Error("Too many redirects.");
}

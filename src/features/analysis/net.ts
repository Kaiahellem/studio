import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// The server fetches addresses an admin types in, so every request (and every redirect) is
// checked against private, loopback, link-local and metadata ranges (docs/PLAN-ANALYSIS.md §5).

export class FetchRefused extends Error {}

function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((n, part) => n * 256 + Number(part), 0);
}

const blockedV4: [string, number][] = [
  ["0.0.0.0", 8], // "this" network
  ["10.0.0.0", 8], // private
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8], // loopback
  ["169.254.0.0", 16], // link-local, including cloud metadata
  ["172.16.0.0", 12], // private
  ["192.0.0.0", 24], // IETF protocol assignments
  ["192.0.2.0", 24], // documentation
  ["192.168.0.0", 16], // private
  ["198.18.0.0", 15], // benchmarking
  ["198.51.100.0", 24], // documentation
  ["203.0.113.0", 24], // documentation
  ["224.0.0.0", 4], // multicast
  ["240.0.0.0", 4], // reserved, broadcast
];

function inRange(ip: string, [base, bits]: [string, number]) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return ((ipv4ToInt(ip) & mask) >>> 0) === ((ipv4ToInt(base) & mask) >>> 0);
}

export function isPublicAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return !blockedV4.some((range) => inRange(ip, range));
  if (version !== 6) return false;
  const v6 = ip.toLowerCase();
  // IPv4-mapped (::ffff:a.b.c.d) is judged as the IPv4 address.
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicAddress(mapped[1]);
  if (v6 === "::" || v6 === "::1") return false;
  // Unique local fc00::/7, link-local fe80::/10, multicast ff00::/8, documentation 2001:db8::/32.
  if (/^f[cd]/.test(v6) || /^fe[89ab]/.test(v6) || v6.startsWith("ff") || v6.startsWith("2001:db8")) return false;
  return true;
}

// Only plain web addresses on the standard ports.
export function checkUrlShape(raw: string, anyPort = false): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchRefused("invalid url");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchRefused("protocol");
  if (!anyPort && url.port && url.port !== "80" && url.port !== "443") throw new FetchRefused("port");
  if (url.username || url.password) throw new FetchRefused("credentials");
  return url;
}

export type Resolver = (host: string) => Promise<string[]>;

const dnsResolver: Resolver = async (host) => (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

export async function assertPublicHost(url: URL, resolve: Resolver = dnsResolver, allow: (ip: string) => boolean = isPublicAddress) {
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : await resolve(host).catch(() => {
    throw new FetchRefused("dns");
  });
  if (addresses.length === 0 || !addresses.every(allow)) throw new FetchRefused("private address");
}

export type FetchedPage = { url: string; status: number; contentType: string; body: string };

export type SafeFetchOptions = {
  userAgent: string;
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  resolve?: Resolver;
  // Tests allow their local fixture server (address and port); the app always uses the defaults.
  allowAddress?: (ip: string) => boolean;
  allowAnyPort?: boolean;
};

// GET with manual redirects, each hop checked, a time limit and a size limit. The body is
// read only for text responses.
export async function safeFetch(raw: string, options: SafeFetchOptions): Promise<FetchedPage> {
  const { userAgent, timeoutMs = 10_000, maxBytes = 2 * 1024 * 1024, maxRedirects = 5, resolve, allowAddress, allowAnyPort = false } = options;
  let url = checkUrlShape(raw, allowAnyPort);

  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertPublicHost(url, resolve, allowAddress);
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "user-agent": userAgent, accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1" },
    });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      await response.body?.cancel();
      url = checkUrlShape(new URL(response.headers.get("location")!, url).toString(), allowAnyPort);
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    const isText = /^(text\/|application\/xhtml)/i.test(contentType);
    const body = isText ? await readLimited(response, maxBytes) : (await response.body?.cancel(), "");
    return { url: url.toString(), status: response.status, contentType, body };
  }
  throw new FetchRefused("too many redirects");
}

async function readLimited(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

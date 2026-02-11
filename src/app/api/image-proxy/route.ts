import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const UPSTREAM_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 5;
const DNS_TIMEOUT_MS = 2_500;

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const id = setTimeout(() => reject(new Error(message)), ms);
      (promise as Promise<T>).finally(() => clearTimeout(id));
    }),
  ]);
}

function isPrivateIp(ip: string) {
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1" || normalized === "::") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
    if (normalized.startsWith("fe80:")) return true;
    if (normalized.startsWith("::ffff:")) {
      const v4 = normalized.slice("::ffff:".length);
      if (isIP(v4) === 4) return isPrivateIp(v4);
    }
    return false;
  }

  const parts = ip.split(".");
  if (parts.length !== 4) return false;
  const nums = parts.map((p) => Number(p));
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b] = nums;

  if (a === 127) return true; // 127.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // 169.254.0.0/16
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15

  return false;
}

async function assertSafeUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http/https URLs are allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  ) {
    throw new Error("Localhost URLs are not allowed.");
  }

  const ipType = isIP(host);
  if (ipType) {
    if (isPrivateIp(host)) throw new Error("Private IPs are not allowed.");
    return;
  }

  const records = await withTimeout(
    lookup(host, { all: true, verbatim: true }),
    DNS_TIMEOUT_MS,
    "DNS lookup timed out.",
  );
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error("That URL resolves to a private IP.");
    }
  }
}

async function fetchImageWithSafeRedirects(
  initial: URL,
  signal: AbortSignal,
): Promise<Response> {
  const headers = {
    "user-agent": "makeicon.dev (image-proxy)",
    accept: "image/*,*/*;q=0.8",
  };

  let current = initial;
  let redirects = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const res = await fetch(current.toString(), {
      redirect: "manual",
      signal,
      headers,
    });

    if (
      res.status === 301 ||
      res.status === 302 ||
      res.status === 303 ||
      res.status === 307 ||
      res.status === 308
    ) {
      const location = res.headers.get("location");
      res.body?.cancel();
      if (!location) throw new Error("Upstream redirect missing location.");
      redirects += 1;
      if (redirects > MAX_REDIRECTS) throw new Error("Too many redirects.");
      const next = new URL(location, current);
      await assertSafeUrl(next);
      current = next;
      continue;
    }

    return res;
  }
}

export async function GET(request: NextRequest) {
  const urlParam = request.nextUrl.searchParams.get("url");
  if (!urlParam) {
    return NextResponse.json({ error: "Missing url." }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(urlParam);
  } catch {
    return NextResponse.json({ error: "Invalid url." }, { status: 400 });
  }

  try {
    await assertSafeUrl(target);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Blocked URL." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream: Response;
  try {
    upstream = await fetchImageWithSafeRedirects(target, controller.signal);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error && err.name === "AbortError"
            ? "Upstream timed out."
            : "Failed to fetch upstream.",
      },
      {
        status: err instanceof Error && err.name === "AbortError" ? 504 : 502,
      },
    );
  }

  if (!upstream.ok) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: `Upstream error (${upstream.status}).` },
      { status: 502 },
    );
  }

  const contentLengthHeader = upstream.headers.get("content-length");
  const contentLength = contentLengthHeader ? Number(contentLengthHeader) : NaN;
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: `Image too large (>${Math.round(MAX_BYTES / 1024 / 1024)}MB).` },
      { status: 413 },
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    clearTimeout(timeout);
    return NextResponse.json(
      { error: "Upstream did not return an image." },
      { status: 415 },
    );
  }

  try {
    const chunks: Uint8Array[] = [];
    let total = 0;
    const reader = upstream.body?.getReader();
    if (!reader) throw new Error("Missing response body.");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        controller.abort();
        throw new Error(
          `Image too large (>${Math.round(MAX_BYTES / 1024 / 1024)}MB).`,
        );
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.byteLength;
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=3600",
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox;",
        "content-disposition": 'attachment; filename="image"',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to read upstream.",
      },
      { status: 413 },
    );
  } finally {
    clearTimeout(timeout);
  }
}

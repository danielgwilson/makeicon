import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { type NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 15 * 1024 * 1024;

function isPrivateIp(ip: string) {
  if (ip === "127.0.0.1" || ip === "::1") return true;
  if (ip.startsWith("10.")) return true;
  if (ip.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true;
  if (ip.startsWith("169.254.")) return true;
  if (ip.startsWith("fc") || ip.startsWith("fd")) return true; // fc00::/7
  if (ip.startsWith("fe80:")) return true;
  return false;
}

async function assertSafeUrl(url: URL) {
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only http/https URLs are allowed.");
  }

  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local")) {
    throw new Error("Localhost URLs are not allowed.");
  }

  const ipType = isIP(host);
  if (ipType) {
    if (isPrivateIp(host)) throw new Error("Private IPs are not allowed.");
    return;
  }

  const records = await lookup(host, { all: true, verbatim: true });
  for (const r of records) {
    if (isPrivateIp(r.address)) {
      throw new Error("That URL resolves to a private IP.");
    }
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

  const upstream = await fetch(target.toString(), {
    redirect: "follow",
    headers: {
      "user-agent": "makeicon.dev (image-proxy)",
      accept: "image/*,*/*;q=0.8",
    },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream error (${upstream.status}).` },
      { status: 502 },
    );
  }

  const contentType =
    upstream.headers.get("content-type") || "application/octet-stream";
  if (!contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Upstream did not return an image." },
      { status: 415 },
    );
  }

  const arrayBuffer = await upstream.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `Image too large (>${Math.round(MAX_BYTES / 1024 / 1024)}MB).` },
      { status: 413 },
    );
  }

  return new NextResponse(arrayBuffer, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

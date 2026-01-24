"use client";

import { Ico, IcoImage } from "@fiahfy/ico";
import { Buffer } from "buffer";
import { zipSync } from "fflate";
import {
  ArrowRight,
  ClipboardPaste,
  Download,
  Link2,
  Loader2,
  RotateCcw,
  Sparkles,
  Upload,
} from "lucide-react";
import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { NoiseField } from "@/components/makeicon/noise-field";
import { PackIcon } from "@/components/makeicon/pack-icon";
import { PixelGridField } from "@/components/makeicon/pixel-grid-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DEFAULT_PACKS,
  type MakeIconPackId,
  type MakeIconPackSpec,
  PACKS,
  type PackSelection,
} from "@/lib/makeicon/packs";
import { cn } from "@/lib/utils";

type FitMode = "contain" | "cover";

type LoadedSource = {
  blob: Blob;
  name: string;
  mime: string;
  objectUrl: string;
  width: number;
  height: number;
  bitmap: ImageBitmap;
};

type ZipFile = { path: string; bytes: Uint8Array };

const PACK_ACCENT: Partial<Record<MakeIconPackId, string>> = {
  slack_emoji: "group-hover:text-[#4A154B]",
  discord_emoji: "group-hover:text-[#5865F2]",
  notion_icon: "group-hover:text-foreground",
  figma_widget: "group-hover:text-[#F24E1E]",
  vercel_integration: "group-hover:text-foreground",
  github_social_preview: "group-hover:text-foreground",
  chrome_extension: "group-hover:text-[#4285F4]",
  firefox_addon: "group-hover:text-[#FF7139]",
  vscode_extension: "group-hover:text-[#007ACC]",
  windows_tiles: "group-hover:text-[#0078D4]",
  android_app_icons: "group-hover:text-[#3DDC84]",
  ios_app_iconset: "group-hover:text-foreground",
  nextjs_app_router: "group-hover:text-foreground",
  web_favicon_pwa: "group-hover:text-foreground",
};

function packAccent(packId: MakeIconPackId) {
  return PACK_ACCENT[packId] ?? "group-hover:text-foreground";
}

function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 20_000);
}

function safeBaseName(name: string) {
  const stripped = name.replace(/\.[^/.]+$/, "");
  return stripped.replaceAll(/[^a-zA-Z0-9._-]+/g, "-").replaceAll(/-+/g, "-");
}

async function blobToBytes(blob: Blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

async function decodeSvgWithFallbackSize(svgText: string, sizePx = 1024) {
  if (
    /<svg[\s\S]*\bwidth=/.test(svgText) &&
    /<svg[\s\S]*\bheight=/.test(svgText)
  ) {
    return svgText;
  }

  const hasViewBox = /<svg[\s\S]*\bviewBox=/.test(svgText);
  const inject = hasViewBox
    ? `width="${sizePx}" height="${sizePx}"`
    : `width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}"`;

  return svgText.replace(/<svg\b/, `<svg ${inject}`);
}

async function loadImageFromBlob(
  blob: Blob,
  name: string,
): Promise<LoadedSource> {
  const mime = blob.type || "application/octet-stream";
  const objectUrl = URL.createObjectURL(blob);

  try {
    const bitmap = await createImageBitmap(blob);
    return {
      blob,
      name,
      mime,
      objectUrl,
      width: bitmap.width,
      height: bitmap.height,
      bitmap,
    };
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error("Could not decode this image in your browser.");
  }
}

async function loadImageFromFile(file: File): Promise<LoadedSource> {
  if (
    file.type === "image/svg+xml" ||
    file.name.toLowerCase().endsWith(".svg")
  ) {
    const svgText = await file.text();
    const normalized = await decodeSvgWithFallbackSize(svgText);
    const svgBlob = new Blob([normalized], { type: "image/svg+xml" });
    return loadImageFromBlob(svgBlob, file.name);
  }

  return loadImageFromBlob(file, file.name);
}

async function loadImageFromUrl(url: string): Promise<LoadedSource> {
  const parsed = new URL(url);
  const name = parsed.pathname.split("/").pop() || "image";

  const response = await fetch(url, { mode: "cors" });
  if (!response.ok) {
    throw new Error(`Could not fetch (${response.status}).`);
  }

  const blob = await response.blob();
  const mime = blob.type || "application/octet-stream";

  if (!mime.startsWith("image/")) {
    throw new Error("That URL did not return an image.");
  }

  return loadImageFromBlob(blob, name);
}

async function loadImageFromUrlViaProxy(url: string): Promise<LoadedSource> {
  const parsed = new URL(url);
  const name = parsed.pathname.split("/").pop() || "image";

  const response = await fetch(
    `/api/image-proxy?url=${encodeURIComponent(url)}`,
  );
  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const json = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      throw new Error(
        json?.error
          ? `Proxy: ${json.error}`
          : `Proxy error (${response.status}).`,
      );
    }
    const text = await response.text().catch(() => "");
    throw new Error(
      text ? `Proxy: ${text}` : `Proxy error (${response.status}).`,
    );
  }

  const blob = await response.blob();
  return loadImageFromBlob(blob, name);
}

async function rasterize({
  source,
  width,
  height,
  fit,
  paddingRatio,
  background,
  format,
}: {
  source: LoadedSource;
  width: number;
  height: number;
  fit: FitMode;
  paddingRatio: number;
  background: string | null;
  format: "png" | "webp";
}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported.");

  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }

  const padding = Math.round(Math.min(width, height) * paddingRatio);
  const targetW = Math.max(1, width - padding * 2);
  const targetH = Math.max(1, height - padding * 2);

  const scale =
    fit === "cover"
      ? Math.max(targetW / source.width, targetH / source.height)
      : Math.min(targetW / source.width, targetH / source.height);

  const drawW = Math.max(1, Math.round(source.width * scale));
  const drawH = Math.max(1, Math.round(source.height * scale));

  const dx = Math.round((width - drawW) / 2);
  const dy = Math.round((height - drawH) / 2);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source.bitmap, dx, dy, drawW, drawH);

  const mime = format === "webp" ? "image/webp" : "image/png";
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Encode failed."))),
      mime,
      0.92,
    );
  });

  return blob;
}

async function buildIcoFromPngs(pngBlobs: Blob[]) {
  const ico = new Ico();
  for (const blob of pngBlobs) {
    const bytes = await blobToBytes(blob);
    const img = IcoImage.fromPNG(Buffer.from(bytes));
    ico.append(img);
  }
  return new Blob([Uint8Array.from(ico.data)], { type: "image/x-icon" });
}

async function buildZip(files: ZipFile[]) {
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) entries[file.path] = file.bytes;
  const bytes = zipSync(entries, {
    level: 7,
    mtime: new Date(2026, 0, 21),
  });
  return new Blob([Uint8Array.from(bytes)], { type: "application/zip" });
}

function packTitle(pack: MakeIconPackSpec) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 grid size-9 place-items-center rounded-2xl border border-border/70 bg-background/45 text-muted-foreground transition group-hover:scale-[1.03] group-hover:bg-background/70">
          <PackIcon
            packId={pack.id}
            className={cn("transition", packAccent(pack.id))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-[15px] leading-5 font-semibold tracking-tight text-foreground">
            {pack.name}
          </div>
          {pack.badges?.map((b) => (
            <Badge
              key={b}
              variant="secondary"
              className="rounded-full font-mono text-[11px] uppercase tracking-[0.14em]"
            >
              {b}
            </Badge>
          ))}
        </div>
        <div className="mt-1 text-[13px] leading-5 font-mono text-muted-foreground">
          {pack.summary}
        </div>
      </div>
      <ArrowRight className="mt-1 size-4 text-muted-foreground/80 transition group-hover:translate-x-0.5 group-hover:text-foreground/80" />
    </div>
  );
}

export function IconLab() {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);

  const [source, setSource] = useState<LoadedSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [fit, setFit] = useState<FitMode>("contain");
  const [paddingRatio, setPaddingRatio] = useState(0.08);
  const [background, setBackground] = useState<string | null>(null);

  const [urlValue, setUrlValue] = useState("");
  const [packQuery, setPackQuery] = useState("");
  const [selected, setSelected] = useState<PackSelection>(() => ({
    ...DEFAULT_PACKS,
  }));

  const categoryOrder = useMemo(
    () =>
      [
        "Web",
        "Frameworks",
        "Extensions",
        "Chat",
        "Native",
        "Dev Platforms",
        "Docs",
        "Design",
      ] as const,
    [],
  );

  const visiblePacks = useMemo(() => {
    const q = packQuery.trim().toLowerCase();
    const packs = Object.values(PACKS);
    if (!q) return packs;

    return packs.filter((p) => {
      const haystack = [
        p.id,
        p.category,
        p.name,
        p.summary,
        p.filesSummary,
        ...(p.keywords ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [packQuery]);

  const packsByCategory = useMemo(() => {
    const groups = new Map<
      (typeof categoryOrder)[number],
      MakeIconPackSpec[]
    >();
    for (const c of categoryOrder) groups.set(c, []);
    for (const p of visiblePacks) {
      const list = groups.get(p.category);
      if (list) list.push(p);
    }
    return groups;
  }, [categoryOrder, visiblePacks]);

  const selectedPacks = useMemo(() => {
    const ids = (Object.keys(selected) as MakeIconPackId[]).filter(
      (k) => selected[k],
    );
    return ids.map((k) => PACKS[k]);
  }, [selected]);

  const plannedPaths = useMemo(() => {
    const multi = selectedPacks.length > 1;
    const paths: string[] = [];
    for (const pack of selectedPacks) {
      const base = multi ? `${pack.id}/` : "";
      for (const o of pack.outputs) paths.push(`${base}${o.path}`);
    }
    return paths;
  }, [selectedPacks]);

  const cleanupSource = useCallback((s: LoadedSource | null) => {
    if (!s) return;
    try {
      s.bitmap.close();
    } catch {
      // ignore
    }
    URL.revokeObjectURL(s.objectUrl);
  }, []);

  const reset = useCallback(() => {
    setUrlValue("");
    setFit("contain");
    setPaddingRatio(0.08);
    setBackground(null);
    setSelected({ ...DEFAULT_PACKS });
    setSource((prev) => {
      cleanupSource(prev);
      return null;
    });
  }, [cleanupSource]);

  useEffect(() => {
    return () => {
      cleanupSource(source);
    };
  }, [cleanupSource, source]);

  const setNewSource = useCallback(
    (next: LoadedSource) => {
      setSource((prev) => {
        cleanupSource(prev);
        return next;
      });
    },
    [cleanupSource],
  );

  const onPickFile = useCallback(() => fileInputRef.current?.click(), []);

  const onFiles = useCallback(
    async (files: FileList | File[]) => {
      const first = files[0];
      if (!first) return;

      setIsLoading(true);
      try {
        const loaded = await loadImageFromFile(first);
        setNewSource(loaded);
        toast.success("Loaded.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load.");
      } finally {
        setIsLoading(false);
      }
    },
    [setNewSource],
  );

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      dragDepthRef.current = 0;
      setIsDragging(false);
      const files = event.dataTransfer.files;
      if (files?.length) await onFiles(files);
    },
    [onFiles],
  );

  const onDragEnterRoot = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }, []);

  const onDragLeaveRoot = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }, []);

  const onPaste = useCallback(
    async (event: ClipboardEvent) => {
      const items = event.clipboardData?.items;
      if (!items?.length) return;

      const imageItem = Array.from(items).find((i) =>
        i.type.startsWith("image/"),
      );
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) await onFiles([file]);
        return;
      }

      const text = event.clipboardData?.getData("text/plain")?.trim();
      if (text?.startsWith("http://") || text?.startsWith("https://")) {
        setUrlValue(text);
        toast.message("URL pasted — press Enter to load.");
      }
    },
    [onFiles],
  );

  useEffect(() => {
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [onPaste]);

  const loadFromUrl = useCallback(async () => {
    const value = urlValue.trim();
    if (!value) return;

    setIsLoading(true);
    try {
      const loaded = await loadImageFromUrl(value);
      setNewSource(loaded);
      toast.success("Loaded from URL.");
    } catch (err) {
      try {
        const loaded = await loadImageFromUrlViaProxy(value);
        setNewSource(loaded);
        toast.success("Loaded from URL (via proxy).");
      } catch (proxyErr) {
        toast.error(
          proxyErr instanceof Error
            ? proxyErr.message
            : err instanceof Error
              ? err.message
              : "Failed to load URL.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [setNewSource, urlValue]);

  const downloadSelectedZip = useCallback(async () => {
    if (!source) return;
    if (!selectedPacks.length) {
      toast.error("Pick at least one pack.");
      return;
    }

    setIsLoading(true);
    try {
      const files: ZipFile[] = [];
      const warnings: string[] = [];

      const multi = selectedPacks.length > 1;
      for (const pack of selectedPacks) {
        const baseDir = multi ? `${pack.id}/` : "";
        const generated = await generatePackFiles({
          pack,
          baseDir,
          source,
          fit,
          paddingRatio,
          background,
        });
        files.push(...generated.files);
        warnings.push(...generated.warnings);
      }

      const zip = await buildZip(files);
      const stamp = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
      const name = safeBaseName(source.name || "image");
      downloadBlob(zip, `makeicon-${name}-${stamp}.zip`);
      toast.success("ZIP downloaded.");
      if (warnings.length) {
        toast.message(`Heads up: ${warnings[0]}`, {
          description:
            warnings.length > 1
              ? `${warnings.length - 1} more warnings…`
              : undefined,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsLoading(false);
    }
  }, [background, fit, paddingRatio, selectedPacks, source]);

  const hasSource = Boolean(source);

  const pasteFromClipboard = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t.startsWith("image/"));
        if (!type) continue;
        const blob = await item.getType(type);
        await onFiles([new File([blob], "clipboard.png", { type })]);
        return;
      }
      toast.message("No image in clipboard.");
    } catch {
      toast.message("Paste with ⌘/Ctrl+V instead.");
    }
  }, [onFiles]);

  return (
    <div
      role="application"
      aria-label="MakeIcon"
      tabIndex={-1}
      className="min-h-[var(--viewport-height)] overflow-x-hidden bg-background text-foreground"
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnterRoot}
      onDragLeave={onDragLeaveRoot}
      onDrop={onDrop}
    >
      <PixelGridField
        className={cn(
          "pointer-events-none fixed inset-0 z-0",
          "opacity-[0.9] dark:opacity-[0.5]",
          "mix-blend-multiply dark:mix-blend-screen",
          "[mask-image:radial-gradient(980px_620px_at_50%_58%,rgba(0,0,0,0.96),rgba(0,0,0,0.2)_64%,transparent_80%)]",
          "[-webkit-mask-image:radial-gradient(980px_620px_at_50%_58%,rgba(0,0,0,0.96),rgba(0,0,0,0.2)_64%,transparent_80%)]",
        )}
        intensity={1}
      />
      <NoiseField
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.44] mix-blend-multiply dark:mix-blend-screen"
        intensity={0.75}
      />
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-56 left-[8%] h-[520px] w-[780px] rounded-full bg-accent/25 blur-3xl opacity-60 mix-blend-multiply dark:opacity-45 dark:mix-blend-screen" />
        <div className="absolute -top-40 right-[-140px] h-[520px] w-[520px] rounded-full bg-foreground/10 blur-3xl opacity-55 mix-blend-multiply dark:opacity-35 dark:mix-blend-screen" />
      </div>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-28 bg-gradient-to-b from-background via-background/70 to-transparent" />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/75 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
        <div className="container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl border border-border/70 bg-background shadow-[0_18px_90px_hsl(var(--foreground)/0.06)]">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0 leading-none">
              <div className="font-[family-name:var(--font-display)] text-[22px] leading-none tracking-tight italic">
                makeicon
              </div>
              <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                one image → the exact icons you need
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
              onClick={onPickFile}
              disabled={isLoading}
            >
              <Upload className="mr-2 size-4" />
              Pick file
            </Button>
            <Button
              variant="ghost"
              className="rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
              onClick={reset}
              disabled={!hasSource}
            >
              <RotateCcw className="mr-2 size-4" />
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="container relative z-10 pt-10 pb-24">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="grid gap-8">
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent" />
                  icon pack generator
                </span>
                <span className="hidden sm:inline">·</span>
                <span>drop · paste · url</span>
              </div>
              <h1 className="leading-[0.9] tracking-tight text-balance">
                <span className="block font-[family-name:var(--font-display)] text-5xl italic sm:text-6xl lg:text-7xl">
                  Icons for
                </span>
                <span
                  className={cn(
                    "mt-1 block font-[family-name:var(--font-body)] text-5xl font-semibold sm:text-6xl lg:text-7xl",
                    "text-transparent tracking-[-0.06em]",
                    "[-webkit-text-stroke:1px_hsl(var(--foreground))]",
                    "dark:[-webkit-text-stroke:1px_hsl(var(--foreground)/0.85)]",
                  )}
                >
                  real deployments
                </span>
              </h1>
              <p className="max-w-[60ch] text-sm leading-6 text-muted-foreground sm:text-base">
                Drop one image. Pick the target scenario. Download a zip that’s
                picky about sizes, filenames, and platform quirks.
              </p>
            </div>

            <Card className="overflow-hidden border-border/70 bg-card/70 p-0 shadow-[0_28px_120px_hsl(var(--foreground)/0.06)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
              <div className="border-b border-border/70 bg-background/40 px-6 py-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                      Input
                    </div>
                    <div className="mt-2 text-sm leading-6 text-muted-foreground">
                      Drag & drop, paste, or load from a URL.
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant="secondary"
                      className="rounded-full font-mono text-[11px] uppercase tracking-[0.14em]"
                    >
                      <ClipboardPaste className="mr-1 size-3.5" /> Paste
                      (⌘/Ctrl+V)
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="rounded-full font-mono text-[11px] uppercase tracking-[0.14em]"
                    >
                      PNG · JPG · WebP · AVIF · SVG
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="px-6 py-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label
                      htmlFor={`${id}-url`}
                      className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground"
                    >
                      <Link2 className="size-4" />
                      Image URL
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`${id}-url`}
                        placeholder="https://…"
                        value={urlValue}
                        onChange={(e) => setUrlValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") loadFromUrl();
                        }}
                        className="bg-background/60"
                      />
                      <Button
                        variant="outline"
                        className="font-mono text-[12px] uppercase tracking-[0.18em]"
                        onClick={loadFromUrl}
                        disabled={isLoading}
                      >
                        Load
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) onFiles(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />

                    <div
                      className={cn(
                        "group relative grid min-h-[280px] place-items-center overflow-hidden rounded-2xl border border-dashed",
                        "border-border/70 bg-background/40 transition",
                        isDragging
                          ? "border-foreground/40 bg-muted/50 shadow-[0_0_0_6px_hsl(var(--foreground)/0.05)]"
                          : "hover:border-foreground/25",
                        "shadow-inner shadow-foreground/5",
                      )}
                    >
                      {!source ? (
                        <div className="mx-auto flex max-w-lg flex-col items-center px-8 text-center">
                          <div className="mb-4 grid size-14 place-items-center rounded-2xl border border-border/70 bg-background/70 shadow-[0_22px_90px_hsl(var(--foreground)/0.06)] transition group-hover:scale-[1.02]">
                            <Upload className="size-6" />
                          </div>
                          <div className="font-[family-name:var(--font-display)] text-3xl tracking-tight italic">
                            Drop an image.
                          </div>
                          <div className="mt-3 text-sm leading-6 font-mono text-muted-foreground">
                            Or paste with ⌘/Ctrl+V, or load a URL. You’ll get a
                            zip that matches real platform constraints.
                          </div>
                          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                            <Button
                              onClick={onPickFile}
                              disabled={isLoading}
                              variant="brand"
                              className="rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
                            >
                              {isLoading ? (
                                <Loader2 className="mr-2 size-4 animate-spin" />
                              ) : null}
                              Choose file
                              <ArrowRight className="ml-2 size-4" />
                            </Button>
                            <Button
                              variant="outline"
                              onClick={pasteFromClipboard}
                              disabled={isLoading}
                              className="rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
                            >
                              Paste image
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative w-full">
                          <div className="grid gap-4 p-4 sm:grid-cols-[1fr_220px] sm:items-start">
                            <div className="bg-checkerboard relative overflow-hidden rounded-xl border border-border">
                              <div className="relative flex items-center justify-center p-4">
                                <Image
                                  src={source.objectUrl}
                                  alt="Input"
                                  width={Math.min(900, source.width)}
                                  height={Math.min(900, source.height)}
                                  className="max-h-[320px] w-auto max-w-full object-contain"
                                  unoptimized
                                  priority
                                />
                              </div>
                            </div>

                            <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/45 p-4">
                              <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                                Framing
                              </div>
                              <div className="grid gap-2">
                                <div className="flex gap-2">
                                  <Button
                                    type="button"
                                    variant={
                                      fit === "contain"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="h-9 flex-1 rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
                                    onClick={() => setFit("contain")}
                                  >
                                    Contain
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      fit === "cover" ? "default" : "secondary"
                                    }
                                    className="h-9 flex-1 rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
                                    onClick={() => setFit("cover")}
                                  >
                                    Cover
                                  </Button>
                                </div>
                                <div className="grid gap-1.5">
                                  <Label
                                    htmlFor={`${id}-pad`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    Padding
                                  </Label>
                                  <input
                                    id={`${id}-pad`}
                                    type="range"
                                    min={0}
                                    max={0.24}
                                    step={0.01}
                                    value={paddingRatio}
                                    onChange={(e) =>
                                      setPaddingRatio(Number(e.target.value))
                                    }
                                    className="w-full accent-foreground"
                                  />
                                </div>
                                <div className="grid gap-1.5">
                                  <Label
                                    htmlFor={`${id}-bg`}
                                    className="text-xs text-muted-foreground"
                                  >
                                    Background (optional)
                                  </Label>
                                  <Input
                                    id={`${id}-bg`}
                                    placeholder="transparent"
                                    value={background ?? ""}
                                    onChange={(e) => {
                                      const v = e.target.value.trim();
                                      setBackground(v ? v : null);
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card className="overflow-hidden border-border/70 bg-card/70 p-0 shadow-[0_28px_120px_hsl(var(--foreground)/0.06)] backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150">
            <div className="border-b border-border/70 bg-background/40 px-6 py-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                    Export
                  </div>
                  <div className="mt-2 text-sm leading-6 text-muted-foreground">
                    Pick a pack. Download a zip.
                  </div>
                </div>
                <Button
                  variant="brand"
                  onClick={downloadSelectedZip}
                  disabled={!source || isLoading}
                  className="rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
                >
                  <Download className="mr-2 size-4" />
                  Download zip
                  {selectedPacks.length ? (
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[11px]">
                      {selectedPacks.length} pack
                      {selectedPacks.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>

            <div className="px-6 py-6">
              {source ? (
                <div className="mb-6 grid gap-2 rounded-3xl border border-border/70 bg-background/35 p-5 shadow-[0_18px_70px_hsl(var(--foreground)/0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                      Included
                    </div>
                    <Badge
                      variant="secondary"
                      className="rounded-full font-mono text-[11px] uppercase tracking-[0.14em]"
                    >
                      {plannedPaths.length} file
                      {plannedPaths.length === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="grid gap-1 font-mono text-[11px] leading-5 text-muted-foreground">
                    {plannedPaths.slice(0, 10).map((p) => (
                      <div key={p} className="truncate">
                        {p}
                      </div>
                    ))}
                    {plannedPaths.length > 10 ? (
                      <div className="text-xs">
                        + {plannedPaths.length - 10} more…
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <Tabs defaultValue="packs" className="w-full">
                <TabsList className="grid h-10 w-full grid-cols-2 rounded-full border border-border/70 bg-background/45 p-1">
                  <TabsTrigger
                    value="packs"
                    className="rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
                  >
                    Packs
                  </TabsTrigger>
                  <TabsTrigger
                    value="notes"
                    className="rounded-full font-mono text-[12px] uppercase tracking-[0.18em]"
                  >
                    Notes
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="packs" className="mt-4">
                  <div className="grid min-w-0 gap-3">
                    <div className="grid min-w-0 gap-2">
                      <Label
                        htmlFor={`${id}-pack-search`}
                        className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground"
                      >
                        Find a pack
                      </Label>
                      <Input
                        id={`${id}-pack-search`}
                        placeholder="Try: next, ios, slack, vercel…"
                        value={packQuery}
                        onChange={(e) => setPackQuery(e.target.value)}
                        className="bg-background/60"
                      />
                    </div>

                    {categoryOrder.map((category) => {
                      const packs = packsByCategory.get(category) ?? [];
                      if (!packs.length) return null;
                      return (
                        <div key={category} className="grid min-w-0 gap-3">
                          <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
                            {category}
                          </div>
                          {packs.map((pack) => {
                            const isOn = Boolean(selected[pack.id]);
                            return (
                              <button
                                key={pack.id}
                                type="button"
                                className={cn(
                                  "group relative w-full min-w-0 rounded-3xl border p-5 text-left transition",
                                  "bg-background/30 border-border/70",
                                  "hover:-translate-y-0.5 hover:border-foreground/18 hover:bg-background/45 hover:shadow-[0_20px_90px_hsl(var(--foreground)/0.08)] active:translate-y-0",
                                  isOn
                                    ? "border-foreground/20 bg-background/55 shadow-[0_22px_90px_hsl(var(--foreground)/0.06)]"
                                    : null,
                                )}
                                onClick={() =>
                                  setSelected((prev) => ({
                                    ...prev,
                                    [pack.id]: !prev[pack.id],
                                  }))
                                }
                              >
                                {packTitle(pack)}
                                <div className="mt-3 flex flex-wrap gap-2">
                                  <Badge
                                    variant={isOn ? "default" : "secondary"}
                                    className="rounded-full"
                                  >
                                    {isOn ? "Included" : "Not included"}
                                  </Badge>
                                  <Badge
                                    variant="secondary"
                                    className="rounded-full"
                                  >
                                    {pack.filesSummary}
                                  </Badge>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>

                <TabsContent value="notes" className="mt-4">
                  <div className="grid gap-4 text-sm leading-6 text-muted-foreground">
                    <div>
                      <div className="font-medium text-foreground">
                        No surprises
                      </div>
                      <div className="mt-1">
                        Exports are generated locally in your browser (no
                        upload). URL imports try a direct fetch first, then fall
                        back to a safe proxy if CORS blocks it.
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        Favicon reality check
                      </div>
                      <div className="mt-1">
                        Not every platform honors every icon. The “Web (favicon
                        + PWA)” pack aims for modern defaults that work across
                        Next.js and Vercel.
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        Got a weird edge case?
                      </div>
                      <div className="mt-1">
                        That’s the point. MakeIcon is built around “non-obvious”
                        scenarios and aggressively practical output sets.
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </Card>
        </div>

        <footer className="mt-16 border-t border-border/70 pt-10">
          <div className="flex flex-col items-start justify-between gap-6 text-muted-foreground md:flex-row md:items-end">
            <div className="grid gap-2">
              <div className="font-mono text-[11px] uppercase tracking-[0.3em]">
                makeicon.dev
              </div>
              <div className="max-w-[62ch] text-sm leading-6">
                Fast, picky, and designed for real deployment oddities.
              </div>
              <div className="text-xs text-muted-foreground/80">
                Logos are trademarks of their respective owners.
              </div>
            </div>
            <div className="flex items-center gap-5 font-mono text-[12px] uppercase tracking-[0.18em]">
              <a
                className="underline decoration-border/60 underline-offset-4 hover:text-foreground"
                href="https://github.com/danielgwilson/makeicon"
                target="_blank"
                rel="noreferrer"
              >
                GitHub
              </a>
              <a
                className="underline decoration-border/60 underline-offset-4 hover:text-foreground"
                href="https://vercel.com/dgwto/makeicon"
                target="_blank"
                rel="noreferrer"
              >
                Vercel
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

async function generatePackFiles({
  pack,
  baseDir,
  source,
  fit,
  paddingRatio,
  background,
}: {
  pack: MakeIconPackSpec;
  baseDir: string;
  source: LoadedSource;
  fit: FitMode;
  paddingRatio: number;
  background: string | null;
}) {
  const files: ZipFile[] = [];
  const warnings: string[] = [];

  for (const output of pack.outputs) {
    if (output.kind === "text") {
      files.push({
        path: `${baseDir}${output.path}`,
        bytes: new TextEncoder().encode(output.content),
      });
      continue;
    }

    if (output.kind === "raster") {
      const blob = await rasterize({
        source,
        width: output.width,
        height: output.height,
        fit: output.fit ?? fit,
        paddingRatio: output.paddingRatio ?? paddingRatio,
        background: output.background ?? background,
        format: output.format,
      });
      if (output.warnOverBytes && blob.size > output.warnOverBytes) {
        warnings.push(
          `${output.path} is ${Math.round(blob.size / 1024)}KB (limit ~${Math.round(output.warnOverBytes / 1024)}KB)`,
        );
      }
      files.push({
        path: `${baseDir}${output.path}`,
        bytes: await blobToBytes(blob),
      });
      continue;
    }

    if (output.kind === "ico") {
      const pngs: Blob[] = [];
      for (const s of output.sizes) {
        pngs.push(
          await rasterize({
            source,
            width: s,
            height: s,
            fit: "contain",
            paddingRatio: output.paddingRatio ?? paddingRatio,
            background: output.background ?? background,
            format: "png",
          }),
        );
      }
      const icoBlob = await buildIcoFromPngs(pngs);
      if (output.warnOverBytes && icoBlob.size > output.warnOverBytes) {
        warnings.push(
          `${output.path} is ${Math.round(icoBlob.size / 1024)}KB (limit ~${Math.round(output.warnOverBytes / 1024)}KB)`,
        );
      }
      files.push({
        path: `${baseDir}${output.path}`,
        bytes: await blobToBytes(icoBlob),
      });
    }
  }

  return { files, warnings };
}

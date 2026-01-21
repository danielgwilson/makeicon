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
import { PackIcon } from "@/components/makeicon/pack-icon";
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
        <div className="mt-0.5 grid size-9 place-items-center rounded-xl border border-border bg-background text-foreground transition group-hover:scale-[1.03] group-hover:bg-background/80">
          <PackIcon packId={pack.id} className="opacity-90" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-[family-name:var(--font-display)] text-[15px] leading-5 tracking-tight text-foreground">
            {pack.name}
          </div>
          {pack.badges?.map((b) => (
            <Badge key={b} variant="secondary" className="rounded-full">
              {b}
            </Badge>
          ))}
        </div>
        <div className="mt-1 text-sm leading-5 text-muted-foreground">
          {pack.summary}
        </div>
      </div>
      <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground/80" />
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
      className="min-h-[var(--viewport-height)] bg-background text-foreground"
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={onDragEnterRoot}
      onDragLeave={onDragLeaveRoot}
      onDrop={onDrop}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/[0.06] to-transparent" />

      <header className="container relative flex items-center justify-between pt-10 pb-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-foreground text-background shadow-[0_14px_60px_hsl(var(--foreground)/0.16)]">
            <Sparkles className="size-5" />
          </div>
          <div className="leading-none">
            <div className="font-[family-name:var(--font-display)] text-[20px] tracking-tight">
              makeicon
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Drop an image → download the exact icons you need.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={onPickFile}
            disabled={isLoading}
          >
            <Upload className="mr-2 size-4" />
            Pick file
          </Button>
          <Button
            variant="ghost"
            className="rounded-full"
            onClick={reset}
            disabled={!hasSource}
          >
            <RotateCcw className="mr-2 size-4" />
            Reset
          </Button>
        </div>
      </header>

      <main className="container relative pb-24">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border-border bg-card p-0 shadow-[0_20px_80px_hsl(var(--foreground)/0.08)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
            <div className="border-b border-border bg-card px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                    Input
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Drag & drop, paste, or load from a URL.
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full">
                    <ClipboardPaste className="mr-1 size-3.5" /> Paste
                    (⌘/Ctrl+V)
                  </Badge>
                  <Badge variant="secondary" className="rounded-full">
                    PNG · JPG · WebP · AVIF · SVG
                  </Badge>
                </div>
              </div>
            </div>

            <div className="p-5">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label
                    htmlFor={`${id}-url`}
                    className="flex items-center gap-2"
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
                    />
                    <Button
                      variant="secondary"
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
                      "border-border/70 bg-muted/30 transition",
                      isDragging
                        ? "border-foreground/40 bg-muted/50 shadow-[0_0_0_6px_hsl(var(--foreground)/0.05)]"
                        : "hover:border-foreground/25",
                      "shadow-inner shadow-foreground/5",
                    )}
                  >
                    {!source ? (
                      <div className="mx-auto flex max-w-lg flex-col items-center px-8 text-center">
                        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-foreground text-background shadow-[0_20px_70px_hsl(var(--foreground)/0.16)] transition group-hover:scale-[1.03]">
                          <Upload className="size-6" />
                        </div>
                        <div className="font-[family-name:var(--font-display)] text-2xl tracking-tight">
                          Drop an image.
                        </div>
                        <div className="mt-2 text-sm leading-6 text-muted-foreground">
                          Or paste from clipboard, or pick a file. You’ll get a
                          perfect zip for common icon scenarios.
                        </div>
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                          <Button
                            onClick={onPickFile}
                            disabled={isLoading}
                            className="rounded-full"
                          >
                            {isLoading ? (
                              <Loader2 className="mr-2 size-4 animate-spin" />
                            ) : null}
                            Choose file
                            <ArrowRight className="ml-2 size-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={pasteFromClipboard}
                            disabled={isLoading}
                            className="rounded-full"
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

                          <div className="grid gap-3 rounded-xl border border-border bg-card p-3">
                            <div className="text-xs font-medium text-muted-foreground">
                              Framing
                            </div>
                            <div className="grid gap-2">
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant={
                                    fit === "contain" ? "default" : "secondary"
                                  }
                                  className="h-9 flex-1 rounded-lg"
                                  onClick={() => setFit("contain")}
                                >
                                  Contain
                                </Button>
                                <Button
                                  type="button"
                                  variant={
                                    fit === "cover" ? "default" : "secondary"
                                  }
                                  className="h-9 flex-1 rounded-lg"
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

          <Card className="overflow-hidden border-border bg-card p-0 shadow-[0_20px_80px_hsl(var(--foreground)/0.08)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:delay-150">
            <div className="border-b border-border bg-card px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-[family-name:var(--font-display)] text-lg tracking-tight">
                    Export
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Pick a pack. Download a zip.
                  </div>
                </div>
                <Button
                  onClick={downloadSelectedZip}
                  disabled={!source || isLoading}
                  className="rounded-full"
                >
                  <Download className="mr-2 size-4" />
                  Download zip
                  {selectedPacks.length ? (
                    <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">
                      {selectedPacks.length} pack
                      {selectedPacks.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </Button>
              </div>
            </div>

            <div className="p-5">
              {source ? (
                <div className="mb-5 grid gap-2 rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Included
                    </div>
                    <Badge variant="secondary" className="rounded-full">
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
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="packs">Packs</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="packs" className="mt-4">
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label
                        htmlFor={`${id}-pack-search`}
                        className="text-xs text-muted-foreground"
                      >
                        Find a pack
                      </Label>
                      <Input
                        id={`${id}-pack-search`}
                        placeholder="Try: next, ios, slack, vercel…"
                        value={packQuery}
                        onChange={(e) => setPackQuery(e.target.value)}
                      />
                    </div>

                    {categoryOrder.map((category) => {
                      const packs = packsByCategory.get(category) ?? [];
                      if (!packs.length) return null;
                      return (
                        <div key={category} className="grid gap-3">
                          <div className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            {category}
                          </div>
                          {packs.map((pack) => {
                            const isOn = Boolean(selected[pack.id]);
                            return (
                              <button
                                key={pack.id}
                                type="button"
                                className={cn(
                                  "group w-full rounded-2xl border p-4 text-left transition",
                                  "hover:-translate-y-0.5 hover:shadow-[0_18px_70px_hsl(var(--foreground)/0.10)] active:translate-y-0",
                                  isOn
                                    ? "border-foreground/20 bg-foreground/[0.03]"
                                    : "border-border bg-card hover:border-foreground/18",
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

        <footer className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-border pt-8 text-sm text-muted-foreground md:flex-row md:items-center">
          <div>
            <span className="font-medium text-foreground">makeicon.dev</span> —
            fast, picky, and designed for real deployment oddities.
            <div className="mt-1 text-xs">
              Logos are trademarks of their respective owners.
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              className="underline decoration-border underline-offset-4 hover:text-foreground"
              href="https://github.com/danielgwilson/makeicon"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="underline decoration-border underline-offset-4 hover:text-foreground"
              href="https://vercel.com/dgwto/makeicon"
              target="_blank"
              rel="noreferrer"
            >
              Vercel
            </a>
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

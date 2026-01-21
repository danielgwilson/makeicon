"use client";

import { Ico, IcoImage } from "@fiahfy/ico";
import { Buffer } from "buffer";
import { zipSync } from "fflate";
import {
  ArrowRight,
  ClipboardPaste,
  Download,
  Link2,
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
      <div className="min-w-0">
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
      <ArrowRight className="mt-0.5 size-4 text-muted-foreground" />
    </div>
  );
}

export function IconLab() {
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [source, setSource] = useState<LoadedSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [fit, setFit] = useState<FitMode>("contain");
  const [paddingRatio, setPaddingRatio] = useState(0.08);
  const [background, setBackground] = useState<string | null>(null);

  const [urlValue, setUrlValue] = useState("");
  const [selected, setSelected] = useState<PackSelection>(() => ({
    ...DEFAULT_PACKS,
  }));

  const selectedPacks = useMemo(() => {
    const ids = (Object.keys(selected) as MakeIconPackId[]).filter(
      (k) => selected[k],
    );
    return ids.map((k) => PACKS[k]);
  }, [selected]);

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
      const files = event.dataTransfer.files;
      if (files?.length) await onFiles(files);
    },
    [onFiles],
  );

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
      className={cn(
        "min-h-screen bg-[radial-gradient(1200px_800px_at_15%_10%,hsl(33_100%_93%),transparent_55%),radial-gradient(900px_700px_at_80%_15%,hsl(190_95%_90%),transparent_55%),radial-gradient(900px_700px_at_50%_90%,hsl(270_90%_96%),transparent_55%)]",
        "text-foreground",
      )}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <div className="pointer-events-none fixed inset-0 opacity-[0.18] [background-image:linear-gradient(to_right,rgba(0,0,0,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.09)_1px,transparent_1px)] [background-size:36px_36px]" />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-6 pt-10 pb-8">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-black text-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
            <Sparkles className="size-5" />
          </div>
          <div className="leading-none">
            <div className="font-[family-name:var(--font-display)] text-[20px] tracking-tight">
              makeicon
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Drop an image → get the exact icons you need.
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

      <main className="relative mx-auto w-full max-w-6xl px-6 pb-24">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden border-black/10 bg-white/70 p-0 shadow-[0_30px_120px_rgba(0,0,0,0.10)] backdrop-blur">
            <div className="border-b border-black/10 bg-white/60 px-5 py-4">
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
                      "border-black/15 bg-[radial-gradient(700px_350px_at_20%_20%,rgba(0,0,0,0.05),transparent_70%)]",
                      "shadow-inner shadow-black/5",
                    )}
                  >
                    {!source ? (
                      <div className="mx-auto flex max-w-lg flex-col items-center px-8 text-center">
                        <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-black text-white shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
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
                          <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white">
                            <div className="absolute inset-0 [background-image:linear-gradient(45deg,rgba(0,0,0,0.05)_25%,transparent_25%,transparent_50%,rgba(0,0,0,0.05)_50%,rgba(0,0,0,0.05)_75%,transparent_75%,transparent)] [background-size:18px_18px] opacity-60" />
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

                          <div className="grid gap-3 rounded-xl border border-black/10 bg-white/70 p-3">
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
                                  className="w-full accent-black"
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

          <Card className="overflow-hidden border-black/10 bg-white/70 p-0 shadow-[0_30px_120px_rgba(0,0,0,0.10)] backdrop-blur">
            <div className="border-b border-black/10 bg-white/60 px-5 py-4">
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
                </Button>
              </div>
            </div>

            <div className="p-5">
              <Tabs defaultValue="packs" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="packs">Packs</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="packs" className="mt-4">
                  <div className="grid gap-3">
                    {Object.values(PACKS).map((pack) => {
                      const isOn = Boolean(selected[pack.id]);
                      return (
                        <button
                          key={pack.id}
                          type="button"
                          className={cn(
                            "w-full rounded-2xl border p-4 text-left transition",
                            isOn
                              ? "border-black/20 bg-black/[0.03] shadow-[0_14px_50px_rgba(0,0,0,0.08)]"
                              : "border-black/10 bg-white/60 hover:border-black/18 hover:bg-white/80",
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
                            <Badge variant="secondary" className="rounded-full">
                              {pack.filesSummary}
                            </Badge>
                          </div>
                        </button>
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
                        upload). If a URL is CORS-protected, download the image
                        and drop it instead.
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

        <footer className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-black/10 pt-8 text-sm text-muted-foreground md:flex-row md:items-center">
          <div>
            <span className="font-medium text-foreground">makeicon.dev</span> —
            fast, picky, and designed for real deployment oddities.
          </div>
          <div className="flex items-center gap-4">
            <a
              className="underline decoration-black/20 underline-offset-4 hover:text-foreground"
              href="https://github.com/danielgwilson/makeicon"
              target="_blank"
              rel="noreferrer"
            >
              GitHub
            </a>
            <a
              className="underline decoration-black/20 underline-offset-4 hover:text-foreground"
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

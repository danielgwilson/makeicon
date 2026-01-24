"use client";

import { useEffect, useMemo, useRef } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? true
  );
}

function rand01(seed: number) {
  // xorshift32
  let x = seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) / 0xffffffff) as number;
}

function hashU32(x: number, y: number, seed: number) {
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function u32To01(u: number) {
  return u / 4294967296;
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function parseHslTriplet(value: string) {
  const parts = value.trim().split(/\s+/).slice(0, 3);
  const h = Number.parseFloat(parts[0] ?? "0");
  const s = Number.parseFloat((parts[1] ?? "0").replace("%", ""));
  const l = Number.parseFloat((parts[2] ?? "0").replace("%", ""));
  return { h, s, l };
}

function hslToRgba(h: number, s: number, l: number, a: number) {
  const s01 = s / 100;
  const l01 = l / 100;
  const c = (1 - Math.abs(2 * l01 - 1)) * s01;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l01 - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
  else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
  else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
  else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const rr = Math.round((r + m) * 255);
  const gg = Math.round((g + m) * 255);
  const bb = Math.round((b + m) * 255);
  return `rgba(${rr}, ${gg}, ${bb}, ${a})`;
}

export function PixelGridField({
  className,
  intensity = 1,
}: {
  className?: string;
  intensity?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const seed = useMemo(() => {
    const now = Date.now();
    const r = rand01((now ^ (now >>> 11)) | 0);
    return Math.floor(r * 1_000_000_000);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduced = prefersReducedMotion();

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let t = seed % 10_000;
    let lastMs = 0;

    const repaint = () => {
      const nextDpr = Math.min(2, window.devicePixelRatio || 1);
      const nextW = Math.floor(window.innerWidth);
      const nextH = Math.floor(window.innerHeight);

      if (nextW !== width || nextH !== height || nextDpr !== dpr) {
        width = nextW;
        height = nextH;
        dpr = nextDpr;
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      } else {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const styles = getComputedStyle(document.documentElement);
      const ink = parseHslTriplet(styles.getPropertyValue("--foreground"));
      const paper = parseHslTriplet(styles.getPropertyValue("--background"));
      const accent = parseHslTriplet(styles.getPropertyValue("--accent"));
      const isDark = paper.l < 50;

      ctx.clearRect(0, 0, width, height);

      const cell = width < 420 ? 10 : width < 900 ? 11 : width < 1280 ? 12 : 13;
      const px = width < 420 ? 2 : 2;
      const inset = Math.floor((cell - px) / 2);

      const cols = Math.ceil(width / cell) + 1;
      const rows = Math.ceil(height / cell) + 1;

      const tt = reduced ? 0 : t * 0.004;
      const baseAlpha = (isDark ? 0.14 : 0.11) * (0.65 + 0.35 * intensity);
      const base = hslToRgba(ink.h, Math.min(18, ink.s), isDark ? 88 : 22, 1);
      const highlight = hslToRgba(
        accent.h,
        Math.min(70, accent.s),
        isDark ? Math.min(68, accent.l + 4) : accent.l,
        1,
      );

      for (let gy = 0; gy < rows; gy++) {
        const y = gy * cell;
        const y01 = y / Math.max(1, height);

        // Concentrate the grid toward the lower half of the viewport.
        const fade = smoothstep(0.26, 0.92, y01);
        if (fade <= 0.001) continue;

        for (let gx = 0; gx < cols; gx++) {
          const x = gx * cell;
          const x01 = x / Math.max(1, width);

          const h0 = hashU32(gx, gy, seed);
          const r0 = u32To01(h0);

          // Density: mostly present, with a few "missing" pixels.
          const drop = 0.14 + 0.08 * (1 - intensity);
          if (r0 < drop) continue;

          const r1 = u32To01(hashU32(gx + 17, gy + 29, seed));
          const r2 = u32To01(hashU32(gx + 41, gy + 7, seed));
          const phase = r2 * Math.PI * 2;

          // Calm shimmer: subtle opacity breathing, no visible "swimming".
          const shimmer = reduced
            ? 1
            : 0.88 +
              0.12 *
                Math.sin(
                  tt * 1.1 + phase + x01 * 0.7 * Math.PI + y01 * 1.1 * Math.PI,
                );

          const edge =
            smoothstep(0.04, 0.16, x01) * smoothstep(0.04, 0.16, 1 - x01);

          const a = baseAlpha * fade * edge * shimmer * (0.6 + 0.4 * r1);
          if (a <= 0.002) continue;

          const isAccent = r1 > 0.985 && fade > 0.55;
          ctx.fillStyle = isAccent ? highlight : base;
          ctx.globalAlpha = isAccent ? a * 0.9 : a;
          ctx.fillRect(x + inset, y + inset, px, px);
        }
      }

      ctx.globalAlpha = 1;
    };

    const loop = (ms: number) => {
      // Low framerate keeps it texture-like, not "animated background".
      if (ms - lastMs >= 100) {
        lastMs = ms;
        t = (t + 1) % 100_000;
        repaint();
      }
      rafId = requestAnimationFrame(loop);
    };

    repaint();
    if (!reduced) rafId = requestAnimationFrame(loop);

    const onResize = () => repaint();
    window.addEventListener("resize", onResize, { passive: true });

    const mo = new MutationObserver(() => repaint());
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    return () => {
      window.removeEventListener("resize", onResize);
      mo.disconnect();
      if (!reduced) cancelAnimationFrame(rafId);
    };
  }, [intensity, seed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-testid="pixel-grid-field"
    />
  );
}

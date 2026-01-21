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

function makeSeeded(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashU32(x: number, y: number, seed: number) {
  // Deterministic per-cell hash (stable across frames).
  let h = (seed ^ Math.imul(x, 374761393) ^ Math.imul(y, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

function u32To01(u: number) {
  return u / 4294967296;
}

function parseHslTriplet(value: string) {
  // expects "h s% l%" or "h s l"
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

export function NoiseField({
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
    const prng = makeSeeded(seed);

    let rafId = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let t = 0;
    let lastMs = 0;

    const repaint = () => {
      const grainIntensity = Math.min(1.15, intensity * 0.78 + 0.22);
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
      const fg = parseHslTriplet(styles.getPropertyValue("--foreground"));
      const bg = parseHslTriplet(styles.getPropertyValue("--background"));
      const isDark = bg.l < 50;

      ctx.clearRect(0, 0, width, height);

      // 1) Ultra-subtle "fog" to avoid dead-flat surfaces.
      // Keep it nearly monochrome and low-contrast.
      const fog = ctx.createRadialGradient(
        width * 0.18,
        height * 0.22,
        0,
        width * 0.18,
        height * 0.22,
        Math.max(width, height) * 0.85,
      );
      const fogAlpha = (isDark ? 0.08 : 0.06) * (0.7 + 0.3 * intensity);
      fog.addColorStop(
        0,
        hslToRgba(fg.h, Math.min(8, fg.s), isDark ? 92 : 8, fogAlpha),
      );
      fog.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = fog;
      ctx.fillRect(0, 0, width, height);

      // 2) Grain layer (high frequency, monochrome).
      // We draw a small tile then scale it across the canvas.
      const tile = 220;
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = tile;
      tileCanvas.height = tile;
      const tileCtx = tileCanvas.getContext("2d");
      if (tileCtx) {
        const img = tileCtx.createImageData(tile, tile);
        const data = img.data;
        const grainA = Math.round((isDark ? 20 : 14) * grainIntensity); // 0..255
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.floor(prng() * 255);
          data[i + 0] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = grainA;
        }
        tileCtx.putImageData(img, 0, 0);
      }

      ctx.save();
      ctx.globalAlpha = (isDark ? 0.55 : 0.45) * grainIntensity;
      ctx.globalCompositeOperation = isDark ? "screen" : "multiply";
      const drift = reduced ? 0 : t;
      for (let y = -tile; y < height + tile; y += tile) {
        for (let x = -tile; x < width + tile; x += tile) {
          ctx.drawImage(tileCanvas, x + drift, y + drift);
        }
      }
      ctx.restore();

      // 3) Point-field / stipple (blue-noise-ish via jittered grid).
      const cell = 30;
      const jitter = 0.86;
      const dotAlpha = (isDark ? 0.14 : 0.11) * intensity;
      const dot = hslToRgba(fg.h, Math.min(8, fg.s), isDark ? 92 : 8, dotAlpha);
      const dot2 = hslToRgba(
        fg.h,
        Math.min(8, fg.s),
        isDark ? 92 : 8,
        dotAlpha * 0.5,
      );

      ctx.save();
      ctx.globalCompositeOperation = isDark ? "screen" : "multiply";
      ctx.fillStyle = dot;
      const tt = reduced ? 0 : t * 0.06;
      const gx0 = reduced ? 0 : Math.sin(tt * 0.35) * 2.4;
      const gy0 = reduced ? 0 : Math.cos(tt * 0.29) * 2.0;
      for (let gy = 0; gy < Math.ceil(height / cell) + 1; gy++) {
        for (let gx = 0; gx < Math.ceil(width / cell) + 1; gx++) {
          const h = hashU32(gx, gy, seed);
          const r0 = u32To01(h);
          if (r0 < 0.18) continue;

          const r1 = u32To01(hashU32(gx + 11, gy + 7, seed));
          const r2 = u32To01(hashU32(gx + 23, gy + 19, seed));
          const r3 = u32To01(hashU32(gx + 41, gy + 29, seed));

          const ox = (r1 - 0.5) * cell * jitter;
          const oy = (r2 - 0.5) * cell * jitter;

          const phase = r3 * Math.PI * 2;
          const mx = reduced ? 0 : Math.sin(tt + phase) * 2.2;
          const my = reduced ? 0 : Math.cos(tt * 0.92 + phase) * 1.7;
          const pulse = reduced ? 1 : 0.72 + 0.28 * Math.sin(tt * 0.9 + phase);
          ctx.globalAlpha = pulse;

          const x = gx * cell + ox + mx + gx0;
          const y = gy * cell + oy + my + gy0;

          const size = r0 > 0.97 ? 3 : r0 > 0.87 ? 2 : 1;
          ctx.fillRect(Math.round(x), Math.round(y), size, size);
        }
      }

      // Extra micro-speckles.
      ctx.fillStyle = dot2;
      ctx.globalAlpha = 1;
      for (let i = 0; i < 1100; i++) {
        const h = hashU32(i, i ^ 1337, seed);
        const x0 = u32To01(h);
        const y0 = u32To01(hashU32(i ^ 0x9e37, i, seed));
        const phase = u32To01(hashU32(i ^ 77, i ^ 101, seed)) * Math.PI * 2;
        const mx = reduced ? 0 : Math.sin(tt * 1.2 + phase) * 3.2;
        const my = reduced ? 0 : Math.cos(tt * 1.05 + phase) * 2.8;
        const x = x0 * width + mx + gx0 * 0.6;
        const y = y0 * height + my + gy0 * 0.6;
        const pulse = reduced ? 1 : 0.55 + 0.45 * Math.sin(tt * 1.05 + phase);
        ctx.globalAlpha = pulse;
        ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
      }
      ctx.restore();
    };

    const loop = (ms: number) => {
      // Run at ~12fps to keep CPU low.
      if (ms - lastMs >= 80) {
        lastMs = ms;
        t = (t + 0.6) % 220;
        repaint();
      }
      rafId = requestAnimationFrame(loop);
    };

    repaint();
    if (!reduced) rafId = requestAnimationFrame(loop);

    const onResize = () => repaint();
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      window.removeEventListener("resize", onResize);
      if (!reduced) cancelAnimationFrame(rafId);
    };
  }, [intensity, seed]);

  return <canvas ref={canvasRef} className={className} />;
}

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

function parseHslTriplet(value: string) {
  // expects "h s% l%" or "h s l"
  const parts = value.trim().split(/\s+/).slice(0, 3);
  const h = Number.parseFloat(parts[0] ?? "0");
  const s = Number.parseFloat((parts[1] ?? "0").replace("%", ""));
  const l = Number.parseFloat((parts[2] ?? "0").replace("%", ""));
  return { h, s, l };
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
      const bg = parseHslTriplet(styles.getPropertyValue("--background"));
      const isDark = bg.l < 50;

      ctx.clearRect(0, 0, width, height);

      // Grain layer (high frequency, monochrome).
      // We draw a small tile then scale it across the canvas.
      const tile = 220;
      const tileCanvas = document.createElement("canvas");
      tileCanvas.width = tile;
      tileCanvas.height = tile;
      const tileCtx = tileCanvas.getContext("2d");
      if (tileCtx) {
        const img = tileCtx.createImageData(tile, tile);
        const data = img.data;
        const grainA = Math.round((isDark ? 18 : 12) * grainIntensity); // 0..255
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.floor(96 + prng() * 96);
          data[i + 0] = v;
          data[i + 1] = v;
          data[i + 2] = v;
          data[i + 3] = grainA;
        }
        tileCtx.putImageData(img, 0, 0);
      }

      ctx.save();
      ctx.globalAlpha = (isDark ? 0.5 : 0.42) * grainIntensity;
      ctx.globalCompositeOperation = isDark ? "screen" : "multiply";
      const drift = reduced ? 0 : t;
      for (let y = -tile; y < height + tile; y += tile) {
        for (let x = -tile; x < width + tile; x += tile) {
          ctx.drawImage(tileCanvas, x + drift, y + drift);
        }
      }
      ctx.restore();

      // Micro-dither pass (breaks gradient banding without looking "grainy").
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = (isDark ? 0.06 : 0.045) * grainIntensity;
      const drift2 = reduced ? 0 : t * 0.6;
      for (let y = -tile; y < height + tile; y += tile) {
        for (let x = -tile; x < width + tile; x += tile) {
          ctx.drawImage(tileCanvas, x + drift2, y + drift2);
        }
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

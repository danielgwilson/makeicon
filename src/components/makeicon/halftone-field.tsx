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

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
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

function gauss2(x: number, y: number, cx: number, cy: number, sigma: number) {
  const dx = x - cx;
  const dy = y - cy;
  const denom = 2 * sigma * sigma;
  return Math.exp(-(dx * dx + dy * dy) / denom);
}

export function HalftoneField({
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
      const fg = parseHslTriplet(styles.getPropertyValue("--foreground"));
      const bg = parseHslTriplet(styles.getPropertyValue("--background"));
      const isDark = bg.l < 50;

      ctx.clearRect(0, 0, width, height);

      // Structured, grid-based halftone field with a gently animated density gradient.
      const cell = width < 420 ? 18 : width < 900 ? 20 : width < 1280 ? 22 : 24;

      const cols = Math.ceil(width / cell) + 1;
      const rows = Math.ceil(height / cell) + 1;

      const tt = reduced ? 0 : t * 0.006;
      const tt2 = reduced ? 0 : t * 0.004;

      // Two slow "density attractors" (calm, Apple-y; not particle-like).
      const c1x = 0.22 + 0.12 * Math.sin(tt * 0.8);
      const c1y = 0.18 + 0.08 * Math.cos(tt * 0.7);
      const c2x = 0.68 + 0.14 * Math.cos(tt2 * 0.55 + 0.8);
      const c2y = 0.32 + 0.12 * Math.sin(tt2 * 0.62 + 1.1);

      const baseAlpha = (isDark ? 0.18 : 0.11) * (0.7 + 0.3 * intensity);
      const dotColor = hslToRgba(fg.h, Math.min(10, fg.s), isDark ? 92 : 10, 1);

      ctx.fillStyle = dotColor;

      for (let gy = 0; gy < rows; gy++) {
        const py = gy * cell + cell * 0.5;
        const y01 = py / Math.max(1, height);

        // Hero fade: strongest near the top, then falls off.
        const hero = smoothstep(0.98, 0.1, y01);
        if (hero <= 0.0001) continue;

        for (let gx = 0; gx < cols; gx++) {
          const px = gx * cell + cell * 0.5;
          const x01 = px / Math.max(1, width);

          const edge =
            smoothstep(0.02, 0.14, x01) * smoothstep(0.02, 0.14, 1 - x01);

          const g = clamp01(
            (1 - y01) * 0.64 +
              (1 - x01) * 0.12 +
              gauss2(x01, y01, c1x, c1y, 0.26) * 0.85 +
              gauss2(x01, y01, c2x, c2y, 0.22) * 0.6,
          );

          // Subtle wave: keeps it alive without becoming "movement".
          const w =
            0.06 *
            (Math.sin((x01 * 2.1 + y01 * 1.45 + tt * 0.22) * Math.PI * 2) +
              Math.cos((x01 * 1.35 - y01 * 1.9 + tt2 * 0.18) * Math.PI * 2));

          const density = clamp01((g + w) * hero * edge);

          // Halftone mapping: density -> dot size and opacity.
          const d = density ** 1.22;
          const maxR = isDark ? 4.4 : 3.9;
          const r = (0.12 + d * maxR) * (0.78 + 0.22 * intensity);
          const a = baseAlpha * (0.4 + 0.6 * d) * edge;
          if (a <= 0.003 || r <= 0.15) continue;

          ctx.globalAlpha = a;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (ms: number) => {
      // ~18fps: more visible than the grain, still light on CPU.
      if (ms - lastMs >= 56) {
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
      data-testid="halftone-field"
    />
  );
}

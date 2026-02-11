# Progress (makeicon)

## Now

- Core MVP: in-browser icon export UI is live in `src/components/makeicon/icon-lab.tsx`.
- Packs: web favicon + PWA, Next.js App Router files, Chrome extension, Slack/Discord emoji, Windows tiles, Vercel integration logo, Notion icon, Figma widget icon, GitHub social preview.
- URL import: direct fetch with CORS, with fallback to `/api/image-proxy`.
- Research notes: `docs/ICON_SCENARIOS.md`.
- Market/competition + strategy notes: `docs/MARKET_RESEARCH.md`.

## Next

- Add “preview strip” for generated outputs (key sizes + filenames).
- Add “custom builder” (arbitrary sizes, file names, formats).
- Expand packs (Safari pinned tab SVG, iOS/macOS app iconsets, Android adaptive, etc.).
- Tighten UX flow to “drop → instant smart pack → download”, nobg-style (example presets, zero scrolling friction).
- SEO “pack pages” + sources/last-verified blocks per pack.
- “Verify” loop (favicon/manifest checker) as retention hook.

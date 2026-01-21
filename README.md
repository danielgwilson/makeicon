# makeicon.dev

The fastest way to turn *one* image into the exact icon set you need.

- Drag & drop / paste / URL / file picker
- One-click ZIP exports for common scenarios:
  - Web favicons + PWA icons (including maskable)
  - Next.js App Router “special files”
  - Chrome extension icons
  - Slack + Discord emoji sizing
- Runs **entirely in your browser** (no upload)

## Getting Started

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## Scripts

```bash
pnpm lint
pnpm typecheck
pnpm test:run
pnpm test:e2e
```

## Deploy

This repo is connected to Vercel. Push to `main` for production deploys.

Domain notes:
- `makeicon.dev` should have an `A` record pointing to `76.76.21.21` (Vercel apex).
- `www.makeicon.dev` is added to the Vercel project and will follow production deployments.

## Contributing ideas

MakeIcon is intentionally built for “non-obvious” edge cases (format quirks, platform limits, and modern deploy workflows). If you’ve got a scenario you repeatedly hit, open an issue and include the exact target platform + constraints.

---

Built with dgkit + Next.js + shadcn/ui.

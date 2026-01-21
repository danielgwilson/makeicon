# CLAUDE.md

This file provides guidance to Claude Code when working in this repo.

## Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm typecheck
```

## Guardrails

- Use pnpm (keep `pnpm-lock.yaml` consistent).
- Don’t commit secrets; keep `.env.example` updated.
- Deploy via **GitHub → Vercel** integration (avoid ad-hoc prod deploys from CLI).
- Avoid `vercel link` / `vercel --prod` unless explicitly requested.
- Prefer migrations over destructive schema pushes.
- If you’re stuck, use your configured MCPs (Exa/Context7/Firecrawl) rather than guessing.

# Agent Instructions (Codex/Claude/Cursor)

This repo is designed to be worked on by humans + coding agents. Optimize for **velocity** while minimizing regressions.

## Project Links (keep updated)

<!-- kit:project-links:start -->
- GitHub: danielgwilson/makeicon
- Vercel: makeicon
- Domain: makeicon.dev
- App URL (prod): https://makeicon.dev
- DB (provider + project): (fill)
- Redis (provider): (fill)
- Inngest: (fill)
- Stripe: (fill)
- GCP project: (fill)
<!-- kit:project-links:end -->

## Workflow Defaults

- Keep changes small and shippable; avoid opportunistic refactors unless asked.
- Deploys should happen via **GitHub → Vercel** integration:
  - PRs → Preview deploys
  - Merge to `main` → Production deploy
  - Use Vercel CLI mainly for logs/inspection/env (not for ad-hoc production deploys).
  - Avoid `vercel link` / `vercel --prod` unless explicitly requested (easy to mis-link/mis-deploy).

## LLM Product Guidance (important)

- Don’t add brittle deterministic “guardrail” logic to compensate for agent mistakes.
  - Prefer better prompts/tool descriptions, targeted tests, and clearer errors/observability.
- If you’re unsure about a change with cost/infra risk (Vercel/DB/Redis/GCP/Stripe), ask first.


<!-- kit:section:dgkit-first-steps:start -->
## Session Start (agents)

- First, get a fast, machine-readable snapshot: `dgkit status --json`
  - If `dgkit` isn’t on PATH, use: `pnpm -C <path-to-dgkit> dev status --json`
- Then run: `dgkit doctor --json` to get actionable setup checks (auth/db/vercel/git).
- If `status` shows missing “Project Links”, fill them with:
  - `dgkit setup --github owner/repo --vercel team/project --db "Neon (project_id=...)"`
- For Neon DB provisioning (if you want dgkit to drive it): `dgkit neon bootstrap`
<!-- kit:section:dgkit-first-steps:end -->




<!-- kit:section:git-workflow:start -->
## Git Workflow (authority)

- You have permission to land changes on `main` **if the repo allows it**.
- If `main` is protected / requires PRs (or `git push` is rejected):
  - work on a branch, open a PR, and request review/merge
  - do **not** force-push `main`
  - do **not** auto-merge PRs into `main` unless explicitly confirmed
<!-- kit:section:git-workflow:end -->




<!-- kit:section:testing:start -->
## Testing

- Unit tests (Vitest): `pnpm test:run`
- E2E (Playwright): `pnpm test:e2e`
  - Starts `pnpm dev` automatically on port `3107`
  - Sets `E2E=1` for E2E-only routes (see `src/app/e2e/page.tsx`)
- All tests: `pnpm test:all`
- Fast checks before handing off work: `pnpm lint` + `pnpm typecheck`
<!-- kit:section:testing:end -->



## Quick Start

```bash
pnpm install
cp .env.example .env.local
pnpm lint
pnpm typecheck
pnpm dev
```

## Where to Put “The Truth”

- Progress: `docs/PROGRESS.md`
- Handoff: `docs/HANDOFF.md`
- Decisions: `docs/DECISIONS.md`
- Agent guide: `docs/AGENT_GUIDE.md`

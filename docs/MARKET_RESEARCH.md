# Market Research — Icon Generation / Asset Packs (makeicon.dev)

**Last updated:** 2026-02-11  
**Goal:** Map the competitive landscape, identify the highest-value personas and jobs-to-be-done, and propose a monetizable strategy for makeicon.dev.

> Notes on methodology:
> - This doc is intentionally “source-forward”: when we assert a requirement (“Slack wants X”), we try to cite an authoritative spec/help page.
> - The space is extremely long-tailed (hundreds/thousands of micro-tools). The aim is *coverage by category + major players + representative examples*, not a claim of total exhaustiveness.

---

## 0) What makeicon.dev is today (re-ramp)

### Product promise (current)

- “The fastest way to turn one image into the exact icon set you need.”
- In-browser generation (privacy: no upload).
- A **pack** model: choose a target scenario → download a ZIP containing the right sizes, filenames, and (sometimes) helper files/snippets.

### Current packs (from repo)

Packs are defined in `src/lib/makeicon/packs.ts` and include:

- Web (favicon + PWA): multi-size ICO + PNG + `site.webmanifest` + a Next metadata snippet.
- Next.js App Router “special files” (`src/app/icon.png`, `apple-icon.png`, `favicon.ico`).
- Chrome extension icons (16/32/48/128 + manifest snippet).
- Slack + Discord emoji sizing.
- Firefox add-on icons.
- VS Code extension icon.
- iOS / Android / Windows tiles / Vercel integration logo / Notion icon / Figma widget icon / GitHub social preview.

### Core UX journey (intended)

1) Land → 2) Drop/paste/URL an image → 3) Pick packs (popular chips + pack picker) → 4) Tune framing/padding/background → 5) Download ZIP → 6) Copy into project.

---

## 1) The problem space (taxonomy)

This space is best understood as a set of overlapping “asset generation” jobs:

### A. Icon-set generation (the classic)

**Input:** one master image (usually 1024×1024).  
**Output:** platform-compliant icon sets + predictable file naming.

Examples:
- Favicons + PWA icons + manifest hints
- iOS `AppIcon.appiconset` folders, Android mipmaps/adaptive, Windows tiles

### B. Framework/workflow-specific “drop-in files”

**Input:** master image.  
**Output:** framework conventions / folder structures that make integration trivial.

Example: Next.js `favicon`, `icon`, `apple-icon` file conventions.  
Source: Next.js file conventions docs. https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons

### C. Marketplace/listing assets

Examples:
- Vercel integration logo requirements (non-transparent PNG, min 256px).  
  Source: Vercel integration submission requirements. https://vercel.com/docs/integrations/create-integration/submit-integration
- GitHub repo social preview (recommended 1280×640).  
  Source: GitHub social media preview docs. https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview

### D. Community “small image” constraints (emoji/emotes)

Examples:
- Slack custom emoji guidance: square images under 128KB; JPG/PNG/GIF; GIF frame guidance.  
  Source: Slack help. https://slack.com/help/articles/206870177-Add-customised-emoji-and-aliases-to-your-workspace
- Discord custom emoji requirements: 128×128 recommended; 256KB; multiple image formats.  
  Source: Discord blog. https://discord.com/blog/beginners-guide-to-custom-emojis

### E. Verification / “favicon checker” and audit tools

These tools don’t generate assets; they diagnose broken setups, missing sizes, manifest issues, caching problems, etc.

Example: RealFaviconGenerator includes a checker workflow.  
Source (homepage mentions favicon checker): https://realfavicongenerator.net/

### F. “Glue” via CLI / build tooling

These tools convert assets as part of CI/build processes and may update manifests/HTML automatically.

Examples:
- `favicons` (Node) generates favicons + associated files locally.  
  Source: npm package. https://www.npmjs.com/package/favicons
- `pwa-asset-generator` generates icons + splash screens; updates manifest/index; references Apple HIG.  
  Source: npm package. https://www.npmjs.com/package/pwa-asset-generator/v/2.2.0
- `@vite-pwa/assets-generator` CLI/preset-based PWA assets generator.  
  Source: GitHub repo. https://github.com/vite-pwa/assets-generator

### G. Design-suite “emoji maker / icon maker” products

These often bundle:
- background removal
- templates
- AI generation
- resize/export

Example: Icons8 “Make a Slack emoji” flow.  
Source: https://icons8.com/make/make-a-slack-emoji

### H. Social/OG image generators (adjacent, but converging)

Many developers want “share preview assets” alongside icons, and some tools focus purely on OG images.

Representative examples:
- Opengraph.xyz “Open Graph Image Generator”.  
  Source: https://www.opengraph.xyz/
- Bannerbear “Open Graph image generator”.  
  Source: https://www.bannerbear.com/open-graph-image-generator/

---

## 2) Competitive landscape (by category)

### 2.1 Favicon/PWA generators (web apps)

**RealFaviconGenerator** (category leader, deeply “compatibility first”)  
- Positioning: “favicon generator… for real”, handles many platforms, previews, checker.  
  Source: https://realfavicongenerator.net/
- Developer surfaces: interactive API + CLI (`npx realfavicon generate`) + TS library.  
  Source: https://realfavicongenerator.net/developers/favicon-generation
- Business model: explicitly “free service”; donation page.  
  Sources: https://realfavicongenerator.net/terms-of-service and https://realfavicongenerator.net/donate
- Distribution wedge: WordPress plugin with large install base (~200K active).  
  Source: https://wordpress.org/plugins/favicon-by-realfavicongenerator/

**favicon.io** (simple + viral, multi-input: text/emoji/image)  
- Example: emoji favicon generator + downloaded multi-format set.  
  Source: https://favicon.io/emoji-favicons/

**favicon.pub** (simple “upload once, download every favicon” + SEO-focused content)  
- Claims: generates PNG/ICO/SVG, pinned tab, webmanifest; in-browser processing.  
  Source: https://favicon.pub/

**FaviconGenerator.io** (modern UI, “runs locally in your browser”, multi-input)  
Source: https://favicongenerator.io/

**Favicon.cc** (very old-school, favicon editor/drawer)  
Source: https://www.favicon.cc/

**favicon-generator.org** (simple upload → generate ico/png)  
Source: https://www.favicon-generator.org/

**Maskable.app** (specialized: maskable icon preview/testing)  
Source: https://maskable.app/

### 2.2 App icon generators (iOS/Android/macOS)

These are highly commoditized. Many are “free, no signup” and monetize via upsells, templates, ads, or adjacent tools.

Representative examples:
- AppIconGenerator (multi-platform icon generation + some paid tier for AI logo generations).  
  Source: https://www.appicongenerator.org/
- AppIconly (multi-platform; padding/background settings).  
  Source: https://www.appiconly.com/
- App Icon Maker (free generator + “pro developer tools” hub).  
  Source: https://appiconmaker.co/
- Android Asset Studio (official-ish reference generator for Android launcher icons).  
  Source: https://developer.android.com/studio/write/image-asset-studio
- IconKitchen (high-quality Android/iOS icon generator with shape/padding/background controls).  
  Source: https://icon.kitchen/
- PWA Builder image generator (Microsoft’s PWA tooling; generates icons from an image).  
  Source: https://www.pwabuilder.com/imageGenerator

### 2.3 Chrome extension icon generators (micro-tools + extensions)

The Chrome ecosystem has spawned many single-purpose generators and even Chrome extensions that generate extension icons.

- Chrome docs for required sizes and manifest `icons`.  
  Source: https://developer.chrome.com/docs/extensions/develop/ui/configure-icons

Representative tools:
- ExtensionBooster icon generator (includes manifest snippet).  
  Source: https://extensionbooster.com/tools/extension-icons-generator
- icon128.com generator.  
  Source: https://icon128.com/

### 2.4 Emoji/emote makers & resizers (Slack/Discord/Twitch)

This category splits into:
- “resizer/optimizer” tools (meet pixel + file size caps)
- “maker” tools (templates, background removal, effects)
- “AI emoji generation” (generate from prompts)

Specs / authoritative requirements:
- Slack: square images under 128KB; JPG/PNG/GIF; GIF frames guidance.  
  Source: https://slack.com/help/articles/206870177-Add-customised-emoji-and-aliases-to-your-workspace
- Discord: 128×128 recommended; 256KB; multiple formats.  
  Source: https://discord.com/blog/beginners-guide-to-custom-emojis

Examples:
- Icons8 Mega Creator “Make a Slack emoji” (design suite + background removal + export).  
  Source: https://icons8.com/make/make-a-slack-emoji
- Fotor “Discord emote maker” (AI/templates).  
  Source: https://www.fotor.com/features/discord-emotes/
- Pixelle “AI custom Slack emoji generator” (AI-first, culture/branding wedge).  
  Source: https://pixelle.io/slack-icons

### 2.5 Favicon checkers / PWA audits (verification tools)

There are many, but the key insight is: the **checker** is a sticky “return” workflow (people revisit after deploy, caching issues, etc.).

Representative examples:
- Snipinsta “Favicon Checker & PWA Audit” (manifest validation, missing icons).  
  Source: https://snipinsta.app/favicon-checker
- RJL favicon checker (claims “66+ patterns”, “2026 standards”, proxy for CORS).  
  Source: https://rjl.io/favicon-checker/

### 2.6 “Fetch the favicon” APIs (adjacent)

Not direct competition for *generation*, but relevant as adjacent developer infrastructure + potential add-on feature (“fetch brand mark for placeholder icons”).

Example:
- FaviconKit “favicon and logo fetching API”.  
  Source: https://faviconkit.net/

### 2.7 Build-time generators (CLI/libs)

- `favicons` npm module.  
  Source: https://www.npmjs.com/package/favicons
- `pwa-asset-generator` (icons + splash screens + manifest/index updates).  
  Source: https://www.npmjs.com/package/pwa-asset-generator/v/2.2.0
- `@vite-pwa/assets-generator` (preset-based).  
  Source: https://github.com/vite-pwa/assets-generator

### 2.8 Standards & “source of truth” docs (what tools must track)

Key sources that influence pack correctness:
- Web App Manifest `purpose` (`any`, `maskable`, `monochrome`).  
  Source: W3C TR + MDN. https://www.w3.org/TR/appmanifest/ and https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons
- Maskable safe zone + rationale.  
  Source: web.dev maskable icon. https://web.dev/maskable-icon/
- Chromium icon size expectations (192/512) for manifests.  
  Source: web.dev add-manifest. https://web.dev/add-manifest/
- Google Search favicon requirements/guidelines.  
  Source: Google Search Central. https://developers.google.com/search/docs/appearance/favicon-in-search
- Safari pinned tabs (mask-icon SVG constraints).  
  Source: Apple Safari Web Content Guide (archived). https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/pinnedTabs/pinnedTabs.html

### 2.9 Design suites (substitutes)

Not direct competitors, but common “good enough” substitutes: users design/export variants manually instead of using a generator.

Representative examples:
- Figma. https://www.figma.com/
- Canva. https://www.canva.com/
- Adobe Express. https://www.adobe.com/express/
- Sketch. https://www.sketch.com/
- Affinity (Designer/Photo). https://affinity.serif.com/

### 2.10 Icon libraries + marketplaces (substitutes)

Also “job competitors”: instead of generating from a brand mark, people just pick an existing icon.

Representative examples:
- The Noun Project. https://thenounproject.com/
- Flaticon. https://www.flaticon.com/
- Iconfinder. https://www.iconfinder.com/
- Iconscout. https://iconscout.com/icons
- Icons8. https://icons8.com/
- SVG Repo. https://www.svgrepo.com/

Open-source/icon-set sites:
- Font Awesome. https://fontawesome.com/
- Google Material Symbols/Icons. https://fonts.google.com/icons
- Lucide. https://lucide.dev/
- Heroicons. https://heroicons.com/
- Tabler Icons. https://tabler.io/icons

### 2.11 Vector/icon pipeline tooling (adjacent)

For design systems and developer pipelines: turning SVG assets into components, sprites, icon fonts, etc.

Representative examples:
- Iconify (icon framework + tooling). https://iconify.design/
- SVGR (SVG → React component tooling). https://react-svgr.com/
- IcoMoon App (icon font generator). https://icomoon.io/app/
- Fontello (icon font builder). https://fontello.com/

### 2.12 Optimization utilities (adjacent / complements)

Often paired with generation because file-size caps and performance matter.

Representative examples:
- Squoosh (compression/format transforms). https://squoosh.app/
- TinyPNG (compression). https://tinypng.com/
- remove.bg (background removal). https://www.remove.bg/
- `sharp` (Node image pipeline). https://www.npmjs.com/package/sharp

### 2.13 App store / marketplace listing assets (expansion surface)

MakeIcon currently covers some marketplace/listing assets (e.g., Vercel integration logo, GitHub social preview). There’s additional high-intent demand around mobile and store listing assets.

Authoritative references (for future packs):
- Apple HIG app icons. https://developer.apple.com/design/human-interface-guidelines/app-icons
- Android adaptive icon design. https://developer.android.com/develop/ui/views/launch/icon_design_adaptive

---

## 3) What users actually “pay for” (jobs-to-be-done)

In commoditized generators, people don’t pay for pixels — they pay for *certainty + time saved + fewer deploy failures*.

### Core JTBD

1) **“Make this icon set correct the first time.”**
   - minimize platform weirdness
   - avoid repeated trial-and-error after deploy
2) **“Make integration effortless in my actual stack.”**
   - framework drop-in files + snippets + folder structure
3) **“Prevent regressions over time.”**
   - specs change; people forget; new team members break paths; caching makes debugging awful

### Why people churn from generic tools

- unclear “which sizes matter in 2026”
- generators output huge bundles without telling you the minimal set
- missing *workflow guidance*: where to put files, what to name them, what code to add
- no verification (checker) step
- no way to save/share “company standard” presets

---

## 4) Likely optimal personas (and their journeys)

### Persona P1: Indie dev / SaaS founder shipping fast

**Profile**
- builds on Vercel/Next/Remix/Astro, often solo
- wants a polished finish (favicons, PWA, social cards) without spending hours

**Needs**
- minimum viable “good enough for search + install”
- drop-in conventions for their framework
- a fast “done” workflow (no “read docs for 30 minutes”)

**Journey**
- Google: “favicon generator”, “next icon.png apple-icon”
- land on a “pack page” → upload → download zip → copy into repo → ship

### Persona P2: Agency / freelance dev (repeatable deliverables)

**Profile**
- produces many sites for clients
- needs repeatable checklists and “client-ready” packaging

**Needs**
- saved presets per client
- “brand kit” controls: background color, padding standards, safe-zone
- exports + instructions that can be handed off

**Journey**
- create or reuse preset → export → include in handoff doc

### Persona P3: Extension developer (Chrome Web Store)

**Needs**
- exact sizes + manifest snippet + “don’t look bad at 16×16”
- quick iteration (multiple icons for variants)

**Authority**
- Chrome icon size guidance and manifest `icons` structure.  
  Source: https://developer.chrome.com/docs/extensions/develop/ui/configure-icons

### Persona P4: Team comms / culture builder (Slack/Discord)

**Needs**
- emoji under strict file limits; often needs background removal and compression
- batch processing is common (upload 10–50 emojis)

**Authority**
- Slack emoji best-practices guidance.  
  Source: https://slack.com/help/articles/206870177-Add-customised-emoji-and-aliases-to-your-workspace
- Discord custom emoji requirements.  
  Source: https://discord.com/blog/beginners-guide-to-custom-emojis

### Persona P5: “Ops-minded” engineer who wants repeatable CI

**Profile**
- wants this solved in build steps
- prefers CLI + config + deterministic outputs

**Competition**
- `favicons` and PWA asset generators in CI.  
  Sources: https://www.npmjs.com/package/favicons and https://www.npmjs.com/package/pwa-asset-generator/v/2.2.0

---

## 5) Positioning opportunities (where makeicon can win)

### Opportunity O1: “Packs for real workflows” (not just platforms)

Most tools segment by platform (“iOS”, “Android”, “Favicon”). Makeicon can own *workflow packs*:
- “Next.js App Router drop-in icons”
- “Vercel integration submission assets”
- “GitHub repo social preview + OG image starter”
- “Chrome MV3 extension bundle”

This resonates because it matches how developers think: “I’m shipping a Next app on Vercel” not “I need 17 sizes”.

### Opportunity O2: “Compliance with citations” as a trust mechanism

Make icon packs *source-backed* (like `docs/ICON_SCENARIOS.md` already is):
- each pack includes references + last-verified dates
- UI exposes “why these files exist” (collapsible) with links to specs

This becomes a moat: people default to the tool they *trust* won’t make them redo work.

### Opportunity O3: “The checker loop” as the retention hook

MakeIcon can add a “Verify install” workflow similar to favicon checkers:
- paste a URL (or local paths) → detect missing icons/manifest issues
- explain caching gotchas
- provide fix-it instructions

This drives repeat usage beyond the one-time “generate zip”.

### Opportunity O4: Saved presets + team sharing

The moment teams can say “use our standard icon recipe”, you can monetize:
- saved presets per workspace
- shareable links
- “brand kit” defaults (background, padding, safe-zone, rounding)

### Opportunity O5: “Minimal bundle” mode

Many generators overwhelm. A “Minimum shippable set (2026)” toggle is a strong differentiator — and can be justified with sources (Google Search Central, web.dev, Next file conventions).

---

## 6) Monetization patterns observed in the space

From observed competitors:

- **Free + donations** (common for high-trust utilities)
  - RealFaviconGenerator is free and has a donation page.  
    Sources: https://realfavicongenerator.net/terms-of-service and https://realfavicongenerator.net/donate
- **Free tool + upsell to adjacent suite** (Tool hubs, templates, “pro tools”)
  - AppIconMaker frames itself inside a broader “developer tools” suite.  
    Source: https://appiconmaker.co/
- **Freemium for AI generation** (resize free, AI credits paid)
  - AppIconGenerator shows “simple, transparent pricing” for AI logo generations.  
    Source: https://www.appicongenerator.org/
- **Paid design suites** (templates, stock assets, background removal)
  - Icons8, Fotor, etc. (some free entry points).  
    Sources: https://icons8.com/make/make-a-slack-emoji and https://www.fotor.com/features/discord-emotes/

Implication:
- Charging for “generate basic icon sizes” is hard.
- Charging for **workflow certainty, saved presets, and verification** is plausible.

---

## 7) A master strategy proposal for makeicon.dev

### Strategy headline

**Own the “workflow pack” niche:**
> *MakeIcon is the source-backed icon pack generator for real deployment workflows — not just generic resizes.*

### Recommended “above the fold” messaging (test)

- **Hero:** “Ship icons that are correct the first time.”
- **Subhead:** “Generate workflow-specific icon packs (files + paths + snippets) for Next.js, extensions, marketplaces, and more — backed by source citations.”
- **Primary CTA:** “Upload image → Download pack”
- **Secondary CTA:** “Verify my site icons” (can start as a fake-door to measure demand)

### The wedge (how we become default)

1) **SEO landing pages per pack**
   - `/packs/nextjs-app-router-icons`
   - `/packs/vercel-integration-logo`
   - `/packs/chrome-extension-icons`
   - `/packs/slack-emoji`
   - `/packs/github-social-preview`
   - Each page: requirements + citations + “Upload → Download ZIP” + integration snippet.

2) **Trust by citations**
   - Show “Sources” for every pack and “last verified” dates.
   - This makes MakeIcon “the tool you trust in a deploy crunch”.

3) **Retention via checker**
   - Add a “Verify” tab:
     - Favicon/manifest: paste URL → get a report + fixes.
     - Repo: paste GitHub URL → check social preview image configured + size guidance.
   - The checker is a reason to revisit after shipping.

### Monetization (realistic, non-extractive)

**Free tier (no account):**
- All core packs
- Download ZIP
- Basic framing controls
- Local-only saved presets (for stickiness without infra)

**Pro (individual, ~$10/mo or ~$96/yr):**
- Cloud-synced presets + share links
- Custom pack builder (“I need these sizes/paths/snippets”)
- Batch export (multiple input images)
- “Brand kit” defaults (padding/background rules per pack)
- Download history
- If/when a verifier exists: include a monthly verification quota (ongoing compute/network cost)

**Team (agencies/small teams, e.g. $39/mo for 3 seats + add-ons):**
- Shared presets + roles
- “Company standard” pack sets
- Audit logs (“who changed the preset”)
- Exportable client/project handoff artifacts (README/checklist per export)
- Optional: enforceable constraints (e.g., must include maskable, must include 512)

**One-time purchase (optional experiment):**
- “Founding Pro” early-bird (e.g., $29–$59) to validate willingness-to-pay; exclude ongoing-cost verifier quotas if needed.

### Why this monetization is defensible

Because it charges for:
- repeat value (saved presets, team sharing)
- time saved over multiple projects
- reduced mistakes (verification + compliance)

…not for the first ZIP export, which is likely too commoditized.

---

## 8) Product roadmap (ranked by ROI)

### Phase 1: tighten the “drop → done” flow (1–2 weeks)

- Preview strip for generated outputs (top 8 files): show sizes + filenames + quick open.
- “Minimal bundle” toggle for Web pack (with citations for why).
- Pack pages (SEO) with lightweight copy + sources.

### Phase 2: add the “verify” loop (2–4 weeks)

- Favicon/PWA verifier: paste URL → check tags + manifest + reachability.
  - Use the space’s existing mental model (like favicon checker tools).
- “Fix it” guidance: copy/paste snippets for Next.js / plain HTML.

### Phase 3: monetize with saved presets + custom builder (4–8 weeks)

- Custom builder with:
  - arbitrary sizes, paths, formats
  - optional “warn if >X KB” rules (especially emoji)
  - export as reusable JSON “pack spec”
- Auth + storage only when needed (keep base tool frictionless).

---

## 9) Messaging that will likely convert

### Core tagline options (test)

- “Icon packs for real deployments.”
- “Stop guessing icon sizes.”
- “Drop one image. Ship every icon.”
- “Source-backed icon sets for Next.js, extensions, and more.”

### Proof points (use on landing)

- Runs entirely in your browser (privacy)
- Pack outputs match real platform constraints (sizes, naming, file caps)
- Each pack is source-backed with citations (trust)
- One-click ZIP export + framework drop-ins

### The “anti-positioning”

Avoid: “AI icon generator” as the primary story (too crowded).  
Instead: correctness + workflow + verification. (If AI ever exists, keep it an add-on.)

---

## 10) Open questions / next research

- Pricing sensitivity testing: indie vs agency vs teams.
- Which pack pages have highest search intent (likely: favicon generator, next icon/apple-icon, chrome extension icons).
- Should MakeIcon ship a CLI (for CI users), or focus on web + preset export first?

---

## 11) Validation plan (fast, low-risk experiments)

These are intentionally designed to validate the proposed wedges before building heavy infra.

1) **Pack pages → download conversion**
   - Ship 3 pages: Next.js App Router icons, Chrome extension icons (MV3), Slack emoji.
   - Measure: page → upload → download conversion, plus post-download “did this save you time?” prompt.

2) **Trust via citations**
   - A/B: prominent “Sources + last verified” block vs control.
   - Measure: conversion-to-download and user-reported trust.

3) **Verifier demand**
   - Fake-door “Verify my site icons” CTA.
   - Measure: click-through + willingness to enter URL/email.
   - If strong: build minimal verifier that checks a small, well-defined set (favicon tags + manifest reachable + basic required sizes).

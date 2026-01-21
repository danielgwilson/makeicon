# Icon / Asset Scenarios (research notes)

**Last updated:** 2026-01-21  
**Goal:** Keep a tight, source-backed list of “real world” icon + dev-asset requirements that MakeIcon should cover.

---

## Web: favicons + PWA

### Web App Manifest icons

- **Formats:** typically PNG.
- **Sizes:** commonly `192×192` + `512×512` for PWAs.
- **Maskable:** provide a **maskable** icon variant with extra padding so it survives circular/rounded masks.
  - Maskable safe zone recommendations and background guidance:  
    - https://web.dev/articles/maskable-icon  
    - https://w3c.github.io/manifest/#purpose-member  
    - https://developer.mozilla.org/en-US/docs/Web/Manifest#icons

### Windows tiles (PWA / browserconfig)

Microsoft tile guidance and the canonical square sizes:  
https://learn.microsoft.com/en-us/microsoft-edge/progressive-web-apps-chromium/how-to/icon-theme-color

---

## Next.js (App Router)

Next.js supports “special files” under `src/app/` (e.g. `icon.png`, `apple-icon.png`, `favicon.ico`), which is a common deployment pattern on Vercel.

---

## Browser extensions

### Chrome extension icons

Chrome extension manifest icons commonly use `16`, `32`, `48`, `128` sizes.  
Source: https://developer.chrome.com/docs/extensions/develop/ui/icons

---

## Chat / community

### Slack custom emoji

Slack recommends square `128×128` images under **128KB** (supported types include PNG/JPG/GIF).  
Source: https://slack.com/help/articles/206870177-Add-custom-emoji-and-aliases-to-your-workspace

### Discord custom emoji / stickers

Discord upload limits vary by type (emoji vs stickers), and file size caps are strict.  
Source: https://support.discord.com/hc/en-us/articles/1500000580222-Custom-Emojis

---

## Dev platforms & listings

### Vercel Integration logo

Vercel integration logo must be a **non-transparent PNG**, minimum **256×256**.  
Source: https://vercel.com/docs/integrations/create-integration/add-integration-assets

### GitHub social preview (repo)

GitHub social preview image size: **1280×640**.  
Source: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics#social-preview

---

## Docs / knowledge tools

### Notion custom icons

Notion recommends **280×280** for custom icons.  
Source: https://www.notion.so/help/customize-your-content

---

## Design tooling

### Figma widget icon

Figma widget publishing icon size: **128×128**.  
Source: https://help.figma.com/hc/en-us/articles/360039115914-Publish-widgets-to-the-Figma-Community


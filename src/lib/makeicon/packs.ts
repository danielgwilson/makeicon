export type MakeIconPackId =
  | "web_favicon_pwa"
  | "nextjs_app_router"
  | "chrome_extension"
  | "slack_emoji"
  | "discord_emoji"
  | "windows_tiles"
  | "vercel_integration"
  | "notion_icon"
  | "figma_widget"
  | "github_social_preview";

export type PackSelection = Record<MakeIconPackId, boolean>;

export type RasterOutput = {
  kind: "raster";
  path: string;
  width: number;
  height: number;
  format: "png" | "webp";
  fit?: "contain" | "cover";
  paddingRatio?: number;
  background?: string | null;
  warnOverBytes?: number;
};

export type IcoOutput = {
  kind: "ico";
  path: string;
  sizes: number[];
  paddingRatio?: number;
  background?: string | null;
  warnOverBytes?: number;
};

export type TextOutput = { kind: "text"; path: string; content: string };

export type MakeIconOutput = RasterOutput | IcoOutput | TextOutput;

export type MakeIconPackSpec = {
  id: MakeIconPackId;
  name: string;
  summary: string;
  filesSummary: string;
  badges?: string[];
  outputs: MakeIconOutput[];
};

function webManifestTemplate() {
  return JSON.stringify(
    {
      name: "Your App",
      short_name: "App",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#111111",
      icons: [
        {
          src: "/android-chrome-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/android-chrome-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: "/maskable-192x192.png",
          sizes: "192x192",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: "/maskable-512x512.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
      ],
    },
    null,
    2,
  );
}

function nextMetadataSnippet() {
  return `// Next.js App Router (src/app/layout.tsx)
export const metadata = {
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};
`;
}

export const PACKS: Record<MakeIconPackId, MakeIconPackSpec> = {
  web_favicon_pwa: {
    id: "web_favicon_pwa",
    name: "Web (favicon + PWA)",
    summary: "Favicons, Apple touch icon, Android/PWA icons + manifest.",
    filesSummary: "ICO + PNG + webmanifest",
    badges: ["default"],
    outputs: [
      { kind: "ico", path: "favicon.ico", sizes: [16, 32, 48, 64, 128, 256] },
      {
        kind: "raster",
        path: "favicon-16x16.png",
        width: 16,
        height: 16,
        format: "png",
      },
      {
        kind: "raster",
        path: "favicon-32x32.png",
        width: 32,
        height: 32,
        format: "png",
      },
      {
        kind: "raster",
        path: "apple-touch-icon.png",
        width: 180,
        height: 180,
        format: "png",
        paddingRatio: 0.1,
      },
      {
        kind: "raster",
        path: "android-chrome-192x192.png",
        width: 192,
        height: 192,
        format: "png",
        paddingRatio: 0.08,
      },
      {
        kind: "raster",
        path: "android-chrome-512x512.png",
        width: 512,
        height: 512,
        format: "png",
        paddingRatio: 0.08,
      },
      {
        kind: "raster",
        path: "maskable-192x192.png",
        width: 192,
        height: 192,
        format: "png",
        paddingRatio: 0.2,
        background: "#ffffff",
      },
      {
        kind: "raster",
        path: "maskable-512x512.png",
        width: 512,
        height: 512,
        format: "png",
        paddingRatio: 0.2,
        background: "#ffffff",
      },
      {
        kind: "text",
        path: "site.webmanifest",
        content: webManifestTemplate(),
      },
      {
        kind: "text",
        path: "nextjs-metadata-snippet.ts",
        content: nextMetadataSnippet(),
      },
    ],
  },

  nextjs_app_router: {
    id: "nextjs_app_router",
    name: "Next.js (App Router files)",
    summary:
      "Drop-in special files for src/app/: icon.png, apple-icon.png, favicon.ico.",
    filesSummary: "Next.js special files",
    badges: ["drop-in"],
    outputs: [
      {
        kind: "ico",
        path: "src/app/favicon.ico",
        sizes: [16, 32, 48, 64, 128, 256],
      },
      {
        kind: "raster",
        path: "src/app/icon.png",
        width: 512,
        height: 512,
        format: "png",
      },
      {
        kind: "raster",
        path: "src/app/apple-icon.png",
        width: 180,
        height: 180,
        format: "png",
        paddingRatio: 0.1,
      },
    ],
  },

  chrome_extension: {
    id: "chrome_extension",
    name: "Chrome extension",
    summary:
      "Icon sizes commonly required by Chrome extensions + manifest snippet.",
    filesSummary: "16/32/48/128 PNG + snippet",
    badges: ["MV3"],
    outputs: [
      {
        kind: "raster",
        path: "icons/icon-16.png",
        width: 16,
        height: 16,
        format: "png",
      },
      {
        kind: "raster",
        path: "icons/icon-32.png",
        width: 32,
        height: 32,
        format: "png",
      },
      {
        kind: "raster",
        path: "icons/icon-48.png",
        width: 48,
        height: 48,
        format: "png",
      },
      {
        kind: "raster",
        path: "icons/icon-128.png",
        width: 128,
        height: 128,
        format: "png",
      },
      {
        kind: "text",
        path: "manifest-icons-snippet.json",
        content: JSON.stringify(
          {
            icons: {
              "16": "icons/icon-16.png",
              "32": "icons/icon-32.png",
              "48": "icons/icon-48.png",
              "128": "icons/icon-128.png",
            },
          },
          null,
          2,
        ),
      },
    ],
  },

  slack_emoji: {
    id: "slack_emoji",
    name: "Slack emoji",
    summary: "Static emoji exports (Slack recommends 128×128 under 128KB).",
    filesSummary: "128 PNG + naming note",
    badges: ["tiny"],
    outputs: [
      {
        kind: "raster",
        path: "slack/emoji-128.png",
        width: 128,
        height: 128,
        format: "png",
        warnOverBytes: 128 * 1024,
      },
      {
        kind: "text",
        path: "slack/README.txt",
        content: "Slack custom emoji: keep it square, 128×128, and <128KB.\n",
      },
    ],
  },

  discord_emoji: {
    id: "discord_emoji",
    name: "Discord emoji",
    summary:
      "Static emoji exports (typically 128×128; Discord file limit is tight).",
    filesSummary: "128 PNG + naming note",
    badges: ["tiny"],
    outputs: [
      {
        kind: "raster",
        path: "discord/emoji-128.png",
        width: 128,
        height: 128,
        format: "png",
        warnOverBytes: 256 * 1024,
      },
      {
        kind: "text",
        path: "discord/README.txt",
        content:
          "Discord custom emoji: keep it square, 128×128, and under the per-emoji file-size limit.\n",
      },
    ],
  },

  windows_tiles: {
    id: "windows_tiles",
    name: "Windows (PWA tiles)",
    summary:
      "Tile images commonly referenced by Windows PWA manifest fields + browserconfig.",
    filesSummary: "Square + wide tiles (PNG)",
    badges: ["PWA"],
    outputs: [
      {
        kind: "raster",
        path: "windows/Square44x44Logo.png",
        width: 44,
        height: 44,
        format: "png",
      },
      {
        kind: "raster",
        path: "windows/Square71x71Logo.png",
        width: 71,
        height: 71,
        format: "png",
      },
      {
        kind: "raster",
        path: "windows/Square150x150Logo.png",
        width: 150,
        height: 150,
        format: "png",
      },
      {
        kind: "raster",
        path: "windows/Square310x310Logo.png",
        width: 310,
        height: 310,
        format: "png",
      },
      {
        kind: "raster",
        path: "windows/Wide310x150Logo.png",
        width: 310,
        height: 150,
        format: "png",
        fit: "cover",
        paddingRatio: 0,
      },
      {
        kind: "text",
        path: "windows/browserconfig.xml",
        content:
          `<?xml version="1.0" encoding="utf-8"?>\n` +
          `<browserconfig>\n` +
          `  <msapplication>\n` +
          `    <tile>\n` +
          `      <square70x70logo src="/windows/Square71x71Logo.png"/>\n` +
          `      <square150x150logo src="/windows/Square150x150Logo.png"/>\n` +
          `      <wide310x150logo src="/windows/Wide310x150Logo.png"/>\n` +
          `      <square310x310logo src="/windows/Square310x310Logo.png"/>\n` +
          `      <TileColor>#ffffff</TileColor>\n` +
          `    </tile>\n` +
          `  </msapplication>\n` +
          `</browserconfig>\n`,
      },
    ],
  },

  vercel_integration: {
    id: "vercel_integration",
    name: "Vercel Integration logo",
    summary:
      "Non-transparent PNG logo for Marketplace integrations (minimum 256×256).",
    filesSummary: "512 PNG (opaque)",
    badges: ["Marketplace"],
    outputs: [
      {
        kind: "raster",
        path: "vercel/integration-logo-512.png",
        width: 512,
        height: 512,
        format: "png",
        background: "#ffffff",
        paddingRatio: 0.1,
      },
    ],
  },

  notion_icon: {
    id: "notion_icon",
    name: "Notion page icon",
    summary: "Notion recommends 280×280 for custom icons.",
    filesSummary: "280 PNG",
    badges: ["docs"],
    outputs: [
      {
        kind: "raster",
        path: "notion/icon-280.png",
        width: 280,
        height: 280,
        format: "png",
        paddingRatio: 0.08,
      },
    ],
  },

  figma_widget: {
    id: "figma_widget",
    name: "Figma widget icon",
    summary: "Widget icon size for publishing.",
    filesSummary: "128 PNG",
    badges: ["design"],
    outputs: [
      {
        kind: "raster",
        path: "figma/widget-icon-128.png",
        width: 128,
        height: 128,
        format: "png",
        paddingRatio: 0.08,
      },
    ],
  },

  github_social_preview: {
    id: "github_social_preview",
    name: "GitHub social preview",
    summary: "Social preview (Open Graph) for a repo: 1280×640.",
    filesSummary: "1280×640 PNG",
    badges: ["OG"],
    outputs: [
      {
        kind: "raster",
        path: "github/social-preview-1280x640.png",
        width: 1280,
        height: 640,
        format: "png",
        fit: "cover",
        background: "#ffffff",
        paddingRatio: 0,
      },
    ],
  },
};

export const DEFAULT_PACKS: PackSelection = {
  web_favicon_pwa: true,
  nextjs_app_router: false,
  chrome_extension: false,
  slack_emoji: false,
  discord_emoji: false,
  windows_tiles: false,
  vercel_integration: false,
  notion_icon: false,
  figma_widget: false,
  github_social_preview: false,
};

export type MakeIconPackId =
  | "web_favicon_pwa"
  | "nextjs_app_router"
  | "chrome_extension"
  | "slack_emoji"
  | "discord_emoji";

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
};

export type IcoOutput = {
  kind: "ico";
  path: string;
  sizes: number[];
  paddingRatio?: number;
  background?: string | null;
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
      },
      {
        kind: "text",
        path: "discord/README.txt",
        content:
          "Discord custom emoji: keep it square, 128×128, and under the per-emoji file-size limit.\n",
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
};

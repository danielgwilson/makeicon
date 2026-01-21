export type MakeIconPackId =
  | "web_favicon_pwa"
  | "nextjs_app_router"
  | "chrome_extension"
  | "slack_emoji"
  | "discord_emoji"
  | "firefox_addon"
  | "vscode_extension"
  | "ios_app_iconset"
  | "android_app_icons"
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
  category:
    | "Web"
    | "Frameworks"
    | "Extensions"
    | "Chat"
    | "Native"
    | "Dev Platforms"
    | "Docs"
    | "Design";
  name: string;
  summary: string;
  filesSummary: string;
  badges?: string[];
  keywords?: string[];
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
    category: "Web",
    name: "Web (favicon + PWA)",
    summary: "Favicons, Apple touch icon, Android/PWA icons + manifest.",
    filesSummary: "ICO + PNG + webmanifest",
    badges: ["default"],
    keywords: [
      "favicon",
      "pwa",
      "manifest",
      "maskable",
      "apple",
      "android",
      "ico",
    ],
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
    category: "Frameworks",
    name: "Next.js (App Router files)",
    summary:
      "Drop-in special files for src/app/: icon.png, apple-icon.png, favicon.ico.",
    filesSummary: "Next.js special files",
    badges: ["drop-in"],
    keywords: ["next", "nextjs", "vercel", "app router", "src/app"],
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
    category: "Extensions",
    name: "Chrome extension",
    summary:
      "Icon sizes commonly required by Chrome extensions + manifest snippet.",
    filesSummary: "16/32/48/128 PNG + snippet",
    badges: ["MV3"],
    keywords: ["chrome", "extension", "manifest"],
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
    category: "Chat",
    name: "Slack emoji",
    summary: "Static emoji exports (Slack recommends 128×128 under 128KB).",
    filesSummary: "128 PNG + naming note",
    badges: ["tiny"],
    keywords: ["slack", "emoji"],
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
    category: "Chat",
    name: "Discord emoji",
    summary:
      "Static emoji exports (typically 128×128; Discord file limit is tight).",
    filesSummary: "128 PNG + naming note",
    badges: ["tiny"],
    keywords: ["discord", "emoji"],
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

  firefox_addon: {
    id: "firefox_addon",
    category: "Extensions",
    name: "Firefox add-on",
    summary: "Firefox extension icons + manifest snippet.",
    filesSummary: "48/96 PNG + snippet",
    badges: ["WebExtension"],
    keywords: ["firefox", "addon", "extension", "manifest"],
    outputs: [
      {
        kind: "raster",
        path: "firefox/icon-48.png",
        width: 48,
        height: 48,
        format: "png",
      },
      {
        kind: "raster",
        path: "firefox/icon-96.png",
        width: 96,
        height: 96,
        format: "png",
      },
      {
        kind: "text",
        path: "firefox/manifest-icons-snippet.json",
        content: JSON.stringify(
          {
            icons: {
              "48": "firefox/icon-48.png",
              "96": "firefox/icon-96.png",
            },
          },
          null,
          2,
        ),
      },
    ],
  },

  vscode_extension: {
    id: "vscode_extension",
    category: "Dev Platforms",
    name: "VS Code extension",
    summary: "Marketplace icon (128×128) + manifest snippet.",
    filesSummary: "128 PNG + snippet",
    badges: ["Marketplace"],
    keywords: ["vscode", "extension", "marketplace"],
    outputs: [
      {
        kind: "raster",
        path: "vscode/icon-128.png",
        width: 128,
        height: 128,
        format: "png",
      },
      {
        kind: "text",
        path: "vscode/package-json-snippet.json",
        content: JSON.stringify(
          {
            icon: "vscode/icon-128.png",
          },
          null,
          2,
        ),
      },
    ],
  },

  ios_app_iconset: {
    id: "ios_app_iconset",
    category: "Native",
    name: "iOS AppIcon.appiconset",
    summary: "Drop-in Xcode AppIcon.appiconset (iPhone + iPad + App Store).",
    filesSummary: "PNG set + Contents.json",
    badges: ["Xcode"],
    keywords: ["ios", "xcode", "appicon", "app store", "assets"],
    outputs: buildIosAppIconsetOutputs(),
  },

  android_app_icons: {
    id: "android_app_icons",
    category: "Native",
    name: "Android launcher icons (legacy + Play Store)",
    summary: "Mipmap icons + Play Store 512px (single-image workflow).",
    filesSummary: "mipmap-* + 512",
    badges: ["Android"],
    keywords: ["android", "play store", "mipmap", "launcher"],
    outputs: [
      {
        kind: "raster",
        path: "android/playstore-512.png",
        width: 512,
        height: 512,
        format: "png",
        paddingRatio: 0.08,
      },
      ...androidMipmap("mipmap-mdpi", 48),
      ...androidMipmap("mipmap-hdpi", 72),
      ...androidMipmap("mipmap-xhdpi", 96),
      ...androidMipmap("mipmap-xxhdpi", 144),
      ...androidMipmap("mipmap-xxxhdpi", 192),
      {
        kind: "text",
        path: "android/README.txt",
        content:
          "These are legacy launcher icons derived from a single image. Modern adaptive icons usually require separate foreground/background layers.\n",
      },
    ],
  },

  windows_tiles: {
    id: "windows_tiles",
    category: "Web",
    name: "Windows (PWA tiles)",
    summary:
      "Tile images commonly referenced by Windows PWA manifest fields + browserconfig.",
    filesSummary: "Square + wide tiles (PNG)",
    badges: ["PWA"],
    keywords: ["windows", "tile", "pwa", "browserconfig"],
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
    category: "Dev Platforms",
    name: "Vercel Integration logo",
    summary:
      "Non-transparent PNG logo for Marketplace integrations (minimum 256×256).",
    filesSummary: "512 PNG (opaque)",
    badges: ["Marketplace"],
    keywords: ["vercel", "integration", "marketplace", "logo"],
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
    category: "Docs",
    name: "Notion page icon",
    summary: "Notion recommends 280×280 for custom icons.",
    filesSummary: "280 PNG",
    badges: ["docs"],
    keywords: ["notion", "icon"],
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
    category: "Design",
    name: "Figma widget icon",
    summary: "Widget icon size for publishing.",
    filesSummary: "128 PNG",
    badges: ["design"],
    keywords: ["figma", "widget", "community"],
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
    category: "Dev Platforms",
    name: "GitHub social preview",
    summary: "Social preview (Open Graph) for a repo: 1280×640.",
    filesSummary: "1280×640 PNG",
    badges: ["OG"],
    keywords: ["github", "open graph", "social", "og"],
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
  firefox_addon: false,
  vscode_extension: false,
  ios_app_iconset: false,
  android_app_icons: false,
  windows_tiles: false,
  vercel_integration: false,
  notion_icon: false,
  figma_widget: false,
  github_social_preview: false,
};

function androidMipmap(dir: string, size: number): RasterOutput[] {
  return [
    {
      kind: "raster",
      path: `android/${dir}/ic_launcher.png`,
      width: size,
      height: size,
      format: "png",
      paddingRatio: 0.08,
    },
    {
      kind: "raster",
      path: `android/${dir}/ic_launcher_round.png`,
      width: size,
      height: size,
      format: "png",
      paddingRatio: 0.14,
    },
  ];
}

function buildIosAppIconsetOutputs(): MakeIconOutput[] {
  type Entry = {
    idiom: "iphone" | "ipad" | "ios-marketing";
    size: string;
    scale: "1x" | "2x" | "3x";
    px: number;
    filename: string;
  };

  const entries: Entry[] = [
    {
      idiom: "iphone",
      size: "20x20",
      scale: "2x",
      px: 40,
      filename: "icon-20@2x.png",
    },
    {
      idiom: "iphone",
      size: "20x20",
      scale: "3x",
      px: 60,
      filename: "icon-20@3x.png",
    },
    {
      idiom: "iphone",
      size: "29x29",
      scale: "2x",
      px: 58,
      filename: "icon-29@2x.png",
    },
    {
      idiom: "iphone",
      size: "29x29",
      scale: "3x",
      px: 87,
      filename: "icon-29@3x.png",
    },
    {
      idiom: "iphone",
      size: "40x40",
      scale: "2x",
      px: 80,
      filename: "icon-40@2x.png",
    },
    {
      idiom: "iphone",
      size: "40x40",
      scale: "3x",
      px: 120,
      filename: "icon-40@3x.png",
    },
    {
      idiom: "iphone",
      size: "60x60",
      scale: "2x",
      px: 120,
      filename: "icon-60@2x.png",
    },
    {
      idiom: "iphone",
      size: "60x60",
      scale: "3x",
      px: 180,
      filename: "icon-60@3x.png",
    },

    {
      idiom: "ipad",
      size: "20x20",
      scale: "1x",
      px: 20,
      filename: "icon-20@1x.png",
    },
    {
      idiom: "ipad",
      size: "20x20",
      scale: "2x",
      px: 40,
      filename: "icon-20@2x-ipad.png",
    },
    {
      idiom: "ipad",
      size: "29x29",
      scale: "1x",
      px: 29,
      filename: "icon-29@1x.png",
    },
    {
      idiom: "ipad",
      size: "29x29",
      scale: "2x",
      px: 58,
      filename: "icon-29@2x-ipad.png",
    },
    {
      idiom: "ipad",
      size: "40x40",
      scale: "1x",
      px: 40,
      filename: "icon-40@1x.png",
    },
    {
      idiom: "ipad",
      size: "40x40",
      scale: "2x",
      px: 80,
      filename: "icon-40@2x-ipad.png",
    },
    {
      idiom: "ipad",
      size: "76x76",
      scale: "1x",
      px: 76,
      filename: "icon-76@1x.png",
    },
    {
      idiom: "ipad",
      size: "76x76",
      scale: "2x",
      px: 152,
      filename: "icon-76@2x.png",
    },
    {
      idiom: "ipad",
      size: "83.5x83.5",
      scale: "2x",
      px: 167,
      filename: "icon-83.5@2x.png",
    },

    {
      idiom: "ios-marketing",
      size: "1024x1024",
      scale: "1x",
      px: 1024,
      filename: "icon-1024.png",
    },
  ];

  const images = entries.map((e) => ({
    idiom: e.idiom,
    size: e.size,
    scale: e.scale,
    filename: e.filename,
  }));

  const contents = JSON.stringify(
    {
      images,
      info: { version: 1, author: "makeicon.dev" },
    },
    null,
    2,
  );

  const outputs: MakeIconOutput[] = entries.map((e) => ({
    kind: "raster",
    path: `ios/AppIcon.appiconset/${e.filename}`,
    width: e.px,
    height: e.px,
    format: "png",
    paddingRatio: 0.08,
  }));

  outputs.push({
    kind: "text",
    path: "ios/AppIcon.appiconset/Contents.json",
    content: contents,
  });

  outputs.push({
    kind: "text",
    path: "ios/README.txt",
    content:
      "Drop the AppIcon.appiconset folder into your Xcode asset catalog (Assets.xcassets). If your source image is smaller than 1024px, you may be upscaling.\n",
  });

  return outputs;
}

import type { MakeIconPackId } from "@/lib/makeicon/packs";

export type PackSource = {
  label: string;
  href: string;
};

export type PackPage = {
  slug: string;
  title: string;
  description: string;
  packIds: MakeIconPackId[];
  sources: PackSource[];
};

export const PACK_PAGES: PackPage[] = [
  {
    slug: "favicon-pwa",
    title: "Favicon + PWA icons",
    description:
      "Generate a deploy-ready favicon + PWA icon set: ICO, PNGs, maskable variants, and a web manifest starter.",
    packIds: ["web_favicon_pwa"],
    sources: [
      {
        label: "web.dev — Maskable icons",
        href: "https://web.dev/maskable-icon/",
      },
      {
        label: "W3C — Web App Manifest",
        href: "https://www.w3.org/TR/appmanifest/",
      },
      {
        label: "MDN — Manifest icons",
        href: "https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/icons",
      },
      {
        label: "Google Search Central — Favicons",
        href: "https://developers.google.com/search/docs/appearance/favicon-in-search",
      },
    ],
  },
  {
    slug: "nextjs-app-router-icons",
    title: "Next.js App Router icons (drop-in files)",
    description:
      "Generate the exact icon files Next.js expects under src/app/ (icon.png, apple-icon.png, favicon.ico).",
    packIds: ["nextjs_app_router"],
    sources: [
      {
        label: "Next.js — App icons (file conventions)",
        href: "https://nextjs.org/docs/app/api-reference/file-conventions/metadata/app-icons",
      },
    ],
  },
  {
    slug: "chrome-extension-icons",
    title: "Chrome extension icons (MV3)",
    description:
      "Generate common Chrome extension icon sizes (16/32/48/128) with clean filenames and a manifest snippet.",
    packIds: ["chrome_extension"],
    sources: [
      {
        label: "Chrome Extensions — Icons",
        href: "https://developer.chrome.com/docs/extensions/develop/ui/configure-icons",
      },
    ],
  },
  {
    slug: "slack-emoji",
    title: "Slack emoji (size + file cap aware)",
    description:
      "Generate Slack-ready emoji assets while respecting tight size and file constraints.",
    packIds: ["slack_emoji"],
    sources: [
      {
        label: "Slack — Add custom emoji",
        href: "https://slack.com/help/articles/206870177-Add-customised-emoji-and-aliases-to-your-workspace",
      },
    ],
  },
  {
    slug: "discord-emoji",
    title: "Discord custom emoji",
    description:
      "Generate Discord-ready emoji assets sized for uploads (and optionally iterate for file size).",
    packIds: ["discord_emoji"],
    sources: [
      {
        label: "Discord — Beginner’s guide to custom emojis",
        href: "https://discord.com/blog/beginners-guide-to-custom-emojis",
      },
    ],
  },
  {
    slug: "vercel-integration-logo",
    title: "Vercel integration logo",
    description:
      "Generate the required integration logo asset(s) with correct format constraints.",
    packIds: ["vercel_integration"],
    sources: [
      {
        label: "Vercel — Integration assets",
        href: "https://vercel.com/docs/integrations/create-integration/add-integration-assets",
      },
    ],
  },
  {
    slug: "github-social-preview",
    title: "GitHub social preview image",
    description:
      "Generate the recommended 1280×640 social preview image for your GitHub repo.",
    packIds: ["github_social_preview"],
    sources: [
      {
        label: "GitHub Docs — Social media preview",
        href: "https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview",
      },
    ],
  },
];

export function getPackPage(slug: string): PackPage | null {
  return PACK_PAGES.find((p) => p.slug === slug) ?? null;
}

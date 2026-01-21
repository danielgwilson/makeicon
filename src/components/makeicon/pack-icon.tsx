"use client";

import {
  IconApps,
  IconBrandAndroid,
  IconBrandApple,
  IconBrandChrome,
  IconBrandDiscord,
  IconBrandFigma,
  IconBrandFirefox,
  IconBrandGithub,
  IconBrandNextjs,
  IconBrandNotion,
  IconBrandSlack,
  IconBrandVercel,
  IconBrandVscode,
  IconBrandWindows,
  IconWorld,
} from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import type { MakeIconPackId } from "@/lib/makeicon/packs";

type TablerIcon = (
  props: ComponentProps<"svg"> & { size?: number },
) => ReactNode;

const PACK_ICON: Record<MakeIconPackId, TablerIcon> = {
  web_favicon_pwa: IconWorld,
  nextjs_app_router: IconBrandNextjs,
  chrome_extension: IconBrandChrome,
  firefox_addon: IconBrandFirefox,
  vscode_extension: IconBrandVscode,

  slack_emoji: IconBrandSlack,
  discord_emoji: IconBrandDiscord,

  ios_app_iconset: IconBrandApple,
  android_app_icons: IconBrandAndroid,
  windows_tiles: IconBrandWindows,

  vercel_integration: IconBrandVercel,
  github_social_preview: IconBrandGithub,

  notion_icon: IconBrandNotion,
  figma_widget: IconBrandFigma,
};

export function PackIcon({
  packId,
  className,
}: {
  packId: MakeIconPackId;
  className?: string;
}) {
  const Icon = PACK_ICON[packId] ?? IconApps;
  return <Icon className={className} size={18} />;
}

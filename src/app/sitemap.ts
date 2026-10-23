import type { MetadataRoute } from "next";
import { portfolio } from "@/lib/data";
import { appUrl } from "@/lib/env";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (process.env.VERCEL_ENV === "preview") return [];
  const { entries, demo } = await portfolio();
  return [
    { url: appUrl() },
    ...entries
      .filter((e) => e.kind === "projects" && !e.demo && !demo)
      .map((e) => ({ url: `${appUrl()}/projects/${e.slug}` })),
  ];
}

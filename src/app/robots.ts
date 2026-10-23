import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
export default function robots(): MetadataRoute.Robots {
  return {
    rules:
      process.env.VERCEL_ENV === "preview"
        ? { userAgent: "*", disallow: "/" }
        : {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/api/", "/*?preview="],
          },
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}

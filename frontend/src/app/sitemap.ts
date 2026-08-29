import type { MetadataRoute } from "next";
import { PUBLIC_ROUTES, absoluteUrl } from "@/lib/site";

/**
 * Served at /sitemap.xml.
 *
 * Only public routes are listed. Learner portfolios (/u/[handle]) are
 * deliberately excluded: enumerating them needs a backend call that would make
 * sitemap generation fail whenever the API is cold, and they are already
 * reachable as links from the pages that matter.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

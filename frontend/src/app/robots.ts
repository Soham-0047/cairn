import type { MetadataRoute } from "next";
import { NOINDEX_PATHS, SITE_URL, absoluteUrl } from "@/lib/site";

/**
 * Served at /robots.txt.
 *
 * Authenticated app surfaces are disallowed — they render a login redirect to
 * a crawler, so indexing them only dilutes the site with near-empty pages.
 * AI answer-engine crawlers are allowed explicitly: being cited by them is the
 * same discovery win as ranking, and `llms.txt` is advertised for the ones
 * that look for it.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = NOINDEX_PATHS.map((p) => `${p}/`);

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // Answer engines and model crawlers — opted in deliberately.
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "PerplexityBot", "Google-Extended", "Applebot-Extended", "CCBot"],
        allow: "/",
        disallow,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_URL,
  };
}

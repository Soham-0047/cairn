import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION_SHORT, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

/** Served at /manifest.webmanifest and auto-linked by Next. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION_SHORT,
    start_url: "/",
    display: "standalone",
    background_color: "#0e1019",
    theme_color: "#0e1019",
    categories: ["education", "productivity", "developer"],
    icons: [
      { src: "/logo.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}

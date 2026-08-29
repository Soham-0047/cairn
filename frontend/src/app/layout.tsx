import "./globals.css";
import type { Metadata, Viewport } from "next";
import { getSiteConfig } from "@/lib/config";
import { Providers } from "@/components/Providers";
import { ToastProvider } from "@/components/ui/primitives";
import { SiteJsonLd } from "@/components/JsonLd";
import {
  SITE_DESCRIPTION,
  SITE_DESCRIPTION_SHORT,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  TWITTER_HANDLE,
} from "@/lib/site";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1019" },
  ],
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();

  // Brand copy is admin-editable, but SEO must not break when the backend is
  // asleep — every field falls back to the static constants in lib/site.
  const title = cfg.seo.title || SITE_TITLE;
  const description = cfg.seo.description || SITE_DESCRIPTION;
  const brand = cfg.brand.name || SITE_NAME;

  return {
    // Resolves every relative URL below (and in child routes) against the
    // canonical origin — without this, OG images and canonicals leak the
    // deploy-preview hostname.
    metadataBase: new URL(SITE_URL),
    title: {
      default: title,
      // Child routes set only their own title; the brand suffix is appended here.
      template: `%s — ${brand}`,
    },
    description,
    applicationName: brand,
    keywords: SITE_KEYWORDS,
    authors: [{ name: "Soham Roy", url: "https://github.com/Soham-0047" }],
    creator: "Soham Roy",
    publisher: brand,
    category: "education",
    alternates: { canonical: "/" },
    // Only set explicitly when an admin has uploaded a custom favicon —
    // otherwise `app/icon.svg` and `app/apple-icon.tsx` are picked up by
    // Next's file conventions and injected automatically.
    ...(cfg.brand.faviconUrl ? { icons: { icon: cfg.brand.faviconUrl } } : {}),
    openGraph: {
      type: "website",
      url: SITE_URL,
      siteName: brand,
      title,
      description: cfg.seo.description || SITE_DESCRIPTION_SHORT,
      locale: "en_US",
      images: cfg.seo.ogImageUrl ? [cfg.seo.ogImageUrl] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: cfg.seo.description || SITE_DESCRIPTION_SHORT,
      site: TWITTER_HANDLE,
      creator: TWITTER_HANDLE,
      images: cfg.seo.ogImageUrl ? [cfg.seo.ogImageUrl] : undefined,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    // Paste the verification token from Google Search Console into
    // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION; omitted entirely when unset.
    verification: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
      ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('cairn:theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}`,
          }}
        />
        <SiteJsonLd />
      </head>
      <body>
        <Providers>
          <ToastProvider>
            <main>{children}</main>
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}

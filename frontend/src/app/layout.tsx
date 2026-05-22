import "./globals.css";
import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/config";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GuestBanner } from "@/components/GuestBanner";

export async function generateMetadata(): Promise<Metadata> {
  const cfg = await getSiteConfig();
  return {
    title: cfg.seo.title || cfg.brand.name,
    description: cfg.seo.description,
    icons: { icon: cfg.brand.faviconUrl || "/favicon.ico" },
    openGraph: {
      title: cfg.seo.title,
      description: cfg.seo.description,
      images: cfg.seo.ogImageUrl ? [cfg.seo.ogImageUrl] : undefined,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = await getSiteConfig();
  return (
    <html lang="en">
      <head>
        <style>{`:root { --brand-primary: ${cfg.brand.primaryColor}; --brand-accent: ${cfg.brand.accentColor}; }`}</style>
      </head>
      <body>
        <Providers>
          <Header config={cfg} />
          <GuestBanner bannerText={cfg.guestMode?.bannerText} />
          <main className="min-h-[calc(100vh-8rem)]">{children}</main>
          <Footer config={cfg} />
        </Providers>
      </body>
    </html>
  );
}

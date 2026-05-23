import "./globals.css";
import type { Metadata } from "next";
import { getSiteConfig } from "@/lib/config";
import { Providers } from "@/components/Providers";
import { ToastProvider } from "@/components/ui/primitives";

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

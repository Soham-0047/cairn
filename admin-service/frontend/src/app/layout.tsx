import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/lib/session";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = {
  title: "Admin Service",
  description: "Centralized API credentials, config, and resources.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <TopBar />
          <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}

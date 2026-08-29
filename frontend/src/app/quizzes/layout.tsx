import type { Metadata } from "next";

/**
 * Authenticated surface — kept out of search results. robots.txt already
 * disallows crawling here; this meta tag covers the case where the URL is
 * discovered through an inbound link and indexed without being fetched.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

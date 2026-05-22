/**
 * Site config fetcher. Pulled from the backend on every server render so the
 * admin panel changes propagate instantly without a frontend redeploy.
 *
 * Cached for 30 seconds with Next.js fetch revalidation — gives admin
 * changes a near-instant visible effect without hammering the backend.
 */

import { backendUrl } from "./api";

export type SiteConfig = {
  brand: {
    name: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    accentColor: string;
  };
  copy: {
    heroTitle: string;
    heroSubtitle: string;
    heroCtaPrimary: string;
    heroCtaSecondary: string;
    footerNote: string;
    poweredByLabel: string;
  };
  strings: Record<string, string>;
  features: {
    multimodalEval: boolean;
    adaptiveQuiz: boolean;
    coachNudges: boolean;
    jobFeed: boolean;
    showAttribution: boolean;
  };
  seo: { title: string; description: string; ogImageUrl: string };
  guestMode?: {
    enabled: boolean;
    maxPathsPerGuest: number;
    maxEvalsPerGuest: number;
    allowScreenshots: boolean;
    sessionHours: number;
    bannerText: string;
  };
};

const FALLBACK: SiteConfig = {
  brand: {
    name: "Cairn",
    tagline: "Your AI learning + career engine",
    logoUrl: "/logo.svg",
    faviconUrl: "/favicon.ico",
    primaryColor: "#0f766e",
    accentColor: "#f59e0b",
  },
  copy: {
    heroTitle: "Your AI-built path from where you are to where you want to be.",
    heroSubtitle:
      "Cairn turns the internet's chaos of free tutorials into a 90-day path that adapts to your starting point, verifies your projects, and builds a recruiter-ready portfolio.",
    heroCtaPrimary: "Start your path",
    heroCtaSecondary: "See an example portfolio",
    footerNote: "Built for the Gemma 4 Challenge — May 2026.",
    poweredByLabel: "Powered by Gemma 4",
  },
  strings: {},
  features: {
    multimodalEval: true,
    adaptiveQuiz: true,
    coachNudges: false,
    jobFeed: false,
    showAttribution: true,
  },
  seo: {
    title: "Cairn — AI-personalized learning paths",
    description: "Personalized 90-day learning paths verified by AI.",
    ogImageUrl: "",
  },
  guestMode: {
    enabled: true,
    maxPathsPerGuest: 1,
    maxEvalsPerGuest: 2,
    allowScreenshots: true,
    sessionHours: 24,
    bannerText:
      "You're trying Cairn as a guest. Sign in with GitHub to save your progress and earn verified credentials.",
  },
};

export async function getSiteConfig(): Promise<SiteConfig> {
  try {
    const res = await fetch(`${backendUrl()}/api/config`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return FALLBACK;
    const data = await res.json();
    return {
      ...FALLBACK,
      ...data,
      brand: { ...FALLBACK.brand, ...data.brand },
      copy: { ...FALLBACK.copy, ...data.copy },
      features: { ...FALLBACK.features, ...data.features },
      seo: { ...FALLBACK.seo, ...data.seo },
      strings: data.strings || {},
      guestMode: { ...FALLBACK.guestMode!, ...(data.guestMode || {}) },
    };
  } catch {
    return FALLBACK;
  }
}

export function s(strings: Record<string, string>, key: string, fallback: string): string {
  return strings[key] ?? fallback;
}

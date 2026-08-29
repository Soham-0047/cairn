import { notFound } from "next/navigation";
import { backendUrl } from "@/lib/api";
import { getSiteConfig } from "@/lib/config";
import { SITE_NAME } from "@/lib/site";
import type { Metadata } from "next";
import { PortfolioView, type PortfolioData } from "@/components/ui/PortfolioView";
import { BreadcrumbJsonLd, PortfolioJsonLd } from "@/components/JsonLd";

type RawPortfolio = {
  profile: {
    handle: string;
    name: string;
    avatarUrl: string;
    githubUsername: string;
    targetRole: string;
    background: string;
    streak: number;
  };
  activePath: PortfolioData["activePath"];
  credentials: PortfolioData["credentials"];
  projects: {
    id: string;
    title: string;
    repoUrl: string;
    score: number;
    strengths: string[];
    skills: string[];
    modelsUsed: { stage: string; provider: string; model: string }[];
    evaluatedAt: string;
  }[];
};

async function fetchPortfolio(handle: string): Promise<RawPortfolio | null> {
  const res = await fetch(`${backendUrl()}/api/portfolio/${handle}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const [data, cfg] = await Promise.all([fetchPortfolio(handle), getSiteConfig()]);
  // A missing portfolio renders the 404 below. Keep it out of the index so a
  // deleted or mistyped handle can't accumulate crawl budget.
  if (!data) return { title: "Not found", robots: { index: false, follow: false } };

  const name = data.profile.name || handle;
  const brand = cfg.brand.name || SITE_NAME;
  const skills = [...new Set(data.projects.flatMap((p) => p.skills))].slice(0, 8);

  const title = `${name} — Verified ${data.profile.targetRole || "developer"} portfolio`;
  const description = [
    data.profile.targetRole ? `${name} is becoming a ${data.profile.targetRole}.` : `Public portfolio of ${name}.`,
    `${data.credentials.length} AI-verified credential${data.credentials.length === 1 ? "" : "s"}`,
    `across ${data.projects.length} shipped project${data.projects.length === 1 ? "" : "s"}.`,
    skills.length ? `Skills: ${skills.join(", ")}.` : "",
    `Verified on ${brand}.`,
  ]
    .filter(Boolean)
    .join(" ");

  const url = `/u/${handle}`;
  return {
    title,
    description,
    keywords: skills.length ? [...skills, `${name} portfolio`, "verified developer portfolio"] : undefined,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      title,
      description,
      images: data.profile.avatarUrl ? [data.profile.avatarUrl] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const raw = await fetchPortfolio(handle);
  if (!raw) notFound();
  const data: PortfolioData = {
    profile: {
      handle: raw.profile.handle,
      name: raw.profile.name || handle,
      avatarUrl: raw.profile.avatarUrl,
      githubUsername: raw.profile.githubUsername,
      targetRole: raw.profile.targetRole,
      background: raw.profile.background,
    },
    activePath: raw.activePath,
    credentials: raw.credentials,
    projects: raw.projects.map((p) => ({
      id: p.id,
      title: p.title,
      repoUrl: p.repoUrl,
      score: p.score,
      strengths: p.strengths,
      skills: p.skills,
      models: p.modelsUsed,
      evaluatedAt: p.evaluatedAt,
    })),
  };
  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: `${data.profile.name} portfolio`, path: `/u/${handle}` },
        ]}
      />
      <PortfolioJsonLd
        name={data.profile.name}
        handle={data.profile.handle || handle}
        targetRole={data.profile.targetRole}
        avatarUrl={data.profile.avatarUrl}
        githubUsername={data.profile.githubUsername}
        credentials={raw.credentials.map((c) => ({ name: c.title, issuedAt: c.issuedAt }))}
      />
      <PortfolioView data={data} />
    </>
  );
}

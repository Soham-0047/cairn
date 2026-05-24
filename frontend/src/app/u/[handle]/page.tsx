import { notFound } from "next/navigation";
import { backendUrl } from "@/lib/api";
import { getSiteConfig } from "@/lib/config";
import type { Metadata } from "next";
import { PortfolioView, type PortfolioData } from "@/components/ui/PortfolioView";

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
    next: { revalidate: 60 },
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
  if (!data) return { title: "Not found" };
  const title = `${data.profile.name || handle} — Verified on ${cfg.brand.name}`;
  const description = data.profile.targetRole
    ? `${data.profile.name || handle} is becoming a ${data.profile.targetRole}. ${data.credentials.length} verified credentials.`
    : `Public portfolio of ${data.profile.name || handle}.`;
  return {
    title,
    description,
    openGraph: { title, description },
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
  return <PortfolioView data={data} />;
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, Cpu, Github, ShieldCheck } from "lucide-react";
import { backendUrl } from "@/lib/api";
import { getSiteConfig } from "@/lib/config";
import type { Metadata } from "next";

type Portfolio = {
  profile: {
    handle: string;
    name: string;
    avatarUrl: string;
    githubUsername: string;
    targetRole: string;
    background: string;
    streak: number;
  };
  activePath: {
    targetRole: string;
    summary: string;
    phaseCount: number;
    completedMilestones: number;
    totalMilestones: number;
    generatedBy?: { provider: string; model: string };
  } | null;
  credentials: {
    id: string;
    type: "project" | "quiz_mastery" | "milestone";
    title: string;
    skills: string[];
    issuedAt: string;
    signature: string;
    evidence: { repoUrl: string; score: number };
  }[];
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

async function fetchPortfolio(handle: string): Promise<Portfolio | null> {
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
  const data = await fetchPortfolio(handle);
  if (!data) notFound();
  const cfg = await getSiteConfig();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        {data.profile.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.profile.avatarUrl}
            alt={data.profile.name}
            className="h-20 w-20 rounded-full border border-zinc-200"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-2xl font-semibold text-zinc-600">
            {(data.profile.name || handle)[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{data.profile.name || handle}</h1>
          <p className="mt-1 text-zinc-600">
            {data.profile.targetRole ? `Becoming a ${data.profile.targetRole}` : "Building skills."}
          </p>
          {data.profile.background ? (
            <p className="mt-1 text-sm text-zinc-500">{data.profile.background}</p>
          ) : null}
          {data.profile.githubUsername ? (
            <a
              href={`https://github.com/${data.profile.githubUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
            >
              <Github className="h-4 w-4" /> @{data.profile.githubUsername}
            </a>
          ) : null}
        </div>
        <div className="flex items-center gap-2 self-start">
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: cfg.brand.primaryColor }}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Verified on {cfg.brand.name}
          </span>
        </div>
      </div>

      {data.activePath ? (
        <section className="mt-10 card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Current path</h2>
          <h3 className="mt-2 text-xl font-semibold text-zinc-900">{data.activePath.targetRole}</h3>
          <p className="mt-1 text-zinc-600">{data.activePath.summary}</p>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
            <span>
              {data.activePath.completedMilestones} / {data.activePath.totalMilestones} milestones done
            </span>
            <span>·</span>
            <span>{data.activePath.phaseCount} phases</span>
            {data.activePath.generatedBy?.model ? (
              <>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Cpu className="h-3.5 w-3.5" /> {data.activePath.generatedBy.model}
                </span>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Verified projects</h2>
        {data.projects.length === 0 ? (
          <p className="mt-3 text-zinc-500">No verified projects yet.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {data.projects.map((p) => (
              <div key={p.id} className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-zinc-900">{p.title}</h3>
                  <span className="text-sm font-medium text-emerald-700">
                    {Math.round(p.score * 100)}%
                  </span>
                </div>
                <a
                  href={p.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
                >
                  <Github className="h-3.5 w-3.5" /> {p.repoUrl.replace("https://github.com/", "")}
                </a>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.skills.map((s) => (
                    <span key={s} className="badge-neutral">
                      {s}
                    </span>
                  ))}
                </div>
                {p.strengths.length ? (
                  <ul className="mt-3 space-y-1 text-sm text-zinc-600">
                    {p.strengths.slice(0, 3).map((s, i) => (
                      <li key={i}>
                        <span className="text-emerald-600">•</span> {s}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {p.modelsUsed?.length ? (
                  <p className="mt-3 text-xs text-zinc-400">
                    Evaluated by:{" "}
                    {p.modelsUsed.map((m, i) => (
                      <span key={i} className="font-mono">
                        {i > 0 ? ", " : ""}
                        {m.model}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Credentials</h2>
        {data.credentials.length === 0 ? (
          <p className="mt-3 text-zinc-500">None yet.</p>
        ) : (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {data.credentials.map((c) => (
              <div key={c.id} className="card !p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{c.type}</p>
                    <p className="mt-1 font-semibold text-zinc-900">{c.title}</p>
                  </div>
                  <Award className="h-5 w-5 text-amber-500" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.skills.slice(0, 4).map((s) => (
                    <span key={s} className="badge-neutral">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-zinc-400">
                  Issued {new Date(c.issuedAt).toLocaleDateString()} · sig {c.signature.slice(0, 10)}…
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="mt-12 rounded-xl border border-zinc-200 bg-zinc-50 p-6 text-center">
        <p className="text-sm text-zinc-600">
          Want a portfolio like this?{" "}
          <Link href="/onboarding" className="font-semibold text-zinc-900 underline">
            Start your own path on {cfg.brand.name}
          </Link>
        </p>
      </div>
    </div>
  );
}

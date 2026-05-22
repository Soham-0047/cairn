"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Cpu, Github, Image as ImageIcon, Loader2 } from "lucide-react";
import { proxyFetch } from "@/lib/clientFetch";

type StageResult = { name: string; score: number; summary: string; findings: string[] };
type ModelUsage = { stage: string; provider: string; model: string; latencyMs: number };
type Screenshot = { label: string; dataUrl: string; visualFindings: string };

type EvalDoc = {
  _id: string;
  repoUrl: string;
  projectTitle: string;
  claimedSkills: string[];
  stages: StageResult[];
  screenshots: Screenshot[];
  modelsUsed: ModelUsage[];
  finalScore: number;
  passed: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
  status: "queued" | "running" | "complete" | "failed";
  error?: string;
};

export default function ProjectEvalPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<EvalDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    proxyFetch(`/evaluations/${params.id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-zinc-500">
        <Loader2 className="mx-auto h-6 w-6 animate-spin" />
      </div>
    );
  }
  if (!data) {
    return <div className="mx-auto max-w-3xl px-4 py-20 text-center">Not found.</div>;
  }

  if (data.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-2xl font-bold text-zinc-900">Evaluation failed</h1>
        <p className="mt-2 text-zinc-600">{data.error}</p>
        <Link href="/projects/new" className="btn-primary mt-6 inline-flex">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500">Project evaluation</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900">{data.projectTitle}</h1>
          <a
            href={data.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-zinc-600 hover:text-zinc-900"
          >
            <Github className="h-4 w-4" /> {data.repoUrl.replace("https://github.com/", "")}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <ScoreDial score={data.finalScore} passed={data.passed} />
        </div>
      </div>

      {data.passed ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-semibold">Verified credential issued</p>
          </div>
          <p className="mt-1 text-sm text-emerald-900/80">{data.feedback}</p>
        </div>
      ) : (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-amber-900">
            <XCircle className="h-5 w-5" />
            <p className="font-semibold">Not yet verified</p>
          </div>
          <p className="mt-1 text-sm text-amber-900/80">{data.feedback}</p>
        </div>
      )}

      <section className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Strengths</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-700">
            {data.strengths.length ? (
              data.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  {s}
                </li>
              ))
            ) : (
              <li className="text-zinc-400">None noted.</li>
            )}
          </ul>
        </div>
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Improvements</h2>
          <ul className="mt-3 space-y-1.5 text-sm text-zinc-700">
            {data.improvements.length ? (
              data.improvements.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  {s}
                </li>
              ))
            ) : (
              <li className="text-zinc-400">None noted.</li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Evaluation stages</h2>
        <div className="mt-3 space-y-3">
          {data.stages.map((stage, i) => (
            <StageRow key={i} stage={stage} model={data.modelsUsed.find((m) => m.stage === stage.name)} />
          ))}
        </div>
      </section>

      {data.screenshots?.length ? (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            <ImageIcon className="h-4 w-4" /> Visual review
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {data.screenshots.map((s, i) => (
              <div key={i} className="card !p-3">
                <img src={s.dataUrl} alt={s.label} className="w-full rounded-lg" />
                {s.visualFindings ? (
                  <p className="mt-2 text-sm text-zinc-600">{s.visualFindings}</p>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-10 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Models used</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {data.modelsUsed.map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium text-zinc-700">
                <Cpu className="h-3.5 w-3.5" /> {m.stage}
              </span>
              <span className="font-mono text-xs text-zinc-500">
                {m.provider}/{m.model} · {m.latencyMs}ms
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ScoreDial({ score, passed }: { score: number; passed: boolean }) {
  const pct = Math.round(score * 100);
  const color = passed ? "#059669" : "#d97706";
  return (
    <div className="flex h-20 w-20 flex-col items-center justify-center rounded-full border-4" style={{ borderColor: color }}>
      <p className="text-2xl font-bold" style={{ color }}>
        {pct}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">score</p>
    </div>
  );
}

function StageRow({ stage, model }: { stage: StageResult; model?: ModelUsage }) {
  const pct = Math.round(stage.score * 100);
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">{stage.name}</h3>
        <div className="flex items-center gap-3">
          {model ? (
            <span className="badge-neutral !text-xs">
              {model.provider}/{model.model}
            </span>
          ) : null}
          <span className="text-sm font-medium text-zinc-700">{pct}%</span>
        </div>
      </div>
      {stage.summary ? <p className="mt-1 text-sm text-zinc-600">{stage.summary}</p> : null}
      {stage.findings?.length ? (
        <ul className="mt-2 space-y-1 text-xs text-zinc-500">
          {stage.findings.slice(0, 6).map((f, i) => (
            <li key={i}>• {f}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

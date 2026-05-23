"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CredentialBadge,
  Icon,
  MagneticButton,
  ProgressRing,
  ProviderChain,
  SmallEyebrow,
  Tabs,
  useToast,
} from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
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
  createdAt?: string;
};

export default function ProjectEvalPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<EvalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    proxyFetch(`/evaluations/${params.id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="skeleton" style={{ width: 320, height: 32 }} />
      </div>
    );
  }
  if (!data) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-mid)" }}>
        Not found.
      </div>
    );
  }
  if (data.status === "failed") {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card-elev" style={{ padding: 36, maxWidth: 480, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0, letterSpacing: "-.02em" }}>Evaluation failed</h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 8 }}>{data.error || "Something went wrong."}</p>
          <div style={{ marginTop: 18 }}>
            <MagneticButton href="/projects/new">Try again</MagneticButton>
          </div>
        </div>
      </div>
    );
  }

  const score = Math.round(data.finalScore * 100);
  const stageScores = (data.stages || []).map((s) => ({ ...s, pct: Math.round(s.score * 100) }));
  const repoShort = data.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "");
  const created = data.createdAt ? new Date(data.createdAt) : null;
  const evaluatedAgo = created
    ? Math.max(1, Math.round((Date.now() - created.getTime()) / 60000))
    : null;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Sidebar active="projects-detail" />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar
          title={data.projectTitle}
          subtitle={`Project · evaluated ${evaluatedAgo ? `${evaluatedAgo} min ago` : "just now"}`}
          right={
            data.passed ? (
              <span className="pill pill-mint">
                <Icon name="check" size={11} /> credential minted
              </span>
            ) : (
              <span className="pill pill-warm">not yet verified</span>
            )
          }
        />
        <div style={{ padding: 32 }}>
          <div
            className="card"
            style={{
              padding: 28,
              display: "flex",
              alignItems: "center",
              gap: 28,
              position: "relative",
              overflow: "hidden",
              marginBottom: 24,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: data.passed
                  ? "radial-gradient(ellipse at right, rgba(52,211,153,0.12), transparent 50%)"
                  : "radial-gradient(ellipse at right, rgba(251,146,60,0.12), transparent 50%)",
              }}
            />
            <ProgressRing value={score} size={140} label="overall" />
            <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                <a href={data.repoUrl} target="_blank" rel="noopener noreferrer" className="pill">
                  <Icon name="github" size={11} /> {repoShort}
                </a>
                {data.passed ? (
                  <span className="pill pill-mint">Passed · {score}/100</span>
                ) : (
                  <span className="pill pill-warm">Below threshold · {score}/100</span>
                )}
              </div>
              <h2 className="serif" style={{ fontSize: 36, margin: 0, letterSpacing: "-.02em" }}>{data.projectTitle}</h2>
              <p style={{ color: "var(--text-mid)", fontSize: 15, marginTop: 8, maxWidth: 560, lineHeight: 1.5 }}>
                {data.feedback}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
                <MagneticButton variant="ghost" href={data.repoUrl}>
                  <Icon name="github" size={14} /> Open repo
                </MagneticButton>
                <MagneticButton href="/projects/new">
                  <Icon name="sparkles" size={14} /> Submit another
                </MagneticButton>
              </div>
            </div>
          </div>

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: "Overview", value: "overview" },
              { label: "Code review", value: "code" },
              { label: "Visual review", value: "visual" },
              { label: "Credential", value: "credential" },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            {tab === "overview" && <Overview stages={stageScores} models={data.modelsUsed} />}
            {tab === "code" && <CodeReview strengths={data.strengths} improvements={data.improvements} stages={stageScores} />}
            {tab === "visual" && <VisualReview screenshots={data.screenshots} />}
            {tab === "credential" && <Credential data={data} score={score} />}
          </div>
        </div>
      </main>
      <style>{`@media (max-width: 1100px){ aside{ display:none; }}`}</style>
    </div>
  );
}

const Overview = ({
  stages,
  models,
}: {
  stages: (StageResult & { pct: number })[];
  models: ModelUsage[];
}) => {
  if (!stages.length) {
    return <p style={{ color: "var(--text-mid)" }}>No stage results.</p>;
  }
  return (
    <div className="overview-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {stages.map((s, i) => {
        const m = models.find((x) => x.stage === s.name);
        return (
          <div key={i} className="card" style={{ padding: 22 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
              <SmallEyebrow>
                Stage {i + 1} · {s.name}
              </SmallEyebrow>
              {m && <ProviderChain providers={[m.model, "Gemini"]} active={0} />}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 10 }}>
              <div className="serif" style={{ fontSize: 44, lineHeight: 1, color: s.pct >= 80 ? "#6ee7b7" : "#a5b4fc" }}>
                {s.pct}
                <span style={{ fontSize: 16, color: "var(--text-mid)" }}>/100</span>
              </div>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
                <div
                  style={{
                    width: `${s.pct}%`,
                    height: "100%",
                    background: "linear-gradient(90deg, var(--primary), var(--mint))",
                    animation: "drawIn 1.2s cubic-bezier(.16,1,.3,1) both",
                    transformOrigin: "left",
                  }}
                />
              </div>
            </div>
            {s.summary && (
              <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 14, lineHeight: 1.6 }}>{s.summary}</p>
            )}
            {s.findings?.length ? (
              <ul style={{ marginTop: 12, paddingLeft: 0, listStyle: "none", color: "var(--text-mid)", fontSize: 13 }}>
                {s.findings.slice(0, 4).map((f, j) => (
                  <li key={j} style={{ padding: "4px 0" }}>· {f}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
      <style>{`@media(max-width:900px){.overview-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

const CodeReview = ({
  strengths,
  improvements,
  stages,
}: {
  strengths: string[];
  improvements: string[];
  stages: (StageResult & { pct: number })[];
}) => {
  const code = stages.find((s) => s.name.toLowerCase().includes("code")) || stages[1];
  return (
    <div className="code-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <SmallEyebrow>Strengths</SmallEyebrow>
        <div style={{ marginTop: 14 }}>
          {strengths?.length ? (
            strengths.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <Icon name="check" size={14} style={{ color: "#6ee7b7", marginTop: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 14 }}>{t}</span>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-lo)", fontSize: 13 }}>None noted.</p>
          )}
        </div>
      </div>
      <div className="card" style={{ padding: 22 }}>
        <SmallEyebrow>Improvements</SmallEyebrow>
        <div style={{ marginTop: 14 }}>
          {improvements?.length ? (
            improvements.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <Icon name="minus" size={14} style={{ color: "#fdba74", marginTop: 3, flexShrink: 0 }} />
                <span style={{ fontSize: 14 }}>{t}</span>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--text-lo)", fontSize: 13 }}>None noted.</p>
          )}
        </div>
      </div>
      {code && (
        <div className="card" style={{ padding: 22, gridColumn: "span 2" }}>
          <SmallEyebrow>Code review · streaming summary</SmallEyebrow>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 14, lineHeight: 1.6 }}>{code.summary}</p>
          {code.findings?.length ? (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {code.findings.map((f, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-2)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <span
                    style={{ width: 8, height: 8, borderRadius: 999, background: "#a5b4fc", marginTop: 6, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, lineHeight: 1.5 }}>{f}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
      <style>{`@media(max-width:900px){.code-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

const VisualReview = ({ screenshots }: { screenshots: Screenshot[] }) => {
  const [active, setActive] = useState(0);
  if (!screenshots?.length) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center", color: "var(--text-mid)" }}>
        <SmallEyebrow>No visual review</SmallEyebrow>
        <p style={{ fontSize: 14, marginTop: 10 }}>This submission didn't include screenshots.</p>
      </div>
    );
  }
  const cur = screenshots[active] || screenshots[0];
  return (
    <div className="vis-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16 }}>
      <div>
        <SmallEyebrow>Screenshots</SmallEyebrow>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {screenshots.map((s, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="card"
              style={{
                padding: 10,
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                border: "none",
                cursor: "pointer",
                background: active === i ? "var(--bg-2)" : "var(--bg-1)",
                boxShadow: active === i ? `inset 0 0 0 1px rgba(99,102,241,0.45)` : "inset 0 0 0 1px var(--border)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.dataUrl}
                alt={s.label}
                style={{ width: 56, height: 36, objectFit: "cover", borderRadius: 6 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                <span className="pill" style={{ fontSize: 10, marginTop: 4 }}>screenshot</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <SmallEyebrow>{cur.label} · annotated</SmallEyebrow>
          <span className="pill pill-indigo" style={{ marginLeft: "auto", fontSize: 10 }}>Gemma 4 12B vision</span>
        </div>
        <div style={{ position: "relative", background: "#0a0c14" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cur.dataUrl} alt={cur.label} style={{ width: "100%", display: "block", maxHeight: 420, objectFit: "contain" }} />
        </div>
        {cur.visualFindings && (
          <div style={{ padding: 14 }}>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                background: "var(--bg-2)",
                boxShadow: "inset 0 0 0 1px var(--border)",
                fontSize: 13,
                lineHeight: 1.6,
              }}
            >
              {cur.visualFindings}
            </div>
          </div>
        )}
      </div>
      <style>{`@media(max-width:900px){.vis-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

const Credential = ({ data, score }: { data: EvalDoc; score: number }) => {
  const toast = useToast();
  if (!data.passed) {
    return (
      <div className="card" style={{ padding: 32, textAlign: "center" }}>
        <SmallEyebrow>Not yet verified</SmallEyebrow>
        <h3 className="serif" style={{ fontSize: 28, margin: "10px 0", letterSpacing: "-.02em" }}>
          Score below threshold.
        </h3>
        <p style={{ color: "var(--text-mid)", fontSize: 14, maxWidth: 460, margin: "0 auto" }}>
          Iterate on the improvements in the Code review tab and re-submit when ready.
        </p>
        <div style={{ marginTop: 18 }}>
          <MagneticButton href="/projects/new">Submit again</MagneticButton>
        </div>
      </div>
    );
  }
  return (
    <div className="cred-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "center" }}>
      <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
        <CredentialBadge title={data.projectTitle} project={data.claimedSkills?.[0] || "Project"} score={score} />
      </div>
      <div>
        <SmallEyebrow>Verified credential</SmallEyebrow>
        <h3 className="serif" style={{ fontSize: 36, margin: "10px 0 0", letterSpacing: "-.02em" }}>
          You shipped something <i>real</i>.
        </h3>
        <p style={{ color: "var(--text-mid)", fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>
          The credential is HMAC-signed and lives on your portfolio. Anyone can verify it without an account.
        </p>
        <div
          style={{
            marginTop: 18,
            padding: 14,
            borderRadius: 10,
            background: "var(--bg-2)",
            boxShadow: "inset 0 0 0 1px var(--border)",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".12em" }}>signed payload</div>
          <div
            className="mono"
            style={{ fontSize: 11, marginTop: 6, lineHeight: 1.6, color: "var(--text-hi)", wordBreak: "break-all" }}
          >
            {`{ "project": "${data.projectTitle}", "score": ${score}, "iss": "cairn.dev", "sig": "…" }`}
          </div>
        </div>
        <div style={{ marginTop: 20, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <MagneticButton
            onClick={() => {
              if (typeof window !== "undefined") {
                navigator.clipboard.writeText(window.location.href);
                toast.push("Link copied to clipboard", "success");
              }
            }}
          >
            <Icon name="copy" size={14} /> Copy link
          </MagneticButton>
          <MagneticButton variant="ghost">
            <Icon name="linkedin" size={14} /> Add to LinkedIn
          </MagneticButton>
        </div>
      </div>
      <style>{`@media(max-width:900px){.cred-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

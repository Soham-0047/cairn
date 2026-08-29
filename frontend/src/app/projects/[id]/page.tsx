"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  CredentialBadge,
  Icon,
  MagneticButton,
  ProgressRing,
  SmallEyebrow,
  Tabs,
  useToast,
} from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { proxyFetch } from "@/lib/clientFetch";

import {
  AgentTrajectory,
  EvidenceLedger,
  ScoreBreakdown,
  type AgentStep,
  type Claim,
  type ScoreComponent,
} from "@/components/ui/AgentRun";

type StageResult = { name: string; score: number; summary: string; findings: string[] };
type ModelUsage = { stage: string; provider: string; model: string; latencyMs: number };
type Screenshot = { label: string; dataUrl: string; visualFindings: string };

type VulnSummary = {
  available: boolean;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
};

type EvalDoc = {
  _id: string;
  repoUrl: string;
  projectTitle: string;
  claimedSkills: string[];
  stages: StageResult[];
  screenshots: Screenshot[];
  modelsUsed: ModelUsage[];
  vulnerabilities?: VulnSummary;
  finalScore: number;
  passed: boolean;
  feedback: string;
  strengths: string[];
  improvements: string[];
  status: "queued" | "running" | "complete" | "failed";
  error?: string;
  createdAt?: string;

  agentSteps?: AgentStep[];
  filesRead?: string[];
  claims?: Claim[];
  groundedness?: number;
  scoreComponents?: ScoreComponent[];
  shrinkage?: number;
  passReason?: string;
  verdictLine?: string;
  runCost?: {
    llmCalls: number;
    githubReads: number;
    agentBudgetUsed: number;
    totalLatencyMs: number;
  };
};

type StageProgress = {
  status: "pending" | "running" | "complete" | "failed";
  score?: number;
  label: string;
  detail?: string;
};

/** The workflow's phases, in the order they run. Mirrors WorkflowPhase on the API. */
const PHASES = [
  { key: "investigate", label: "Investigating the repository" },
  { key: "structural", label: "Reading structural signals" },
  { key: "specialists", label: "Three reviewers, in parallel" },
  { key: "verify", label: "Checking every claim against the source" },
  { key: "synthesize", label: "Writing the review" },
] as const;

export default function ProjectEvalPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<EvalDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [progress, setProgress] = useState<Record<string, StageProgress>>({});
  // Tool calls arriving over SSE while the run is still going. Once the run
  // finishes, the persisted steps on the document take over.
  const [liveSteps, setLiveSteps] = useState<AgentStep[]>([]);
  const [liveVerdict, setLiveVerdict] = useState<{
    supported: number;
    dropped: number;
    groundedness: number;
  } | null>(null);

  useEffect(() => {
    proxyFetch(`/evaluations/${params.id}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Subscribe to the SSE progress stream while the eval is still running. The
  // stream auto-closes when the synthesis ("final") event arrives. The REST
  // payload above is still the source of truth for the final rendered state.
  useEffect(() => {
    if (!data || data.status === "complete" || data.status === "failed") return;
    let cancelled = false;
    let abort: AbortController | null = new AbortController();

    (async () => {
      try {
        const resp = await fetch(`/api/proxy/evaluations/${params.id}/progress`, {
          signal: abort.signal,
          headers: { Accept: "text/event-stream" },
        });
        if (!resp.body) return;
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!cancelled) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";
          for (const block of events) {
            for (const line of block.split("\n")) {
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (!payload) continue;
              try {
                const evt = JSON.parse(payload) as Record<string, any>;

                // Workflow events carry the live detail: which tool the agent
                // reached for, and what verification made of the result.
                if (evt.stage === "workflow") {
                  if (evt.type === "phase") {
                    setProgress((prev) => ({
                      ...prev,
                      [evt.phase]: {
                        status: evt.status,
                        label: evt.label,
                        detail: evt.detail,
                      },
                    }));
                  } else if (evt.type === "tool") {
                    setLiveSteps((prev) =>
                      prev.some((s) => s.index === evt.step)
                        ? prev
                        : [
                            ...prev,
                            {
                              index: evt.step,
                              thought: evt.thought || "",
                              tool: evt.tool,
                              args: evt.args || {},
                              observation: "",
                              isError: !evt.ok,
                              latencyMs: 0,
                              provider: "",
                              model: "",
                            },
                          ],
                    );
                  } else if (evt.type === "verdict") {
                    setLiveVerdict({
                      supported: evt.supported,
                      dropped: evt.dropped,
                      groundedness: evt.groundedness,
                    });
                  }
                  continue;
                }

                const key = String(evt.stage);
                setProgress((prev) => ({
                  ...prev,
                  [key]: { status: evt.status, score: evt.score, label: evt.label },
                }));
                if (evt.stage === "final") {
                  // Refresh the REST payload so the UI gets the final score,
                  // credential state, screenshots, etc.
                  proxyFetch(`/evaluations/${params.id}`)
                    .then((r) => r.json())
                    .then((d) => setData(d))
                    .catch(() => {});
                }
              } catch {
                // ignore malformed lines
              }
            }
          }
        }
      } catch {
        // SSE failed — REST polling above already populated the page.
      }
    })();

    return () => {
      cancelled = true;
      abort?.abort();
      abort = null;
    };
  }, [data, params.id]);

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
  const steps = data.agentSteps?.length ? data.agentSteps : liveSteps;
  const claims = data.claims || [];
  const verified = claims.filter((c) => c.verdict === "supported").length;
  // The facts worth putting next to the score: what the agent looked at, and
  // how much of what it said survived being checked.
  const runFacts = [
    data.filesRead?.length ? { label: "files read", value: String(data.filesRead.length) } : null,
    claims.length ? { label: "claims verified", value: `${verified}/${claims.length}` } : null,
    data.runCost?.llmCalls ? { label: "model calls", value: String(data.runCost.llmCalls) } : null,
    data.runCost?.totalLatencyMs
      ? { label: "seconds", value: (data.runCost.totalLatencyMs / 1000).toFixed(0) }
      : null,
  ].filter((f): f is { label: string; value: string } => f !== null);
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
              {data.verdictLine ? (
                <p className="serif" style={{ color: "var(--text-hi)", fontSize: 20, marginTop: 10, maxWidth: 620, lineHeight: 1.45, letterSpacing: "-.01em" }}>
                  {data.verdictLine}
                </p>
              ) : null}
              <p style={{ color: "var(--text-mid)", fontSize: 15, marginTop: 8, maxWidth: 620, lineHeight: 1.6 }}>
                {data.feedback}
              </p>
              {runFacts.length > 0 && (
                <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
                  {runFacts.map((f) => (
                    <span key={f.label} className="mono" style={{ fontSize: 11, color: "var(--text-lo)" }}>
                      <span style={{ color: "var(--text-mid)" }}>{f.value}</span> {f.label}
                    </span>
                  ))}
                </div>
              )}
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

          {data.status === "running" || data.status === "queued" ? (
            <div style={{ display: "grid", gap: 16, marginBottom: 16 }}>
              <LiveProgress progress={progress} verdict={liveVerdict} />
              {liveSteps.length > 0 && <AgentTrajectory steps={liveSteps} live />}
            </div>
          ) : null}

          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { label: "Overview", value: "overview" },
              { label: "Review", value: "code" },
              { label: `Investigation${steps.length ? ` · ${steps.length}` : ""}`, value: "agent" },
              { label: `Evidence${claims.length ? ` · ${verified}/${claims.length}` : ""}`, value: "evidence" },
              { label: "Visual", value: "visual" },
              { label: "Credential", value: "credential" },
            ]}
          />

          <div style={{ marginTop: 24 }}>
            {tab === "overview" && (
              <div style={{ display: "grid", gap: 16 }}>
                {data.scoreComponents?.length ? (
                  <ScoreBreakdown
                    components={data.scoreComponents}
                    groundedness={data.groundedness || 0}
                    shrinkage={data.shrinkage || 0}
                    passReason={data.passReason || ""}
                  />
                ) : null}
                <Overview stages={stageScores} models={data.modelsUsed} vulnerabilities={data.vulnerabilities} />
              </div>
            )}
            {tab === "code" && <CodeReview strengths={data.strengths} improvements={data.improvements} stages={stageScores} />}
            {tab === "agent" && <AgentTrajectory steps={steps} live={data.status === "running"} />}
            {tab === "evidence" && (
              <EvidenceLedger
                claims={claims}
                groundedness={data.groundedness || 0}
                filesRead={data.filesRead || []}
              />
            )}
            {tab === "visual" && <VisualReview screenshots={data.screenshots} models={data.modelsUsed} />}
            {tab === "credential" && <Credential data={data} score={score} />}
          </div>
        </div>
      </main>
      <style>{`@media (max-width: 1100px){ aside{ display:none; }}`}</style>
    </div>
  );
}

/**
 * Live view of a run in flight. Phases come from the workflow itself rather
 * than a fixed list, so a phase that is skipped (no screenshots) or that fails
 * shows as what it was instead of stalling on "pending" forever.
 */
const LiveProgress = ({
  progress,
  verdict,
}: {
  progress: Record<string, StageProgress>;
  verdict: { supported: number; dropped: number; groundedness: number } | null;
}) => {
  const firstPending = PHASES.findIndex((p) => !progress[p.key]);
  return (
    <div className="card" style={{ padding: 22 }}>
      <SmallEyebrow>Running · streaming</SmallEyebrow>
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
        {PHASES.map((phase, i) => {
          const p = progress[phase.key];
          // The first phase with no event yet is the one currently starting.
          const status = p?.status || (i === firstPending ? "running" : "pending");
          return (
            <div
              key={phase.key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-2)",
                boxShadow: "inset 0 0 0 1px var(--border)",
                opacity: status === "pending" ? 0.55 : 1,
              }}
            >
              <StatusDot status={status} />
              <span style={{ fontSize: 14, flex: 1 }}>{p?.label || phase.label}</span>
              {p?.detail && (
                <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
                  {p.detail}
                </span>
              )}
            </div>
          );
        })}
      </div>
      {verdict && (
        <p style={{ fontSize: 12.5, color: "var(--text-mid)", marginTop: 12, marginBottom: 0, lineHeight: 1.55 }}>
          {verdict.supported} of {verdict.supported + verdict.dropped} claims held up against the
          source they cite.
        </p>
      )}
    </div>
  );
};

const StatusDot = ({ status }: { status: StageProgress["status"] }) => {
  if (status === "complete") {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#6ee7b7",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name="check" size={10} style={{ color: "#0f172a" }} />
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#fca5a5",
          color: "#0f172a",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ×
      </span>
    );
  }
  if (status === "running") {
    return (
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 999,
          border: "2px solid rgba(165,180,252,0.4)",
          borderTopColor: "#a5b4fc",
          animation: "spin 0.9s linear infinite",
          flexShrink: 0,
        }}
      />
    );
  }
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: 999,
        background: "var(--bg-0)",
        boxShadow: "inset 0 0 0 1.5px var(--border)",
        flexShrink: 0,
      }}
    />
  );
};

const VulnerabilitiesRow = ({ v }: { v: VulnSummary }) => {
  if (!v.available) {
    return (
      <div className="card" style={{ padding: 16, opacity: 0.7 }}>
        <SmallEyebrow>Dependencies</SmallEyebrow>
        <p style={{ marginTop: 8, fontSize: 13, color: "var(--text-lo)" }}>
          Dependabot not enabled on this repo
        </p>
      </div>
    );
  }
  const danger = v.critical > 0 || v.high > 0;
  const warn = !danger && (v.medium > 0 || v.low > 0);
  const color = danger ? "#fca5a5" : warn ? "#fdba74" : "#6ee7b7";
  const label = danger
    ? `${v.critical + v.high} critical/high vulnerabilities — see Dependabot`
    : warn
    ? `${v.medium + v.low} medium/low vulnerabilities`
    : "0 known vulnerabilities";
  return (
    <div className="card" style={{ padding: 16 }}>
      <SmallEyebrow>Dependencies</SmallEyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        <span style={{ fontSize: 13, color: "var(--text-hi)" }}>{label}</span>
      </div>
      {v.total > 0 && (
        <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", marginTop: 6, letterSpacing: ".08em" }}>
          C:{v.critical} · H:{v.high} · M:{v.medium} · L:{v.low}
        </div>
      )}
    </div>
  );
};

const Overview = ({
  stages,
  models,
  vulnerabilities,
}: {
  stages: (StageResult & { pct: number })[];
  models: ModelUsage[];
  vulnerabilities?: VulnSummary;
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
              {m?.model && (
                <span className="mono" style={{ fontSize: 10.5, color: "var(--text-lo)" }}>
                  {m.provider}/{m.model}
                </span>
              )}
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
      {vulnerabilities && (
        <div style={{ gridColumn: "span 2" }}>
          <VulnerabilitiesRow v={vulnerabilities} />
        </div>
      )}
      <style>{`@media(max-width:900px){.overview-grid{grid-template-columns:1fr !important;}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
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

const VisualReview = ({
  screenshots,
  models,
}: {
  screenshots: Screenshot[];
  models: ModelUsage[];
}) => {
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
  // Name the model that actually ran, rather than the one we hoped would.
  const visionModel = models?.find((m) => /visual|vision/i.test(m.stage))?.model;
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
          {visionModel && (
            <span className="pill pill-indigo" style={{ marginLeft: "auto", fontSize: 10 }}>
              {visionModel}
            </span>
          )}
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

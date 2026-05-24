"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Icon, MagneticButton, SmallEyebrow } from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type QuizListEntry = {
  _id: string;
  topic: string;
  level: number;
  questions: { q: string; choices: string[] }[];
  attempts: { score: number; correct: number; total: number; attemptedAt: string }[];
  bestScore: number;
  createdAt: string;
  generatedBy?: { provider?: string; model?: string };
};

type ActivePath = {
  _id: string;
  targetRole: string;
  phases: {
    name: string;
    milestones: { week: number; topic: string; status: string }[];
  }[];
};

export default function QuizzesPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [quizzes, setQuizzes] = useState<QuizListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasGuest, setHasGuest] = useState(false);
  const [activePath, setActivePath] = useState<ActivePath | null>(null);
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [n, setN] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" && !hasGuest) return;
    Promise.all([
      proxyFetch("/quizzes").then((r) => (r.ok ? r.json() : [])),
      proxyFetch("/paths/active").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([qs, p]) => {
        setQuizzes(qs || []);
        setActivePath(p);
      })
      .finally(() => setLoading(false));
  }, [status, hasGuest]);

  async function generate(seedTopic?: string, link?: { phaseIndex: number; milestoneIndex: number }) {
    const usedTopic = (seedTopic ?? topic).trim();
    if (usedTopic.length < 2) {
      setError("Pick a topic first.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const body: Record<string, unknown> = { topic: usedTopic, level, n };
      if (link && activePath) {
        body.pathId = activePath._id;
        body.phaseIndex = link.phaseIndex;
        body.milestoneIndex = link.milestoneIndex;
      }
      const res = await proxyFetch("/quizzes/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Generation failed");
        return;
      }
      router.push(`/quizzes/${data._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card-elev" style={{ padding: 36, maxWidth: 420, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Sign in to take quizzes</h1>
          <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <MagneticButton onClick={() => signIn("github")}>
              <Icon name="github" size={14} /> GitHub
            </MagneticButton>
          </div>
        </div>
      </div>
    );
  }

  const guestMeta = getGuestMeta();
  const userName = session?.user?.name?.split(" ")[0] || guestMeta?.handle || "there";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Sidebar
        active="quizzes"
        userName={userName}
        userEmail={session?.user?.email || (guestMeta ? "guest mode" : undefined)}
        userHandle={session?.user?.handle || guestMeta?.handle}
        targetRole={activePath?.targetRole}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar title="Knowledge checks" subtitle="Adaptive quizzes — mastery mints credentials" />
        <div style={{ padding: 32, display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32 }}>
          <div>
            <div className="card" style={{ padding: 24 }}>
              <SmallEyebrow>Generate a new quiz</SmallEyebrow>
              <h2 className="serif" style={{ fontSize: 28, margin: "8px 0 16px", letterSpacing: "-.02em" }}>
                Pick a topic — Gemma writes <i>{n}</i> questions.
              </h2>
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. React hooks, Python decorators, transformer attention"
                  className="card"
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "var(--bg-1)",
                    border: "none",
                    color: "var(--text-hi)",
                    fontSize: 14,
                    boxShadow: "inset 0 0 0 1px var(--border)",
                  }}
                />
                <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                  <label style={{ fontSize: 12, color: "var(--text-mid)" }}>
                    Level
                    <select
                      value={level}
                      onChange={(e) => setLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                      style={{
                        marginLeft: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "var(--bg-1)",
                        color: "var(--text-hi)",
                        border: "1px solid var(--border)",
                        fontSize: 13,
                      }}
                    >
                      <option value={1}>1 · intro</option>
                      <option value={2}>2 · beginner</option>
                      <option value={3}>3 · working</option>
                      <option value={4}>4 · advanced</option>
                      <option value={5}>5 · senior</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12, color: "var(--text-mid)" }}>
                    Questions
                    <select
                      value={n}
                      onChange={(e) => setN(Number(e.target.value))}
                      style={{
                        marginLeft: 8,
                        padding: "6px 8px",
                        borderRadius: 8,
                        background: "var(--bg-1)",
                        color: "var(--text-hi)",
                        border: "1px solid var(--border)",
                        fontSize: 13,
                      }}
                    >
                      {[3, 5, 7, 10].map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div style={{ flex: 1 }} />
                  <MagneticButton onClick={() => generate()} disabled={generating || topic.length < 2}>
                    {generating ? "Generating…" : (
                      <>
                        <Icon name="sparkles" size={14} /> Generate quiz
                      </>
                    )}
                  </MagneticButton>
                </div>
                {error && (
                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "rgba(248,113,113,0.08)",
                      color: "#fca5a5",
                      fontSize: 13,
                      boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.3)",
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            </div>

            {activePath && (
              <div style={{ marginTop: 28 }}>
                <SmallEyebrow>Quick start · from your active path</SmallEyebrow>
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                  {activePath.phases.flatMap((phase, pi) =>
                    phase.milestones.map((m, mi) => (
                      <button
                        key={`${pi}-${mi}`}
                        onClick={() => generate(m.topic, { phaseIndex: pi, milestoneIndex: mi })}
                        disabled={generating}
                        className="card"
                        style={{
                          padding: 14,
                          textAlign: "left",
                          background: "var(--bg-1)",
                          border: "none",
                          cursor: generating ? "default" : "pointer",
                          opacity: generating ? 0.6 : 1,
                        }}
                      >
                        <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: ".12em" }}>
                          WEEK {String(m.week).padStart(2, "0")} · {phase.name}
                        </div>
                        <div className="serif" style={{ fontSize: 16, marginTop: 6, letterSpacing: "-.01em" }}>
                          {m.topic}
                        </div>
                        <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-mid)" }}>
                          <Icon name="sparkles" size={11} /> Quiz this milestone
                        </div>
                      </button>
                    )),
                  )}
                </div>
              </div>
            )}

            <div style={{ marginTop: 32 }}>
              <SmallEyebrow>Past quizzes</SmallEyebrow>
              {loading ? (
                <div className="skeleton" style={{ height: 60, marginTop: 12 }} />
              ) : quizzes.length === 0 ? (
                <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 12 }}>
                  No quizzes yet. Generate one above to start tracking mastery.
                </p>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {quizzes.map((q) => (
                    <a
                      key={q._id}
                      href={`/quizzes/${q._id}`}
                      className="card"
                      style={{
                        padding: 16,
                        display: "grid",
                        gridTemplateColumns: "1fr auto",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div className="serif" style={{ fontSize: 18, letterSpacing: "-.01em" }}>
                          {q.topic}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 4, display: "flex", gap: 12 }}>
                          <span>Level {q.level} · {q.questions.length} questions</span>
                          <span>·</span>
                          <span>{q.attempts.length} attempt{q.attempts.length === 1 ? "" : "s"}</span>
                          {q.generatedBy?.model && (
                            <>
                              <span>·</span>
                              <span className="mono" style={{ fontSize: 10 }}>{q.generatedBy.model}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className="pill"
                        style={{
                          color: q.bestScore >= 0.8 ? "#6ee7b7" : q.bestScore >= 0.5 ? "#a5b4fc" : "var(--text-lo)",
                          background:
                            q.bestScore >= 0.8
                              ? "rgba(110,231,183,0.08)"
                              : q.bestScore >= 0.5
                              ? "rgba(165,180,252,0.08)"
                              : "var(--bg-2)",
                        }}
                      >
                        {q.attempts.length === 0
                          ? "untaken"
                          : `${Math.round(q.bestScore * 100)}% best`}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside style={{ position: "sticky", top: 100, alignSelf: "flex-start" }}>
            <div className="card" style={{ padding: 20 }}>
              <SmallEyebrow>How mastery works</SmallEyebrow>
              <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
                Score ≥ 80% on any topic and Cairn mints a <span style={{ color: "var(--text-hi)" }}>quiz_mastery</span>{" "}
                credential. It shows up on your public portfolio next to your verified projects.
              </p>
              <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
                Quizzes linked to a milestone also mark the milestone done when you pass.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <style>{`
        @media (max-width: 1100px) {
          aside[style*="position: sticky"] { display: none; }
          main > div { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

"use client";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon, MagneticButton, SmallEyebrow } from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type Quiz = {
  _id: string;
  topic: string;
  level: number;
  questions: { q: string; choices: string[] }[];
  attempts: { score: number; correct: number; total: number; attemptedAt: string }[];
  bestScore: number;
  generatedBy?: { provider?: string; model?: string };
};

type AttemptResult = {
  score: number;
  correct: number;
  total: number;
  results: { correct: boolean; correctIndex: number; explanation: string }[];
  credentialIssued: boolean;
  bestScore: number;
};

export default function QuizDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGuest, setHasGuest] = useState(false);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
  }, []);

  useEffect(() => {
    proxyFetch(`/quizzes/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Quiz | null) => {
        setQuiz(data);
        if (data) setAnswers(new Array(data.questions.length).fill(-1));
      })
      .finally(() => setLoading(false));
  }, [id]);

  async function submit() {
    if (!quiz) return;
    if (answers.some((a) => a < 0)) {
      setError("Answer every question before submitting.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await proxyFetch(`/quizzes/${id}/attempt`, {
        method: "POST",
        body: JSON.stringify({ answers }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Submission failed");
        return;
      }
      setResult(data as AttemptResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="skeleton" style={{ width: 280, height: 32 }} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ padding: 40, maxWidth: 480, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Quiz not found</h1>
          <p style={{ color: "var(--text-mid)", marginTop: 8 }}>It may have been deleted, or it doesn't belong to you.</p>
          <div style={{ marginTop: 14 }}>
            <MagneticButton onClick={() => router.push("/quizzes")}>Back to quizzes</MagneticButton>
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
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar
          title={quiz.topic}
          subtitle={`Level ${quiz.level} · ${quiz.questions.length} questions`}
          right={quiz.generatedBy?.model ? (
            <span className="pill mono" style={{ fontSize: 11 }}>
              <Icon name="sparkles" size={11} /> {quiz.generatedBy.model}
            </span>
          ) : null}
        />
        <div style={{ padding: 32, maxWidth: 880, margin: "0 auto" }}>
          {result ? (
            <ResultView quiz={quiz} answers={answers} result={result} onRetry={() => {
              setResult(null);
              setAnswers(new Array(quiz.questions.length).fill(-1));
            }} />
          ) : (
            <>
              <div style={{ display: "grid", gap: 18 }}>
                {quiz.questions.map((q, qi) => (
                  <div key={qi} className="card" style={{ padding: 20 }}>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: ".14em" }}>
                      QUESTION {qi + 1} / {quiz.questions.length}
                    </div>
                    <div className="serif" style={{ fontSize: 20, marginTop: 8, lineHeight: 1.35, letterSpacing: "-.01em" }}>
                      {q.q}
                    </div>
                    <div style={{ marginTop: 14, display: "grid", gap: 8 }}>
                      {q.choices.map((c, ci) => {
                        const selected = answers[qi] === ci;
                        return (
                          <button
                            key={ci}
                            onClick={() => {
                              const next = [...answers];
                              next[qi] = ci;
                              setAnswers(next);
                            }}
                            style={{
                              textAlign: "left",
                              padding: "12px 14px",
                              borderRadius: 10,
                              background: selected ? "rgba(99,102,241,0.12)" : "var(--bg-1)",
                              color: "var(--text-hi)",
                              fontSize: 14,
                              border: "none",
                              cursor: "pointer",
                              boxShadow: selected
                                ? "inset 0 0 0 1px rgba(99,102,241,0.55)"
                                : "inset 0 0 0 1px var(--border)",
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <span
                              className="mono"
                              style={{
                                fontSize: 11,
                                width: 22,
                                height: 22,
                                borderRadius: 999,
                                background: selected ? "var(--primary)" : "var(--bg-2)",
                                color: selected ? "#fff" : "var(--text-mid)",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {String.fromCharCode(65 + ci)}
                            </span>
                            <span style={{ flex: 1 }}>{c}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {error && (
                <div
                  style={{
                    marginTop: 16,
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
              <div style={{ marginTop: 22, display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  onClick={() => router.push("/quizzes")}
                  className="btn-magnetic btn-ghost"
                  style={{ padding: "10px 16px", fontSize: 13 }}
                >
                  Cancel
                </button>
                <MagneticButton onClick={submit} disabled={submitting || answers.some((a) => a < 0)}>
                  {submitting ? "Grading…" : (
                    <>
                      <Icon name="check" size={14} /> Submit
                    </>
                  )}
                </MagneticButton>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function ResultView({
  quiz,
  answers,
  result,
  onRetry,
}: {
  quiz: Quiz;
  answers: number[];
  result: AttemptResult;
  onRetry: () => void;
}) {
  const pct = Math.round(result.score * 100);
  const passed = result.score >= 0.8;
  return (
    <div>
      <div
        className="card"
        style={{
          padding: 28,
          background: passed
            ? "linear-gradient(180deg, rgba(110,231,183,0.08), var(--bg-1))"
            : "var(--bg-1)",
        }}
      >
        <SmallEyebrow>{passed ? "Mastery reached" : "Result"}</SmallEyebrow>
        <h2 className="serif" style={{ fontSize: 40, margin: "8px 0 6px", letterSpacing: "-.02em" }}>
          {pct}% · {result.correct}/{result.total}
        </h2>
        <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 14, lineHeight: 1.6 }}>
          {passed
            ? `You crossed the 80% mastery threshold for "${quiz.topic}".`
            : "Review the explanations below and retake when you're ready."}
          {result.credentialIssued && (
            <>
              {" "}
              <span style={{ color: "#6ee7b7" }}>A quiz_mastery credential was minted to your portfolio.</span>
            </>
          )}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {!passed && (
            <button onClick={onRetry} className="btn-magnetic btn-ghost" style={{ padding: "10px 16px", fontSize: 13 }}>
              <Icon name="sparkles" size={13} /> Retake
            </button>
          )}
          <MagneticButton href="/quizzes">
            <Icon name="arrow-right" size={14} /> Back to quizzes
          </MagneticButton>
        </div>
      </div>

      <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
        {quiz.questions.map((q, qi) => {
          const r = result.results[qi]!;
          const chosen = answers[qi]!;
          return (
            <div
              key={qi}
              className="card"
              style={{
                padding: 18,
                boxShadow: r.correct
                  ? "inset 0 0 0 1px rgba(110,231,183,0.35)"
                  : "inset 0 0 0 1px rgba(248,113,113,0.35)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span
                  className="pill"
                  style={{
                    color: r.correct ? "#6ee7b7" : "#fca5a5",
                    background: r.correct ? "rgba(110,231,183,0.08)" : "rgba(248,113,113,0.08)",
                  }}
                >
                  {r.correct ? "Correct" : "Incorrect"}
                </span>
                <span className="mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: ".14em" }}>
                  Q{qi + 1}
                </span>
              </div>
              <div className="serif" style={{ fontSize: 18, marginTop: 8, letterSpacing: "-.01em" }}>
                {q.q}
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {q.choices.map((c, ci) => {
                  const isUserAnswer = chosen === ci;
                  const isCorrect = r.correctIndex === ci;
                  return (
                    <div
                      key={ci}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        color: "var(--text-hi)",
                        background: isCorrect
                          ? "rgba(110,231,183,0.08)"
                          : isUserAnswer
                          ? "rgba(248,113,113,0.08)"
                          : "var(--bg-2)",
                        boxShadow: isCorrect
                          ? "inset 0 0 0 1px rgba(110,231,183,0.4)"
                          : "inset 0 0 0 1px var(--border)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span className="mono" style={{ fontSize: 10, color: "var(--text-mid)" }}>
                        {String.fromCharCode(65 + ci)}.
                      </span>
                      <span style={{ flex: 1 }}>{c}</span>
                      {isCorrect && <Icon name="check" size={12} style={{ color: "#6ee7b7" }} />}
                      {!isCorrect && isUserAnswer && <Icon name="x" size={12} style={{ color: "#fca5a5" }} />}
                    </div>
                  );
                })}
              </div>
              {r.explanation && (
                <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 12, lineHeight: 1.6 }}>
                  <Icon name="sparkles" size={11} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--text-lo)" }} />
                  {r.explanation}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

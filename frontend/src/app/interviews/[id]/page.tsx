"use client";
import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Icon, MagneticButton, SmallEyebrow } from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";
import VoiceInput from "@/components/VoiceInput";

type Message = {
  role: "interviewer" | "candidate";
  content: string;
  fromVoice?: boolean;
  ts?: string;
};

type ModelUsed = { stage?: string; provider?: string; model?: string; latencyMs?: number };

type Score = {
  overall: number;
  technical: number;
  communication: number;
  problemSolving: number;
  seniority: string;
  strengths: string[];
  improvements: string[];
  summary: string;
  recommendation: string;
};

type Session = {
  _id: string;
  role: string;
  level: "junior" | "mid" | "senior";
  focus?: string;
  status: "active" | "complete";
  messages: Message[];
  score?: Score;
  modelsUsed: ModelUsed[];
};

const RECOMMENDATION_LABEL: Record<string, string> = {
  strong_hire: "Strong hire",
  hire: "Hire",
  lean_hire: "Lean hire",
  no_hire: "No hire",
  strong_no_hire: "Strong no hire",
};

export default function InterviewDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [sess, setSess] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [draftFromVoice, setDraftFromVoice] = useState(false);
  const [sending, setSending] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    proxyFetch(`/interviews/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Session | null) => setSess(data))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    // Auto-scroll the transcript to bottom on each new message.
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sess?.messages.length]);

  async function sendTurn() {
    if (!sess || draft.trim().length === 0) return;
    setError(null);
    setSending(true);
    const text = draft.trim();
    try {
      const res = await proxyFetch(`/interviews/${id}/turn`, {
        method: "POST",
        body: JSON.stringify({ text, fromVoice: draftFromVoice }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Could not get next turn");
        return;
      }
      setSess(data as Session);
      setDraft("");
      setDraftFromVoice(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not get next turn");
    } finally {
      setSending(false);
    }
  }

  async function finish() {
    if (!sess) return;
    setError(null);
    setFinishing(true);
    try {
      const res = await proxyFetch(`/interviews/${id}/finish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Scoring failed");
        return;
      }
      setSess(data as Session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scoring failed");
    } finally {
      setFinishing(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="skeleton" style={{ width: 280, height: 32 }} />
      </div>
    );
  }

  if (!sess) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ padding: 40, maxWidth: 480, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Interview not found</h1>
          <div style={{ marginTop: 14 }}>
            <MagneticButton onClick={() => router.push("/interviews")}>Back to interviews</MagneticButton>
          </div>
        </div>
      </div>
    );
  }

  const guestMeta = getGuestMeta();
  const userName = session?.user?.name?.split(" ")[0] || guestMeta?.handle || "there";
  const turnCount = sess.messages.filter((m) => m.role === "candidate").length;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Sidebar
        active="interviews"
        userName={userName}
        userEmail={session?.user?.email || (guestMeta ? "guest mode" : undefined)}
        userHandle={session?.user?.handle || guestMeta?.handle}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar
          title={sess.role}
          subtitle={`${sess.level} · ${turnCount} answer${turnCount === 1 ? "" : "s"}${sess.focus ? ` · focus: ${sess.focus}` : ""}`}
          right={
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="pill" style={{ color: sess.status === "complete" ? "#6ee7b7" : "#a5b4fc" }}>
                {sess.status === "complete" ? "complete" : "live"}
              </span>
              {sess.status === "active" && turnCount >= 2 && (
                <button
                  onClick={finish}
                  className="btn-magnetic btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                  disabled={finishing}
                >
                  {finishing ? "Scoring…" : (
                    <>
                      <Icon name="check" size={13} /> Finish & score
                    </>
                  )}
                </button>
              )}
            </div>
          }
        />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 24, padding: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 200px)", minHeight: 480 }}>
            <div
              ref={scrollRef}
              className="card"
              style={{
                flex: 1,
                padding: 20,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              {sess.messages.length === 0 && (
                <p style={{ color: "var(--text-mid)", fontSize: 14, textAlign: "center", margin: "auto" }}>
                  Waiting for the interviewer to open…
                </p>
              )}
              {sess.messages.map((m, i) => (
                <MessageBubble key={i} message={m} />
              ))}
              {sending && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-mid)", fontSize: 12 }}>
                  <span
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 999,
                      border: "2px solid rgba(165,180,252,0.4)",
                      borderTopColor: "#a5b4fc",
                      animation: "spin 0.8s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Interviewer is thinking…
                </div>
              )}
            </div>

            {sess.status === "active" ? (
              <div className="card" style={{ marginTop: 14, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <SmallEyebrow>Your answer</SmallEyebrow>
                  <VoiceInput
                    disabled={sending}
                    onTranscript={(text) => {
                      setDraft((prev) => (prev ? prev + " " + text : text));
                      setDraftFromVoice(true);
                    }}
                  />
                </div>
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (draftFromVoice && e.target.value !== draft) {
                      // user edited the transcribed text — keep the voice flag if untouched
                    }
                  }}
                  placeholder="Type or speak your answer…"
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-1)",
                    border: "none",
                    color: "var(--text-hi)",
                    fontSize: 14,
                    boxShadow: "inset 0 0 0 1px var(--border)",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
                  <div style={{ fontSize: 11, color: "var(--text-mid)" }}>
                    {draftFromVoice && <span><Icon name="mic" size={10} /> voice draft</span>}
                  </div>
                  <MagneticButton onClick={sendTurn} disabled={sending || draft.trim().length === 0}>
                    {sending ? "Sending…" : (
                      <>
                        <Icon name="arrow-right" size={14} /> Submit answer
                      </>
                    )}
                  </MagneticButton>
                </div>
                {error && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: "rgba(248,113,113,0.08)",
                      color: "#fca5a5",
                      fontSize: 12,
                      boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.3)",
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 14 }}>
                <MagneticButton onClick={() => router.push("/interviews")}>
                  <Icon name="arrow-right" size={14} /> Back to interviews
                </MagneticButton>
              </div>
            )}
          </div>

          <aside style={{ position: "sticky", top: 100, alignSelf: "flex-start" }}>
            {sess.status === "complete" && sess.score ? (
              <ScoreCard score={sess.score} modelsUsed={sess.modelsUsed} />
            ) : (
              <LiveCard sess={sess} />
            )}
          </aside>
        </div>
      </main>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 1100px) {
          aside[style*="position: sticky"] { display: none; }
          main > div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isInterviewer = message.role === "interviewer";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isInterviewer ? "flex-start" : "flex-end",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          padding: "12px 16px",
          borderRadius: 14,
          background: isInterviewer ? "var(--bg-1)" : "rgba(99,102,241,0.12)",
          color: "var(--text-hi)",
          fontSize: 14,
          lineHeight: 1.6,
          boxShadow: isInterviewer ? "inset 0 0 0 1px var(--border)" : "inset 0 0 0 1px rgba(99,102,241,0.3)",
        }}
      >
        <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", letterSpacing: ".14em", marginBottom: 6 }}>
          {isInterviewer ? "INTERVIEWER" : "YOU"}
          {message.fromVoice && (
            <span style={{ marginLeft: 8 }}>
              <Icon name="mic" size={10} /> voice
            </span>
          )}
        </div>
        <div style={{ whiteSpace: "pre-wrap" }}>{message.content}</div>
      </div>
    </div>
  );
}

function LiveCard({ sess }: { sess: Session }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <SmallEyebrow>Live session</SmallEyebrow>
      <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
        Aim for ~5–8 substantive exchanges before finishing. The interviewer adapts to your answers — depth scores higher than breadth.
      </p>
      <div style={{ marginTop: 16, display: "grid", gap: 6 }}>
        <Tip text="Speak out loud — the mic auto-transcribes." />
        <Tip text="It's fine to think aloud, ramble, or backtrack." />
        <Tip text="When stuck, ask a clarifying question." />
      </div>
      {sess.modelsUsed.length > 0 && (
        <div style={{ marginTop: 18, padding: 12, borderRadius: 10, background: "var(--bg-2)" }}>
          <SmallEyebrow>Running on</SmallEyebrow>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 6 }}>
            {sess.modelsUsed[sess.modelsUsed.length - 1]?.model || "—"}
            {sess.modelsUsed[sess.modelsUsed.length - 1]?.provider
              ? ` · ${sess.modelsUsed[sess.modelsUsed.length - 1]?.provider}`
              : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreCard({ score, modelsUsed }: { score: Score; modelsUsed: ModelUsed[] }) {
  const scoringModel = modelsUsed.find((m) => m.stage === "score");
  const pct = Math.round((score.overall || 0) * 100);
  const recLabel = RECOMMENDATION_LABEL[score.recommendation] || "—";
  return (
    <div className="card" style={{ padding: 22 }}>
      <SmallEyebrow>Scored</SmallEyebrow>
      <h2 className="serif" style={{ fontSize: 36, margin: "6px 0 4px", letterSpacing: "-.02em" }}>
        {pct}%
      </h2>
      <p style={{ fontSize: 13, color: "var(--text-mid)", marginBottom: 14 }}>
        Recommendation: <span style={{ color: "var(--text-hi)" }}>{recLabel}</span>
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        <Metric label="Technical" value={score.technical} accent="#a5b4fc" />
        <Metric label="Communication" value={score.communication} accent="#6ee7b7" />
        <Metric label="Problem-solving" value={score.problemSolving} accent="#fdba74" />
      </div>
      {score.summary && (
        <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 16, lineHeight: 1.6 }}>
          {score.summary}
        </p>
      )}
      {(score.strengths?.length || score.improvements?.length) && (
        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          {score.strengths?.length > 0 && (
            <div>
              <SmallEyebrow>Strengths</SmallEyebrow>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6 }}>
                {score.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {score.improvements?.length > 0 && (
            <div>
              <SmallEyebrow>To work on</SmallEyebrow>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6 }}>
                {score.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      {scoringModel?.model && (
        <div style={{ marginTop: 16, padding: 10, borderRadius: 8, background: "var(--bg-2)" }}>
          <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)" }}>
            Scored by {scoringModel.model}
            {scoringModel.provider ? ` · ${scoringModel.provider}` : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: number; accent: string }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-mid)" }}>
        <span>{label}</span>
        <span className="mono">{pct}%</span>
      </div>
      <div style={{ marginTop: 4, height: 4, borderRadius: 999, background: "var(--bg-2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: accent }} />
      </div>
    </div>
  );
}

function Tip({ text }: { text: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12, color: "var(--text-mid)" }}>
      <Icon name="sparkles" size={11} style={{ color: "var(--text-lo)", marginTop: 2 }} />
      <span>{text}</span>
    </div>
  );
}

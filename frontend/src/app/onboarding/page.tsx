"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  CairnMark,
  Icon,
  MagneticButton,
  ProviderChain,
  SmallEyebrow,
  Typewriter,
} from "@/components/ui/primitives";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";
import { TryAsGuestButton } from "@/components/TryAsGuestButton";

type PathError = {
  error?: string;
  message?: string;
  hint?: string;
  trace?: { provider: string; model: string; error: string }[];
};

const EXAMPLES = [
  "I want to become an AI engineer in 6 months. I know Python.",
  "Land a frontend role at a startup. I have a CS degree but no shipped projects.",
  "Pivot from PM to ML researcher. 10h/week.",
  "Build and launch an iOS app from scratch.",
];

const SUGGESTIONS = ["AI Engineer", "Frontend Developer", "ML Researcher", "iOS Developer", "DevRel", "Design Engineer"];

const StepDots = ({ step, total }: { step: number; total: number }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i <= step ? 28 : 8,
          height: 8,
          borderRadius: 999,
          background: i <= step ? "linear-gradient(90deg, var(--primary), var(--mint))" : "var(--bg-3)",
          transition: "all .4s cubic-bezier(.16,1,.3,1)",
        }}
      />
    ))}
  </div>
);

export default function OnboardingPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState("");
  const [phIdx, setPhIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<PathError | string | null>(null);
  const [hasGuest, setHasGuest] = useState(false);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
  }, []);

  useEffect(() => {
    if (goal) return;
    const t = setInterval(() => setPhIdx((i) => (i + 1) % EXAMPLES.length), 4000);
    return () => clearInterval(t);
  }, [goal]);

  // Auth gate
  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card-elev" style={{ width: 460, padding: 36, position: "relative", zIndex: 2 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <CairnMark size={20} />
            <span className="serif" style={{ fontSize: 20 }}>Cairn</span>
          </Link>
          <SmallEyebrow>Choose how to start</SmallEyebrow>
          <h1 className="serif" style={{ fontSize: 36, margin: "10px 0 8px", letterSpacing: "-.02em" }}>
            Let's <i>plot a course</i>.
          </h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 22 }}>
            Sign in with GitHub to save progress and earn credentials, or try as a guest first.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <MagneticButton onClick={() => signIn("github", { callbackUrl: "/onboarding" })}>
              <Icon name="github" size={14} /> Sign in with GitHub
            </MagneticButton>
            <TryAsGuestButton className="btn-magnetic btn-ghost" redirectTo="/onboarding" />
          </div>
        </div>
      </div>
    );
  }

  async function submit() {
    if (goal.trim().length < 10) {
      setError("Tell us a bit more — at least a sentence or two.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await proxyFetch("/paths", {
        method: "POST",
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) {
        const body: PathError = await res.json().catch(() => ({}));
        // Pass through the structured error so the UI can show provider trace + hint
        setError({
          error: body.error || `Backend returned ${res.status}`,
          message: body.message,
          hint: body.hint,
          trace: body.trace,
        });
        setGenerating(false);
        return;
      }
      // Let the generating scene play, then route
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch (e) {
      setError({
        error: "Network error",
        message: e instanceof Error ? e.message : "Could not reach the server.",
        hint: "Make sure the backend is running on the configured port and your env vars are set.",
      });
      setGenerating(false);
    }
  }

  const userName = session?.user?.name?.split(" ")[0] || "there";
  const handle = session?.user?.handle;

  return (
    <div style={{ minHeight: "100vh", position: "relative", overflow: "hidden" }}>
      <GuestBanner />
      <div
        style={{
          padding: "24px 28px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CairnMark size={22} />
          <span className="serif" style={{ fontSize: 22 }}>Cairn</span>
        </Link>
        <StepDots step={generating ? 3 : step + 1} total={4} />
      </div>

      <div className="container" style={{ position: "relative", zIndex: 2, paddingTop: 80, paddingBottom: 80, maxWidth: 760 }}>
        {generating ? (
          <GeneratingScene />
        ) : step === 0 ? (
          <div style={{ textAlign: "center", marginTop: 40 }}>
            <div style={{ display: "inline-block", position: "relative" }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: 999,
                  background: "linear-gradient(135deg, #FB923C, #8B5CF6)",
                  boxShadow: "0 0 0 4px rgba(99,102,241,0.25)",
                  margin: "0 auto",
                  animation: "fadeUp .6s both",
                }}
              />
              {handle && (
                <div className="pill pill-mint" style={{ position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)" }}>
                  <Icon name="github" size={10} /> @{handle}
                </div>
              )}
            </div>
            <h1 className="serif italic" style={{ fontSize: "clamp(40px, 6vw, 64px)", margin: "40px 0 0", lineHeight: 1, letterSpacing: "-.03em" }}>
              Hi {userName}. Let's <span className="grad-text">plot a course</span>.
            </h1>
            <p style={{ color: "var(--text-mid)", fontSize: 18, marginTop: 18, maxWidth: 480, marginInline: "auto", lineHeight: 1.5 }}>
              We'll ask you one big question, build a 12-week plan, and verify every project you ship. Should take about 90 seconds.
            </p>
            <div style={{ marginTop: 36 }}>
              <MagneticButton onClick={() => setStep(1)}>
                Begin <Icon name="arrow-right" size={14} />
              </MagneticButton>
            </div>
            <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-lo)" }}>
              Press <span className="kbd">Enter</span> to continue
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 40 }}>
            <SmallEyebrow>Step 1 · Your goal</SmallEyebrow>
            <h2 className="serif" style={{ fontSize: "clamp(36px, 5vw, 56px)", margin: "14px 0 0", lineHeight: 1, letterSpacing: "-.025em" }}>
              Where do you want to <i>land</i>?
            </h2>
            <p style={{ color: "var(--text-mid)", fontSize: 17, marginTop: 14, maxWidth: 560 }}>
              Tell us in plain English. The more specific you are about timeline and current skills, the better the plan.
            </p>
            <div style={{ marginTop: 36, position: "relative" }}>
              <div
                style={{
                  padding: 2,
                  borderRadius: 18,
                  background: goal ? "linear-gradient(135deg, rgba(99,102,241,0.5), rgba(52,211,153,0.3))" : "var(--border-strong)",
                  transition: "all .25s ease",
                }}
              >
                <div style={{ background: "var(--bg-1)", borderRadius: 16, padding: 20, position: "relative" }}>
                  <textarea
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    rows={4}
                    autoFocus
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      resize: "none",
                      color: "var(--text-hi)",
                      fontFamily: "var(--sans)",
                      fontSize: 18,
                      lineHeight: 1.55,
                    }}
                  />
                  {!goal && (
                    <div
                      style={{
                        position: "absolute",
                        top: 20,
                        left: 20,
                        right: 20,
                        color: "var(--text-lo)",
                        fontSize: 18,
                        pointerEvents: "none",
                        lineHeight: 1.55,
                      }}
                    >
                      <Typewriter key={phIdx} text={EXAMPLES[phIdx]} speed={28} cursor={false} />
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-end",
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    <button
                      onClick={submit}
                      disabled={!goal.trim() || generating}
                      className="btn-magnetic btn-primary"
                      style={{ padding: "10px 16px", opacity: !goal.trim() ? 0.4 : 1 }}
                    >
                      {generating ? (
                        <>
                          <span
                            style={{
                              display: "inline-block",
                              width: 12,
                              height: 12,
                              border: "2px solid rgba(255,255,255,0.3)",
                              borderTopColor: "#fff",
                              borderRadius: 999,
                              animation: "spin 1s linear infinite",
                            }}
                          />{" "}
                          Generating…
                        </>
                      ) : (
                        <>
                          Generate path <Icon name="arrow-right" size={14} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {error && <ErrorPanel error={error} />}

            <div style={{ marginTop: 24 }}>
              <div
                className="mono"
                style={{
                  fontSize: 11,
                  color: "var(--text-mid)",
                  textTransform: "uppercase",
                  letterSpacing: ".14em",
                  marginBottom: 10,
                }}
              >
                Or pick a starting point
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={s}
                    onClick={() => setGoal(`I want to become a ${s} in 6 months. I have basic programming skills and can spend ~10 hours per week.`)}
                    className="pill"
                    style={{
                      padding: "8px 14px",
                      fontSize: 13,
                      cursor: "pointer",
                      border: "none",
                      animation: `fadeUp .4s ${i * 60}ms both`,
                    }}
                  >
                    + {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 36, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <ProviderChain providers={["Gemma 4 27B", "Gemini Pro", "DeepSeek"]} active={0} />
              <div className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
                routed automatically · fallback on rate-limit
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ErrorPanel = ({ error }: { error: PathError | string }) => {
  if (typeof error === "string") {
    return (
      <div
        style={{
          marginTop: 14,
          padding: 14,
          borderRadius: 12,
          background: "rgba(248,113,113,0.08)",
          boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.3)",
          color: "#fca5a5",
          fontSize: 13,
        }}
      >
        {error}
      </div>
    );
  }
  return (
    <div
      style={{
        marginTop: 14,
        padding: 16,
        borderRadius: 12,
        background: "rgba(248,113,113,0.06)",
        boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <Icon name="x" size={14} style={{ color: "#fca5a5" }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#fca5a5" }}>{error.error || "Path generation failed"}</span>
      </div>
      {error.message && (
        <div className="mono" style={{ fontSize: 12, color: "var(--text-hi)", lineHeight: 1.5, marginBottom: 8 }}>
          {error.message}
        </div>
      )}
      {error.hint && (
        <div
          style={{
            marginTop: 8,
            padding: "8px 10px",
            borderRadius: 8,
            background: "rgba(99,102,241,0.08)",
            boxShadow: "inset 0 0 0 1px rgba(99,102,241,0.25)",
            fontSize: 12,
            color: "#c7d2fe",
          }}
        >
          <Icon name="sparkles" size={11} style={{ marginRight: 6, verticalAlign: "middle" }} />
          {error.hint}
        </div>
      )}
      {error.trace?.length ? (
        <details style={{ marginTop: 10 }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: 11,
              color: "var(--text-mid)",
              textTransform: "uppercase",
              letterSpacing: ".14em",
            }}
          >
            Provider trace ({error.trace.length} attempt{error.trace.length === 1 ? "" : "s"})
          </summary>
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
            {error.trace.map((t, i) => (
              <div
                key={i}
                className="mono"
                style={{
                  fontSize: 11,
                  padding: "6px 10px",
                  borderRadius: 6,
                  background: "var(--bg-2)",
                  color: "var(--text-mid)",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                }}
              >
                <span style={{ color: "#fdba74" }}>{t.provider}/{t.model}</span> — {t.error}
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
};

const GeneratingScene = () => {
  const tokens = [
    "phase 1",
    "milestone",
    "project",
    "review",
    "phase 2",
    "vision",
    "27B",
    "12B",
    "signed",
    "credential",
    "phase 3",
    "portfolio",
    "ship",
    "PyTorch",
    "LangChain",
    "eval",
  ];
  const phases = [
    "Researching learning paths…",
    "Pacing milestones to 12 weeks…",
    "Curating free resources…",
    "Designing shippable projects…",
    "Sealing credential schema…",
  ];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => s + 1), 800);
    return () => clearInterval(t);
  }, []);
  return (
    <div
      style={{
        textAlign: "center",
        position: "relative",
        minHeight: 600,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "relative", width: 360, height: 360 }}>
        {[0, 60, 120].map((d, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              inset: i * 20,
              borderRadius: 999,
              border: "1px solid rgba(99,102,241,0.25)",
              borderTopColor: i === 0 ? "#818CF8" : i === 1 ? "#34D399" : "#FB923C",
              animation: `spin ${4 + i * 1.5}s linear infinite ${i % 2 ? "reverse" : ""}`,
            }}
          />
        ))}
        <div
          style={{
            position: "absolute",
            inset: "30%",
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(99,102,241,0.45), transparent 70%)",
            filter: "blur(10px)",
            animation: "pulseGlow 2.5s ease-in-out infinite",
          }}
        />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CairnMark size={56} />
        </div>
        {tokens.map((tk, i) => {
          const ang = (i / tokens.length) * Math.PI * 2;
          const r = 160 + (i % 3) * 20;
          const cx = 180 + Math.cos(ang) * r;
          const cy = 180 + Math.sin(ang) * r;
          return (
            <span
              key={i}
              className="mono"
              style={{
                position: "absolute",
                left: cx,
                top: cy,
                transform: "translate(-50%,-50%)",
                fontSize: 11,
                color: i % 3 === 0 ? "#a5b4fc" : i % 3 === 1 ? "#6ee7b7" : "#fdba74",
                opacity: 0.7,
                animation: `tokenFloat ${4 + (i % 4)}s ease-in-out infinite ${i * 0.15}s`,
                whiteSpace: "nowrap",
                pointerEvents: "none",
              }}
            >
              {tk}
            </span>
          );
        })}
      </div>
      <div style={{ marginTop: 40 }}>
        <div className="serif italic" style={{ fontSize: 36, letterSpacing: "-.02em" }}>
          {phases[Math.min(step, phases.length - 1)]}
        </div>
        <div style={{ marginTop: 14 }}>
          <ProviderChain providers={["Gemma 4 27B", "Gemini", "DeepSeek"]} active={0} />
        </div>
        <div
          style={{
            marginTop: 14,
            fontFamily: "var(--mono)",
            fontSize: 11,
            color: "var(--text-lo)",
            letterSpacing: ".1em",
          }}
        >
          T+{(step * 0.8).toFixed(1)}s · routing tokens · streaming
        </div>
      </div>
    </div>
  );
};

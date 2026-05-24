"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import {
  Icon,
  KPIChip,
  MagneticButton,
  ProgressRing,
  ProviderChain,
  SmallEyebrow,
  Typewriter,
} from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type Screenshot = { label: string; dataUrl: string; tone?: string };

const SHOT_TONES = ["#6366F1", "#34D399", "#FB923C", "#8B5CF6"];

export default function NewProjectPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [repoUrl, setRepoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillsInput, setSkillsInput] = useState("");
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGuest, setHasGuest] = useState(false);
  const [guestAllowsScreenshots, setGuestAllowsScreenshots] = useState(true);

  useEffect(() => {
    const t = getGuestToken();
    setHasGuest(!!t);
    const m = getGuestMeta();
    setGuestAllowsScreenshots(m?.limits?.allowScreenshots ?? true);
  }, []);

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card-elev" style={{ padding: 36, maxWidth: 420, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0, letterSpacing: "-.02em" }}>Sign in to submit</h1>
          <div style={{ marginTop: 18, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <MagneticButton onClick={() => signIn("github")}>
              <Icon name="github" size={14} /> GitHub
            </MagneticButton>
            <MagneticButton variant="ghost" onClick={() => signIn("google")}>
              <Icon name="google" size={14} /> Google
            </MagneticButton>
          </div>
        </div>
      </div>
    );
  }

  const isGuest = !!hasGuest && status !== "authenticated";
  const screenshotsDisabled = isGuest && !guestAllowsScreenshots;
  const valid = repoUrl.startsWith("https://github.com/") || repoUrl.startsWith("github.com/");
  const repoSegments = repoUrl.replace(/^https?:\/\//, "").replace(/^github\.com\//, "");

  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    const newOnes: Screenshot[] = [];
    for (const f of Array.from(files).slice(0, 4 - screenshots.length)) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 5 * 1024 * 1024) {
        setError(`${f.name} is too large — max 5 MB`);
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
      newOnes.push({
        label: f.name,
        dataUrl,
        tone: SHOT_TONES[(screenshots.length + newOnes.length) % SHOT_TONES.length],
      });
    }
    setScreenshots([...screenshots, ...newOnes]);
  }

  function addSkill(text: string) {
    const t = text.trim();
    if (!t) return;
    if (skills.includes(t)) return;
    setSkills([...skills, t]);
  }

  async function submit() {
    setError(null);
    const url = repoUrl.startsWith("http") ? repoUrl : `https://${repoUrl}`;
    if (!url.includes("github.com")) {
      setError("Please paste a github.com repo URL.");
      return;
    }
    if (title.trim().length < 2) {
      setError("Give your project a title.");
      return;
    }
    if (skills.length === 0) {
      setError("List at least one skill this project demonstrates.");
      return;
    }

    setScanning(true);
    try {
      const res = await proxyFetch("/evaluations", {
        method: "POST",
        body: JSON.stringify({
          repoUrl: url,
          projectTitle: title,
          claimedSkills: skills,
          screenshots: screenshotsDisabled ? [] : screenshots.map(({ label, dataUrl }) => ({ label, dataUrl })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || "Evaluation failed");
      // Let the scanning scene play through, then route
      setTimeout(() => router.push(`/projects/${data._id}`), 9000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setScanning(false);
    }
  }

  const guestMeta = getGuestMeta();
  const userName = session?.user?.name?.split(" ")[0] || guestMeta?.handle || "Guest";

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Sidebar
        active="projects-new"
        userName={userName}
        userEmail={session?.user?.email || (isGuest ? "guest mode" : undefined)}
        userHandle={session?.user?.handle || guestMeta?.handle}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar
          title="Submit a project"
          subtitle="Multimodal evaluation · Gemma 4 27B + 12B"
          right={
            <span className="pill">
              <Icon name="cmd" size={11} /> <span className="kbd">⌘</span> <span className="kbd">K</span>
            </span>
          }
        />

        {scanning ? (
          <EvaluationScene />
        ) : (
          <div className="new-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: 32 }}>
            <div>
              <div className="card" style={{ padding: 24 }}>
                <SmallEyebrow>01 · Repository</SmallEyebrow>
                <div style={{ marginTop: 12 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "var(--bg-2)",
                      boxShadow: valid
                        ? "inset 0 0 0 1px rgba(52,211,153,0.3)"
                        : "inset 0 0 0 1px var(--border-strong)",
                      fontFamily: "var(--mono)",
                      fontSize: 14,
                    }}
                  >
                    <span style={{ color: "var(--text-mid)" }}>gh:</span>
                    <input
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      placeholder="github.com/you/your-project"
                      style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        outline: "none",
                        color: "var(--text-hi)",
                        fontFamily: "inherit",
                        fontSize: 14,
                      }}
                    />
                    {repoUrl &&
                      (valid ? (
                        <Icon name="check" size={14} style={{ color: "#6ee7b7" }} />
                      ) : (
                        <Icon name="x" size={14} style={{ color: "#f87171" }} />
                      ))}
                  </div>
                </div>
                {valid && (
                  <div
                    style={{
                      marginTop: 14,
                      padding: 14,
                      borderRadius: 12,
                      background: "var(--bg-0)",
                      boxShadow: "inset 0 0 0 1px var(--border)",
                      animation: "fadeUp .3s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: "linear-gradient(135deg, #6366F1, #34D399)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Icon name="github" size={18} style={{ color: "#fff" }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15 }}>{repoSegments || "your repo"}</div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            marginTop: 4,
                            fontSize: 11,
                            color: "var(--text-mid)",
                          }}
                        >
                          <span>· fetching metadata on submit</span>
                        </div>
                      </div>
                      <span className="pill pill-mint" style={{ fontSize: 10 }}>ready</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="card" style={{ padding: 24, marginTop: 16 }}>
                <SmallEyebrow>02 · Project title</SmallEyebrow>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. RAG chatbot for course notes"
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: "12px 14px",
                    borderRadius: 12,
                    background: "var(--bg-2)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                    border: "none",
                    outline: "none",
                    color: "var(--text-hi)",
                    fontSize: 14,
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div className="card" style={{ padding: 24, marginTop: 16 }}>
                <SmallEyebrow>03 · Screenshots (up to 4)</SmallEyebrow>
                {screenshotsDisabled ? (
                  <div
                    style={{
                      marginTop: 12,
                      padding: 16,
                      borderRadius: 12,
                      background: "rgba(251,146,60,0.08)",
                      boxShadow: "inset 0 0 0 1px rgba(251,146,60,0.3)",
                      fontSize: 13,
                      color: "#fdba74",
                    }}
                  >
                    Visual review is disabled for guests. Sign in with GitHub to upload screenshots.
                  </div>
                ) : (
                  <ShotsDropzone shots={screenshots} setShots={setScreenshots} onPickFiles={onPickFiles} />
                )}
              </div>

              <div className="card" style={{ padding: 24, marginTop: 16 }}>
                <SmallEyebrow>04 · Skills demonstrated</SmallEyebrow>
                <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {skills.map((t) => (
                    <span key={t} className="pill pill-indigo" style={{ padding: "6px 12px", fontSize: 12 }}>
                      {t}
                      <button
                        onClick={() => setSkills(skills.filter((x) => x !== t))}
                        style={{ background: "none", border: "none", color: "inherit", opacity: 0.5, cursor: "pointer", padding: 0 }}
                      >
                        <Icon name="x" size={10} />
                      </button>
                    </span>
                  ))}
                  <input
                    placeholder="+ add"
                    value={skillsInput}
                    onChange={(e) => setSkillsInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && skillsInput.trim()) {
                        e.preventDefault();
                        addSkill(skillsInput);
                        setSkillsInput("");
                      } else if (e.key === "," && skillsInput.trim()) {
                        e.preventDefault();
                        addSkill(skillsInput);
                        setSkillsInput("");
                      }
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      fontSize: 12,
                      padding: "6px 8px",
                      color: "var(--text-hi)",
                      minWidth: 80,
                      fontFamily: "inherit",
                    }}
                  />
                </div>
                <p style={{ marginTop: 10, fontSize: 11, color: "var(--text-mid)" }}>
                  Press Enter to add. We'll check whether the code actually demonstrates these.
                </p>
              </div>

              {error && (
                <div
                  style={{
                    marginTop: 14,
                    padding: 12,
                    borderRadius: 10,
                    background: "rgba(248,113,113,0.08)",
                    boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.3)",
                    color: "#fca5a5",
                    fontSize: 13,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginTop: 24, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
                  ~ 30-60s eval · Gemma 4 27B + 12B
                </div>
                <MagneticButton onClick={submit}>
                  <Icon name="sparkles" size={14} /> Submit for evaluation
                </MagneticButton>
              </div>
            </div>

            {/* RIGHT: preview */}
            <div>
              <div className="card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 100 }}>
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <SmallEyebrow>Preview · what we'll evaluate</SmallEyebrow>
                  <span style={{ flex: 1 }} />
                  <span className="pill" style={{ fontSize: 10 }}>live</span>
                </div>
                <div style={{ padding: 18 }}>
                  <div className="mono" style={{ fontSize: 11, color: "var(--text-mid)", marginBottom: 8 }}>
                    Eval plan
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[
                      ["Structural scan", "Gemma 4 4B", "~15s"],
                      ["Code review", "Gemma 4 27B", "~80s"],
                      ["Visual review", "Gemma 4 12B", "~40s"],
                      ["Synthesize + sign", "Gemma 4 12B", "~10s"],
                    ].map(([s, m, t], i) => (
                      <div
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          padding: "8px 12px",
                          borderRadius: 8,
                          background: "var(--bg-2)",
                        }}
                      >
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)", width: 18 }}>{i + 1}</span>
                        <span style={{ fontSize: 13 }}>{s}</span>
                        <span style={{ flex: 1 }} />
                        <span className="mono" style={{ fontSize: 10, color: "var(--text-mid)" }}>{m} · {t}</span>
                      </div>
                    ))}
                  </div>

                  {screenshots.length > 0 && (
                    <>
                      <div className="mono" style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 16, marginBottom: 8 }}>
                        Screenshots queued
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {screenshots.slice(0, 4).map((s, i) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={i}
                            src={s.dataUrl}
                            alt={s.label}
                            style={{
                              width: "100%",
                              aspectRatio: "16/10",
                              objectFit: "cover",
                              borderRadius: 8,
                              boxShadow: "inset 0 0 0 1px var(--border)",
                            }}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: 18 }}>
                    <ProviderChain providers={["Gemma 4 27B", "Gemini 2.5", "DeepSeek"]} active={0} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`
        @media (max-width: 1100px) {
          aside { display: none; }
          .new-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const ShotsDropzone = ({
  shots,
  setShots,
  onPickFiles,
}: {
  shots: Screenshot[];
  setShots: (s: Screenshot[]) => void;
  onPickFiles: (files: FileList | null) => void;
}) => {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        onPickFiles(e.dataTransfer.files);
      }}
      style={{
        marginTop: 12,
        borderRadius: 14,
        padding: 20,
        border: "1.5px dashed var(--border-strong)",
        background: over ? "rgba(99,102,241,0.08)" : "var(--bg-2)",
        transition: "all .2s",
        textAlign: "center",
        position: "relative",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        style={{ display: "none" }}
        onChange={(e) => onPickFiles(e.target.files)}
      />
      {shots.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", width: "100%" }}
        >
          <Icon name="upload" size={28} style={{ color: "var(--text-mid)", margin: "8px auto" }} />
          <div style={{ fontSize: 15, marginTop: 6 }}>Drag &amp; drop, or click to browse</div>
          <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 4 }}>PNG, JPG, WebP · 4 max · 5MB each</div>
        </button>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {shots.map((s, i) => (
            <div
              key={i}
              style={{
                aspectRatio: "16/10",
                borderRadius: 8,
                background: `linear-gradient(135deg, ${s.tone || "#6366F1"}66, ${s.tone || "#6366F1"}11)`,
                boxShadow: "inset 0 0 0 1px var(--border)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.dataUrl} alt={s.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              <button
                onClick={() => setShots(shots.filter((_, j) => j !== i))}
                style={{
                  position: "absolute",
                  top: 4,
                  right: 4,
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  background: "rgba(0,0,0,.55)",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Icon name="x" size={10} />
              </button>
              <div
                className="mono"
                style={{
                  position: "absolute",
                  bottom: 4,
                  left: 6,
                  fontSize: 9,
                  color: "#fff",
                  textShadow: "0 1px 2px rgba(0,0,0,.6)",
                }}
              >
                {s.label.length > 18 ? s.label.slice(0, 16) + "…" : s.label}
              </div>
            </div>
          ))}
          {shots.length < 4 && (
            <button
              onClick={() => inputRef.current?.click()}
              style={{
                aspectRatio: "16/10",
                borderRadius: 8,
                background: "var(--bg-0)",
                boxShadow: "inset 0 0 0 1.5px dashed var(--border-strong)",
                color: "var(--text-mid)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="plus" size={20} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const STAGES = [
  { n: 1, name: "Structural", model: "Gemma 4 4B", dur: 2000 },
  { n: 2, name: "Code review", model: "Gemma 4 27B", dur: 3200 },
  { n: 3, name: "Visual review", model: "Gemma 4 12B", dur: 3000 },
  { n: 4, name: "Synthesis", model: "Gemma 4 12B", dur: 1800 },
];

const STAGE_FINDINGS: [string, string][] = [
  ["Structure looks clean — clear separation between modules.", "#6ee7b7"],
  ["Test coverage is solid on core paths; edge cases could use more attention.", "#fdba74"],
  ["Streaming uses async generators idiomatically.", "#a5b4fc"],
  ["Found minor improvements: race on retries, null check on empty response.", "#fdba74"],
  ["Overall: a strong deliverable. Ship it.", "#6ee7b7"],
];

const EvaluationScene = () => {
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancel = false;
    const start = Date.now();
    const total = STAGES.reduce((a, s) => a + s.dur, 0);
    const tick = () => {
      if (cancel) return;
      const t = Date.now() - start;
      let acc = 0;
      let s = 0;
      for (let i = 0; i < STAGES.length; i++) {
        if (t < acc + STAGES[i].dur) {
          s = i;
          break;
        }
        acc += STAGES[i].dur;
        if (i === STAGES.length - 1) s = i + 1;
      }
      setStage(s);
      setProgress(Math.min(1, t / total));
      if (t < total) requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div style={{ padding: 40, minHeight: "calc(100vh - 80px)", position: "relative" }}>
      <div style={{ position: "relative", zIndex: 2, maxWidth: 1100, margin: "0 auto" }}>
        <SmallEyebrow>Evaluating your project</SmallEyebrow>
        <h2 className="serif" style={{ fontSize: "clamp(32px, 4vw, 48px)", margin: "12px 0 8px", letterSpacing: "-.025em" }}>
          {stage < STAGES.length ? (
            <>
              Stage {stage + 1} · <i>{STAGES[stage]?.name}</i>
            </>
          ) : (
            <>
              Sealing your <i>credential</i>…
            </>
          )}
        </h2>
        <div style={{ color: "var(--text-mid)", fontSize: 15, maxWidth: 600 }}>
          {stage < STAGES.length && <>Running on {STAGES[stage]?.model}. Findings stream in real time.</>}
        </div>

        <div
          className="pipeline"
          style={{ marginTop: 36, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, position: "relative" }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 40,
              height: 2,
              background: "var(--bg-3)",
              borderRadius: 2,
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 40,
              height: 2,
              width: `${progress * 100}%`,
              background: "linear-gradient(90deg, var(--primary), var(--mint), var(--warm))",
              borderRadius: 2,
              transition: "width .3s ease",
              boxShadow: "0 0 20px var(--primary-glow)",
              zIndex: 1,
            }}
          />
          {STAGES.map((s, i) => {
            const state = i < stage ? "done" : i === stage ? "active" : "idle";
            return (
              <div key={s.n} style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                <div
                  style={{
                    margin: "0 auto",
                    width: 80,
                    height: 80,
                    borderRadius: 999,
                    background:
                      state === "active"
                        ? "linear-gradient(135deg, var(--primary), var(--mint))"
                        : state === "done"
                        ? "linear-gradient(135deg, #34D399, #6ee7b7)"
                        : "var(--bg-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow:
                      state === "active"
                        ? "0 0 40px var(--primary-glow), inset 0 0 0 2px rgba(255,255,255,0.2)"
                        : state === "done"
                        ? "0 0 30px rgba(52,211,153,0.4)"
                        : "inset 0 0 0 1px var(--border-strong)",
                  }}
                >
                  {state === "done" ? (
                    <Icon name="check" size={28} stroke={2} style={{ color: "#0a0a0f" }} />
                  ) : state === "active" ? (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        border: "3px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: 999,
                        animation: "spin 1s linear infinite",
                      }}
                    />
                  ) : (
                    <span className="mono" style={{ fontSize: 16, color: "var(--text-lo)" }}>{s.n}</span>
                  )}
                </div>
                <div
                  className="serif"
                  style={{ marginTop: 14, fontSize: 18, color: state === "idle" ? "var(--text-mid)" : "var(--text-hi)" }}
                >
                  {s.name}
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", marginTop: 4 }}>{s.model}</div>
              </div>
            );
          })}
        </div>

        <div className="stage-detail" style={{ marginTop: 48, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <StageLeftPanel stage={stage} />
          <StageRightPanel stage={stage} />
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .pipeline { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .stage-detail { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

const StageLeftPanel = ({ stage }: { stage: number }) => {
  if (stage === 0) {
    return (
      <div className="card" style={{ padding: 20, animation: "fadeUp .3s ease" }}>
        <SmallEyebrow>Structural · live counts</SmallEyebrow>
        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <KPIChip label="Commits" value={142} icon="route" accent="#a5b4fc" />
          <KPIChip label="Test cov." value={96} suffix="%" icon="check" accent="#6ee7b7" />
          <KPIChip label="Lines" value={2843} icon="cube" accent="#fdba74" />
          <KPIChip label="README" value={8.4} icon="badge" accent="#a5b4fc" />
        </div>
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className="card" style={{ padding: 0, animation: "fadeUp .3s ease", overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
          <SmallEyebrow>Repo snapshot</SmallEyebrow>
          <span style={{ flex: 1 }} />
          <ProviderChain providers={["Gemma 4 27B", "Gemini"]} active={0} />
        </div>
        <div className="code-block" style={{ padding: 16, fontSize: 12 }}>
          <div><span className="tok-com"># Reading repo structure…</span></div>
          <div><span className="tok-kw">class</span> <span className="tok-fn">Module</span>:</div>
          <div style={{ paddingLeft: 14 }}><span className="tok-kw">def</span> <span className="tok-fn">__init__</span>(self):</div>
          <div style={{ paddingLeft: 28 }}>...</div>
          <div style={{ paddingLeft: 14 }}><span className="tok-kw">async def</span> <span className="tok-fn">process</span>(self, data):</div>
          <div style={{ paddingLeft: 28 }}>resp = <span className="tok-kw">await</span> handler(data)</div>
          <div style={{ paddingLeft: 28 }}><span className="tok-kw">return</span> resp</div>
        </div>
      </div>
    );
  }
  if (stage === 2) {
    return (
      <div className="card" style={{ padding: 18, animation: "fadeUp .3s ease", position: "relative", overflow: "hidden" }}>
        <SmallEyebrow>Visual review · in progress</SmallEyebrow>
        <div
          style={{
            marginTop: 12,
            position: "relative",
            aspectRatio: "16/10",
            borderRadius: 10,
            background: "linear-gradient(180deg, #131520, #0a0c14)",
            boxShadow: "inset 0 0 0 1px var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              height: 2,
              background: "linear-gradient(90deg, transparent, #34D399, transparent)",
              boxShadow: "0 0 14px #34D399",
              animation: "scan 2.4s linear infinite",
            }}
          />
        </div>
      </div>
    );
  }
  return (
    <div
      className="card"
      style={{
        padding: 24,
        animation: "fadeUp .3s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <SmallEyebrow>Final score</SmallEyebrow>
      <div style={{ marginTop: 14 }}>
        <ProgressRing value={88} size={180} label="overall" sublabel="evaluating…" />
      </div>
    </div>
  );
};

const StageRightPanel = ({ stage }: { stage: number }) => {
  const [items, setItems] = useState<[string, string][]>([]);
  useEffect(() => {
    setItems([]);
    if (stage === 1) {
      STAGE_FINDINGS.forEach((f, i) => {
        setTimeout(() => setItems((x) => [...x, f]), 500 + i * 400);
      });
    }
  }, [stage]);

  if (stage === 0) {
    return (
      <div className="card" style={{ padding: 18, animation: "fadeUp .3s ease" }}>
        <SmallEyebrow>Structural · checks</SmallEyebrow>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            "README exists & ≥ 5 sections",
            "License declared",
            "No secrets in history",
            "Has at least one tested entrypoint",
          ].map((t, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 10,
                background: "var(--bg-2)",
                animation: `fadeUp .3s ${i * 120}ms both`,
              }}
            >
              <Icon name="check" size={14} style={{ color: "#6ee7b7" }} />
              <span style={{ fontSize: 13, flex: 1 }}>{t}</span>
              <span className="mono" style={{ fontSize: 10, color: "var(--text-mid)" }}>OK</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (stage === 1) {
    return (
      <div className="card" style={{ padding: 18, animation: "fadeUp .3s ease" }}>
        <SmallEyebrow>Streaming critique · Gemma 4 27B</SmallEyebrow>
        <div style={{ marginTop: 12, maxHeight: 280, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((f, i) => (
            <div
              key={i}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-2)",
                boxShadow: `inset 0 0 0 1px ${f[1]}30`,
                animation: "fadeUp .3s ease",
                display: "flex",
                gap: 10,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: f[1], marginTop: 6, flexShrink: 0 }} />
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{f[0]}</span>
            </div>
          ))}
          {items.length < STAGE_FINDINGS.length && (
            <div style={{ padding: "10px 12px", borderRadius: 10, background: "var(--bg-2)", color: "var(--text-mid)", fontSize: 13 }}>
              <Typewriter text={"streaming…"} speed={50} />
            </div>
          )}
        </div>
      </div>
    );
  }
  if (stage === 2) {
    return (
      <div className="card" style={{ padding: 18, animation: "fadeUp .3s ease" }}>
        <SmallEyebrow>Visual findings</SmallEyebrow>
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          {[
            ["Hierarchy is clear; H1 dominates above the fold.", "#6ee7b7"],
            ["Contrast on muted text close to AA — consider boosting.", "#FB923C"],
            ["CTA cluster could use stronger primary affordance.", "#a5b4fc"],
          ].map(([t, c], i) => (
            <div
              key={i}
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "var(--bg-2)",
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                boxShadow: `inset 0 0 0 1px ${c}30`,
                animation: `fadeUp .3s ${i * 120}ms both`,
              }}
            >
              <span style={{ width: 18, height: 18, borderRadius: 4, background: c, opacity: 0.25, flexShrink: 0 }} />
              <span style={{ fontSize: 13, lineHeight: 1.5 }}>{t}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      className="card"
      style={{
        padding: 18,
        animation: "fadeUp .3s ease",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <SmallEyebrow>Sealing credential</SmallEyebrow>
      <div className="mono" style={{ marginTop: 14, fontSize: 11, color: "var(--text-mid)", textAlign: "center", lineHeight: 1.8 }}>
        HMAC signing… ✓<br />
        Persisting to portfolio… ✓<br />
        <span style={{ color: "#6ee7b7" }}>Credential ready.</span>
      </div>
    </div>
  );
};

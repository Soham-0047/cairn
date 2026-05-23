"use client";
import Link from "next/link";
import { useState } from "react";
import {
  AuroraBackground,
  CairnMark,
  Icon,
  MagneticButton,
  Modal,
  SmallEyebrow,
  useToast,
} from "@/components/ui/primitives";

export type PortfolioProject = {
  id: string;
  title: string;
  repoUrl: string;
  score: number; // 0..1
  strengths: string[];
  skills: string[];
  models?: { stage: string; provider: string; model: string }[];
  evaluatedAt: string;
};

export type PortfolioData = {
  profile: {
    handle: string;
    name: string;
    avatarUrl?: string;
    githubUsername?: string;
    targetRole?: string;
    background?: string;
    location?: string;
  };
  activePath: {
    targetRole: string;
    summary: string;
    phaseCount: number;
    completedMilestones: number;
    totalMilestones: number;
    generatedBy?: { provider: string; model: string };
  } | null;
  projects: PortfolioProject[];
  credentials: {
    id: string;
    type: "project" | "quiz_mastery" | "milestone";
    title: string;
    skills: string[];
    issuedAt: string;
    signature: string;
  }[];
};

const SHOT_TONES = ["#6366F1", "#34D399", "#FB923C", "#8B5CF6", "#EC4899", "#A5B4FC"];

export function PortfolioView({ data, example = false }: { data: PortfolioData; example?: boolean }) {
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const toast = useToast();
  const completedWeeks = data.activePath?.completedMilestones ?? 0;
  const totalWeeks = data.activePath?.totalMilestones ?? 12;
  const avgScore =
    data.projects.length > 0
      ? Math.round((data.projects.reduce((a, p) => a + p.score, 0) / data.projects.length) * 100)
      : 0;

  return (
    <div style={{ background: "var(--bg-0)", minHeight: "100vh", position: "relative" }}>
      {example && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            padding: "12px 24px",
            background: "color-mix(in srgb, var(--bg-0) 80%, transparent)",
            backdropFilter: "blur(10px)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-mid)" }}>
            <span className="pill pill-indigo">SAMPLE</span>
            This is a sample portfolio. Build yours in 12 weeks.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/" className="btn-magnetic btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>
              ← Cairn home
            </Link>
            <MagneticButton href="/onboarding">
              Build mine <Icon name="arrow-right" size={12} />
            </MagneticButton>
          </div>
        </div>
      )}

      <section style={{ padding: "80px 24px 40px", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse at 30% 0%, rgba(99,102,241,0.18), transparent 60%)",
          }}
        />
        <div className="container" style={{ position: "relative", zIndex: 2, maxWidth: 1080 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              {data.profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.profile.avatarUrl}
                  alt={data.profile.name}
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 999,
                    objectFit: "cover",
                    boxShadow: "0 0 0 6px rgba(99,102,241,0.25), 0 30px 60px -10px rgba(0,0,0,0.5)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: 999,
                    background: "linear-gradient(135deg, #FB923C, #8B5CF6 50%, #6366F1)",
                    boxShadow: "0 0 0 6px rgba(99,102,241,0.25), 0 30px 60px -10px rgba(0,0,0,0.5)",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  inset: -6,
                  borderRadius: 999,
                  border: "1px solid rgba(99,102,241,0.4)",
                  animation: "pingRing 3s ease-out infinite",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 280 }}>
              <SmallEyebrow>cairn.dev/u/{data.profile.handle}</SmallEyebrow>
              <h1
                className="serif"
                style={{
                  fontSize: "clamp(48px, 7vw, 88px)",
                  margin: "8px 0 0",
                  lineHeight: 0.95,
                  letterSpacing: "-.03em",
                }}
              >
                {data.profile.name.split(" ")[0]}{" "}
                <span className="italic grad-text">{data.profile.name.split(" ").slice(1).join(" ") || "."}</span>
              </h1>
              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  fontSize: 16,
                  color: "var(--text-mid)",
                }}
              >
                {data.profile.targetRole && <span>{data.profile.targetRole}</span>}
                {data.profile.location && (
                  <>
                    <span>·</span>
                    <span>{data.profile.location}</span>
                  </>
                )}
                <span>·</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: "#34D399", boxShadow: "0 0 8px #34D399" }} />
                  open to roles
                </span>
              </div>
              <div style={{ marginTop: 24, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <MagneticButton
                  onClick={() => {
                    toast.push("Profile link copied", "success");
                    if (typeof window !== "undefined") navigator.clipboard.writeText(window.location.href);
                  }}
                >
                  <Icon name="mail" size={14} /> Hire me
                </MagneticButton>
                {data.profile.githubUsername && (
                  <a className="pill" href={`https://github.com/${data.profile.githubUsername}`} target="_blank" rel="noopener noreferrer">
                    <Icon name="github" size={12} /> {data.profile.githubUsername}
                  </a>
                )}
              </div>
            </div>
          </div>

          <div
            className="card"
            style={{ marginTop: 40, padding: 20, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <CairnMark size={26} />
              <div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: "var(--text-mid)",
                    textTransform: "uppercase",
                    letterSpacing: ".14em",
                  }}
                >
                  Cairn-verified path
                </div>
                <div className="serif" style={{ fontSize: 22, lineHeight: 1.1 }}>
                  {data.activePath?.targetRole || data.profile.targetRole || "Building"} · Week {completedWeeks} of {totalWeeks}
                </div>
              </div>
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 200,
                height: 8,
                borderRadius: 999,
                background: "var(--bg-2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.round((completedWeeks / Math.max(1, totalWeeks)) * 100)}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--primary), var(--mint), var(--warm))",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 14 }}>
              <Stat n={data.credentials.length.toString()} l="credentials" />
              <Stat n={avgScore.toString()} l="avg score" suffix="/100" />
              <Stat n={completedWeeks.toString()} l="milestones" />
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "40px 24px 60px" }}>
        <div className="container">
          <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
            <h2 className="serif italic" style={{ fontSize: 40, margin: 0, letterSpacing: "-.02em" }}>
              Verified work
            </h2>
            <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
              {data.projects.length} projects
            </span>
          </div>
          {data.projects.length === 0 ? (
            <div className="card" style={{ padding: 28, textAlign: "center", color: "var(--text-mid)" }}>
              No verified projects yet.
            </div>
          ) : (
            <div className="cred-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
              {data.projects.map((p, i) => {
                const tone = SHOT_TONES[i % SHOT_TONES.length];
                const pct = Math.round(p.score * 100);
                return (
                  <article
                    key={p.id}
                    className="card"
                    style={{
                      padding: 0,
                      overflow: "hidden",
                      cursor: "pointer",
                      transition: "transform .3s, box-shadow .3s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                      (e.currentTarget as HTMLElement).style.boxShadow =
                        "0 30px 60px -20px rgba(0,0,0,0.5), inset 0 0 0 1px var(--border-strong)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "";
                      (e.currentTarget as HTMLElement).style.boxShadow = "";
                    }}
                    onClick={() => setActiveProject(p)}
                  >
                    <div
                      style={{
                        aspectRatio: "16/10",
                        background: `linear-gradient(135deg, ${tone}55, ${tone}11)`,
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "radial-gradient(ellipse at 70% 30%, rgba(255,255,255,0.1), transparent 50%)",
                        }}
                      />
                      <Icon
                        name="image"
                        size={36}
                        style={{ color: tone, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
                      />
                      <div style={{ position: "absolute", top: 12, right: 12 }}>
                        <span
                          className="pill"
                          style={{
                            background: "rgba(0,0,0,0.5)",
                            backdropFilter: "blur(8px)",
                            fontSize: 10,
                            color: pct >= 90 ? "#6ee7b7" : "#a5b4fc",
                          }}
                        >
                          <Icon name="check" size={10} /> verified · {pct}/100
                        </span>
                      </div>
                    </div>
                    <div style={{ padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <h3 className="serif" style={{ fontSize: 20, margin: 0, letterSpacing: "-.02em" }}>
                          {p.title}
                        </h3>
                        <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
                          {new Date(p.evaluatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                        {p.skills.slice(0, 4).map((t) => (
                          <span key={t} className="pill" style={{ fontSize: 10 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
          <style>{`
            @media(max-width:1000px){.cred-grid{grid-template-columns:1fr 1fr !important;}}
            @media(max-width:600px){.cred-grid{grid-template-columns:1fr !important;}}
          `}</style>
        </div>
      </section>

      <section style={{ padding: "60px 24px" }}>
        <div className="container">
          <SmallEyebrow>Milestones · 12 weeks</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 44, margin: "10px 0 24px", letterSpacing: "-.02em" }}>
            The <i>receipts</i>.
          </h2>
          <div style={{ overflowX: "auto", paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 14, minWidth: "max-content", paddingBottom: 4 }}>
              {Array.from({ length: totalWeeks }).map((_, i) => {
                const done = i < completedWeeks;
                return (
                  <div key={i} style={{ width: 160, flexShrink: 0 }}>
                    <div
                      style={{
                        height: 4,
                        borderRadius: 999,
                        background: done ? "linear-gradient(90deg, var(--primary), var(--mint))" : "var(--bg-2)",
                      }}
                    />
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--text-mid)",
                        marginTop: 8,
                        textTransform: "uppercase",
                        letterSpacing: ".14em",
                      }}
                    >
                      WEEK {i + 1}
                    </div>
                    <div className="serif" style={{ fontSize: 16, marginTop: 4, lineHeight: 1.25, color: "var(--text-hi)" }}>
                      {done ? "Verified milestone" : "Upcoming"}
                    </div>
                    {done && (
                      <span className="pill pill-mint" style={{ marginTop: 8, fontSize: 10 }}>
                        <Icon name="check" size={10} /> verified
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "80px 24px 120px" }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div className="card" style={{ padding: 48, textAlign: "center", position: "relative", overflow: "hidden" }}>
            <AuroraBackground intensity={0.5} />
            <div style={{ position: "relative", zIndex: 2 }}>
              <h2
                className="serif italic"
                style={{ fontSize: "clamp(40px, 6vw, 72px)", margin: 0, letterSpacing: "-.025em" }}
              >
                Want to <span className="grad-text">work together</span>?
              </h2>
              <p style={{ color: "var(--text-mid)", fontSize: 17, marginTop: 12, maxWidth: 480, margin: "12px auto 0" }}>
                Available for full-time, contract, and freelance. Replies within 24 hours.
              </p>
              <div style={{ marginTop: 28, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <MagneticButton
                  onClick={() => {
                    if (typeof window !== "undefined") navigator.clipboard.writeText(window.location.href);
                    toast.push("Portfolio link copied", "success");
                  }}
                >
                  <Icon name="copy" size={14} /> Copy portfolio link
                </MagneticButton>
              </div>
              <div
                style={{
                  marginTop: 24,
                  display: "flex",
                  gap: 18,
                  justifyContent: "center",
                  fontSize: 12,
                  color: "var(--text-mid)",
                }}
              >
                <span>built with cairn · all credentials are HMAC-signed and verifiable</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Modal open={!!activeProject} onClose={() => setActiveProject(null)} width={900}>
        {activeProject && (
          <div>
            <SmallEyebrow>Credential</SmallEyebrow>
            <h2 className="serif" style={{ fontSize: 40, margin: "10px 0", letterSpacing: "-.02em" }}>
              {activeProject.title}
            </h2>
            <a
              href={activeProject.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="pill"
              style={{ marginBottom: 16 }}
            >
              <Icon name="github" size={11} />{" "}
              {activeProject.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "")}
            </a>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
              <div className="card" style={{ padding: 14 }}>
                <SmallEyebrow>Strengths</SmallEyebrow>
                <ul style={{ marginTop: 10, paddingLeft: 0, listStyle: "none" }}>
                  {activeProject.strengths.slice(0, 4).map((s, i) => (
                    <li key={i} style={{ display: "flex", gap: 8, padding: "6px 0", fontSize: 13 }}>
                      <Icon name="check" size={12} style={{ color: "#6ee7b7", marginTop: 4, flexShrink: 0 }} /> {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="card" style={{ padding: 14 }}>
                <SmallEyebrow>Skills demonstrated</SmallEyebrow>
                <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {activeProject.skills.map((s) => (
                    <span key={s} className="pill pill-indigo" style={{ fontSize: 11 }}>
                      {s}
                    </span>
                  ))}
                </div>
                {activeProject.models?.length ? (
                  <div className="mono" style={{ marginTop: 12, fontSize: 11, color: "var(--text-mid)" }}>
                    Evaluated by: {activeProject.models.map((m) => m.model).join(", ")}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const Stat = ({ n, l, suffix = "" }: { n: string; l: string; suffix?: string }) => (
  <div style={{ textAlign: "right" }}>
    <div className="serif" style={{ fontSize: 28, lineHeight: 1 }}>
      {n}
      <span style={{ fontSize: 14, color: "var(--text-mid)" }}>{suffix}</span>
    </div>
    <div
      className="mono"
      style={{ fontSize: 10, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".14em" }}
    >
      {l}
    </div>
  </div>
);

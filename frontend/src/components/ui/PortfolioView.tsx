"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
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

const PROJECT_PALETTES: Array<[string, string, string]> = [
  ["#6366F1", "#8B5CF6", "#EC4899"],
  ["#34D399", "#10B981", "#06B6D4"],
  ["#FB923C", "#F59E0B", "#EF4444"],
  ["#8B5CF6", "#6366F1", "#3B82F6"],
  ["#EC4899", "#F43F5E", "#FB923C"],
  ["#A5B4FC", "#7DD3FC", "#34D399"],
];

const initials = (text: string) =>
  text
    .split(/[\s\-_:.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "•";

export function PortfolioView({ data, example = false }: { data: PortfolioData; example?: boolean }) {
  const [activeProject, setActiveProject] = useState<PortfolioProject | null>(null);
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const toast = useToast();

  const completedWeeks = data.activePath?.completedMilestones ?? 0;
  const totalWeeks = data.activePath?.totalMilestones ?? 12;
  const avgScore =
    data.projects.length > 0
      ? Math.round((data.projects.reduce((a, p) => a + p.score, 0) / data.projects.length) * 100)
      : 0;
  const topScore =
    data.projects.length > 0 ? Math.round(Math.max(...data.projects.map((p) => p.score)) * 100) : 0;

  const allSkills = useMemo(() => {
    const counts = new Map<string, number>();
    data.projects.forEach((p) => p.skills.forEach((s) => counts.set(s, (counts.get(s) || 0) + 1)));
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => s);
  }, [data.projects]);

  const filteredProjects = useMemo(() => {
    if (!skillFilter) return data.projects;
    return data.projects.filter((p) => p.skills.includes(skillFilter));
  }, [data.projects, skillFilter]);

  const copyShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.push("Portfolio link copied", "success");
    }
  };

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

      {/* HERO */}
      <section style={{ padding: "100px 24px 56px", position: "relative", overflow: "hidden" }}>
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 20% 0%, rgba(99,102,241,0.22), transparent 55%), radial-gradient(ellipse at 90% 30%, rgba(52,211,153,0.12), transparent 50%)",
          }}
        />
        <div className="container" style={{ position: "relative", zIndex: 2, maxWidth: 1100 }}>
          <div className="hero-grid" style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 40, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              {data.profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.profile.avatarUrl}
                  alt={data.profile.name}
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 28,
                    objectFit: "cover",
                    boxShadow:
                      "0 0 0 1px var(--border-strong), 0 30px 60px -12px rgba(0,0,0,0.55), 0 0 80px -10px rgba(99,102,241,0.5)",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 140,
                    height: 140,
                    borderRadius: 28,
                    background: "linear-gradient(135deg, #FB923C, #8B5CF6 45%, #6366F1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontSize: 48,
                    fontFamily: "var(--font-serif, ui-serif)",
                    fontStyle: "italic",
                    letterSpacing: "-.02em",
                    boxShadow:
                      "0 0 0 1px var(--border-strong), 0 30px 60px -12px rgba(0,0,0,0.55), 0 0 80px -10px rgba(99,102,241,0.5)",
                  }}
                >
                  {initials(data.profile.name)}
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  bottom: -8,
                  right: -8,
                  background: "var(--bg-1)",
                  border: "1px solid var(--border-strong)",
                  borderRadius: 999,
                  padding: "6px 10px",
                  fontSize: 11,
                  color: "#6ee7b7",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "#6ee7b7",
                    boxShadow: "0 0 8px #6ee7b7",
                  }}
                />
                Available
              </div>
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <SmallEyebrow>cairn.dev/u/{data.profile.handle}</SmallEyebrow>
              <h1
                className="serif"
                style={{
                  fontSize: "clamp(44px, 6.5vw, 80px)",
                  margin: "8px 0 0",
                  lineHeight: 0.98,
                  letterSpacing: "-.03em",
                }}
              >
                {data.profile.name.split(" ")[0]}{" "}
                <span className="italic grad-text">
                  {data.profile.name.split(" ").slice(1).join(" ") || ""}
                </span>
              </h1>
              {data.profile.targetRole && (
                <div
                  style={{
                    marginTop: 14,
                    fontSize: 19,
                    color: "var(--text-mid)",
                    lineHeight: 1.4,
                    maxWidth: 600,
                  }}
                >
                  Becoming a <span style={{ color: "var(--text-hi)" }}>{data.profile.targetRole}</span>
                  {data.profile.location ? <> · based in {data.profile.location}</> : null}
                </div>
              )}
              <div style={{ marginTop: 22, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <MagneticButton onClick={copyShareLink}>
                  <Icon name="copy" size={14} /> Share portfolio
                </MagneticButton>
                {data.profile.githubUsername && (
                  <a
                    className="btn-magnetic btn-ghost"
                    href={`https://github.com/${data.profile.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: "8px 14px", fontSize: 13 }}
                  >
                    <Icon name="github" size={13} /> {data.profile.githubUsername}
                  </a>
                )}
                <a
                  className="btn-magnetic btn-ghost"
                  href="#projects"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  <Icon name="cube" size={13} /> See work
                </a>
              </div>
            </div>
          </div>

          {/* Stats strip */}
          <div
            className="stats-strip"
            style={{
              marginTop: 56,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              borderTop: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <StatCell n={data.projects.length} l="Verified projects" accent="#a5b4fc" />
            <StatCell
              n={data.credentials.length}
              l="Credentials minted"
              accent="#6ee7b7"
              borderLeft
            />
            <StatCell n={avgScore} suffix="/100" l="Avg score" accent="#fdba74" borderLeft />
            <StatCell n={topScore} suffix="/100" l="Top score" accent="#EC4899" borderLeft />
          </div>

          {/* Path progress card */}
          {data.activePath && (
            <div
              style={{
                marginTop: 28,
                padding: 22,
                borderRadius: 18,
                background:
                  "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--bg-1)), var(--bg-1))",
                border: "1px solid var(--border-strong)",
                display: "flex",
                alignItems: "center",
                gap: 22,
                flexWrap: "wrap",
              }}
            >
              <CairnMark size={32} />
              <div style={{ flex: 1, minWidth: 220 }}>
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
                <div className="serif" style={{ fontSize: 24, lineHeight: 1.15, marginTop: 4 }}>
                  {data.activePath.targetRole || data.profile.targetRole}
                </div>
                <div style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 6 }}>
                  Week {completedWeeks} of {totalWeeks} ·{" "}
                  {Math.round((completedWeeks / Math.max(1, totalWeeks)) * 100)}% complete
                </div>
              </div>
              <div style={{ flex: "1 1 240px", minWidth: 200 }}>
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: "var(--bg-2)",
                    overflow: "hidden",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round((completedWeeks / Math.max(1, totalWeeks)) * 100)}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, var(--primary), var(--mint), var(--warm))",
                      boxShadow: "0 0 14px rgba(99,102,241,0.5)",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PROJECTS */}
      <section id="projects" style={{ padding: "60px 24px 80px" }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <div
            style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 28, flexWrap: "wrap" }}
          >
            <div>
              <SmallEyebrow>Receipts · all signed</SmallEyebrow>
              <h2
                className="serif"
                style={{ fontSize: 48, margin: "8px 0 0", letterSpacing: "-.02em", lineHeight: 1 }}
              >
                Verified <span className="italic grad-text">work</span>
              </h2>
            </div>
            <span style={{ flex: 1, height: 1, background: "var(--border)", marginBottom: 10 }} />
            <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)", marginBottom: 10 }}>
              {filteredProjects.length} of {data.projects.length} projects
            </span>
          </div>

          {/* Skill filter chips */}
          {allSkills.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
              <button
                onClick={() => setSkillFilter(null)}
                className="pill"
                style={{
                  cursor: "pointer",
                  border: "none",
                  background: !skillFilter ? "var(--bg-2)" : "transparent",
                  boxShadow: `inset 0 0 0 1px ${!skillFilter ? "var(--border-strong)" : "var(--border)"}`,
                  color: !skillFilter ? "var(--text-hi)" : "var(--text-mid)",
                  padding: "7px 13px",
                }}
              >
                All work
              </button>
              {allSkills.slice(0, 10).map((s) => {
                const active = skillFilter === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSkillFilter(active ? null : s)}
                    className="pill"
                    style={{
                      cursor: "pointer",
                      border: "none",
                      background: active ? "var(--bg-2)" : "transparent",
                      boxShadow: `inset 0 0 0 1px ${active ? "var(--border-strong)" : "var(--border)"}`,
                      color: active ? "var(--text-hi)" : "var(--text-mid)",
                      padding: "7px 13px",
                    }}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}

          {data.projects.length === 0 ? (
            <div
              className="card"
              style={{
                padding: 56,
                textAlign: "center",
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--primary) 5%, var(--bg-1)), var(--bg-1))",
              }}
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  margin: "0 auto 14px",
                  background:
                    "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(52,211,153,0.25))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="cube" size={28} style={{ color: "var(--text-hi)" }} />
              </div>
              <h3 className="serif" style={{ fontSize: 28, margin: "8px 0", letterSpacing: "-.02em" }}>
                No verified projects <i>yet</i>.
              </h3>
              <p style={{ color: "var(--text-mid)", fontSize: 14, maxWidth: 420, margin: "0 auto" }}>
                Ship a project, run it through multimodal evaluation, and it lands here with a
                signed credential.
              </p>
            </div>
          ) : (
            <div
              className="cred-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}
            >
              {filteredProjects.map((p, i) => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  palette={PROJECT_PALETTES[i % PROJECT_PALETTES.length]}
                  onClick={() => setActiveProject(p)}
                />
              ))}
            </div>
          )}
          <style>{`
            @media(max-width:1000px){.cred-grid{grid-template-columns:1fr 1fr !important;}}
            @media(max-width:600px){
              .cred-grid{grid-template-columns:1fr !important;}
              .hero-grid{grid-template-columns:1fr !important;}
              .stats-strip{grid-template-columns:1fr 1fr !important;}
              .stats-strip > div:nth-child(2){border-left:none !important;}
              .stats-strip > div:nth-child(3){border-top:1px solid var(--border) !important;border-left:none !important;}
              .stats-strip > div:nth-child(4){border-top:1px solid var(--border) !important;}
            }
          `}</style>
        </div>
      </section>

      {/* SKILL CLOUD */}
      {allSkills.length > 0 && (
        <section style={{ padding: "40px 24px 80px" }}>
          <div className="container" style={{ maxWidth: 1100 }}>
            <SmallEyebrow>Skill stack</SmallEyebrow>
            <h2 className="serif" style={{ fontSize: 40, margin: "8px 0 22px", letterSpacing: "-.02em" }}>
              What I've <i>shipped with</i>.
            </h2>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {allSkills.map((s, i) => (
                <span
                  key={s}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 999,
                    fontSize: 14,
                    background: `linear-gradient(135deg, ${
                      PROJECT_PALETTES[i % PROJECT_PALETTES.length][0]
                    }22, ${PROJECT_PALETTES[i % PROJECT_PALETTES.length][1]}11)`,
                    boxShadow: `inset 0 0 0 1px ${
                      PROJECT_PALETTES[i % PROJECT_PALETTES.length][0]
                    }44`,
                    color: "var(--text-hi)",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TIMELINE */}
      <section style={{ padding: "60px 24px" }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <SmallEyebrow>Milestones · 12 weeks</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 44, margin: "10px 0 24px", letterSpacing: "-.02em" }}>
            The <i>receipts</i>.
          </h2>
          <div style={{ overflowX: "auto", paddingBottom: 16 }}>
            <div style={{ display: "flex", gap: 14, minWidth: "max-content", paddingBottom: 4 }}>
              {Array.from({ length: totalWeeks }).map((_, i) => {
                const done = i < completedWeeks;
                return (
                  <div
                    key={i}
                    style={{
                      width: 170,
                      flexShrink: 0,
                      padding: 14,
                      borderRadius: 12,
                      background: done
                        ? "linear-gradient(180deg, color-mix(in srgb, var(--mint) 8%, var(--bg-1)), var(--bg-1))"
                        : "var(--bg-1)",
                      border: `1px solid ${done ? "rgba(52,211,153,0.3)" : "var(--border)"}`,
                    }}
                  >
                    <div
                      style={{
                        height: 4,
                        borderRadius: 999,
                        background: done
                          ? "linear-gradient(90deg, var(--primary), var(--mint))"
                          : "var(--bg-2)",
                      }}
                    />
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: "var(--text-mid)",
                        marginTop: 10,
                        textTransform: "uppercase",
                        letterSpacing: ".14em",
                      }}
                    >
                      WEEK {String(i + 1).padStart(2, "0")}
                    </div>
                    <div
                      className="serif"
                      style={{ fontSize: 16, marginTop: 4, lineHeight: 1.25, color: "var(--text-hi)" }}
                    >
                      {done ? "Verified milestone" : "Upcoming"}
                    </div>
                    {done && (
                      <span className="pill pill-mint" style={{ marginTop: 10, fontSize: 10 }}>
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

      {/* CTA */}
      <section style={{ padding: "80px 24px 120px" }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div
            className="card"
            style={{ padding: 48, textAlign: "center", position: "relative", overflow: "hidden" }}
          >
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
                <MagneticButton onClick={copyShareLink}>
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
            <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <MagneticButton
                onClick={() => {
                  if (typeof window !== "undefined") window.open(activeProject.repoUrl, "_blank");
                }}
              >
                <Icon name="github" size={14} /> Open repo
              </MagneticButton>
              <MagneticButton
                variant="ghost"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(activeProject.repoUrl);
                    toast.push("Repo link copied", "success");
                  }
                }}
              >
                <Icon name="copy" size={14} /> Copy repo link
              </MagneticButton>
              <span
                className="pill"
                style={{
                  marginLeft: "auto",
                  color: activeProject.score >= 0.9 ? "#6ee7b7" : "#a5b4fc",
                  fontSize: 12,
                }}
              >
                Score · {Math.round(activeProject.score * 100)}/100
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

const StatCell = ({
  n,
  l,
  suffix,
  accent,
  borderLeft,
}: {
  n: number | string;
  l: string;
  suffix?: string;
  accent?: string;
  borderLeft?: boolean;
}) => (
  <div
    style={{
      padding: "26px 22px",
      borderLeft: borderLeft ? "1px solid var(--border)" : undefined,
    }}
  >
    <div
      className="serif"
      style={{
        fontSize: 44,
        lineHeight: 1,
        letterSpacing: "-.02em",
        color: accent || "var(--text-hi)",
      }}
    >
      {n}
      {suffix && <span style={{ fontSize: 18, color: "var(--text-mid)" }}>{suffix}</span>}
    </div>
    <div
      className="mono"
      style={{
        marginTop: 8,
        fontSize: 10,
        color: "var(--text-mid)",
        textTransform: "uppercase",
        letterSpacing: ".14em",
      }}
    >
      {l}
    </div>
  </div>
);

const ProjectCard = ({
  project,
  palette,
  onClick,
}: {
  project: PortfolioProject;
  palette: [string, string, string];
  onClick: () => void;
}) => {
  const pct = Math.round(project.score * 100);
  const tier = pct >= 90 ? "elite" : pct >= 80 ? "strong" : "verified";
  const tierColor = pct >= 90 ? "#6ee7b7" : pct >= 80 ? "#a5b4fc" : "#fdba74";
  return (
    <article
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform .3s, box-shadow .3s",
        background: "var(--bg-1)",
        position: "relative",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-6px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 36px 70px -22px rgba(0,0,0,0.55), inset 0 0 0 1px var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
      onClick={onClick}
    >
      <div
        style={{
          aspectRatio: "16/10",
          background: `linear-gradient(135deg, ${palette[0]} 0%, ${palette[1]} 55%, ${palette[2]} 100%)`,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* mesh + grain */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.25), transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(0,0,0,0.3), transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.4,
            backgroundImage:
              "repeating-linear-gradient(45deg, transparent 0 14px, rgba(255,255,255,0.04) 14px 15px)",
          }}
        />

        {/* big initials watermark */}
        <div
          className="serif italic"
          style={{
            position: "absolute",
            bottom: -24,
            right: -10,
            fontSize: 160,
            lineHeight: 1,
            color: "rgba(255,255,255,0.18)",
            letterSpacing: "-.04em",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {initials(project.title)}
        </div>

        {/* top-left score chip */}
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <span
            className="pill"
            style={{
              background: "rgba(7,7,11,0.55)",
              backdropFilter: "blur(10px)",
              fontSize: 10,
              color: tierColor,
              boxShadow: `inset 0 0 0 1px ${tierColor}55`,
              textTransform: "uppercase",
              letterSpacing: ".12em",
            }}
          >
            <Icon name="check" size={10} /> {tier} · {pct}/100
          </span>
        </div>

        {/* tiny model attribution */}
        <div style={{ position: "absolute", top: 12, right: 12 }}>
          <span
            className="pill"
            style={{
              background: "rgba(7,7,11,0.55)",
              backdropFilter: "blur(10px)",
              fontSize: 10,
              color: "#fff",
            }}
          >
            <Icon name="sparkles" size={10} /> AI-verified
          </span>
        </div>
      </div>

      <div style={{ padding: "18px 20px 20px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <h3
            className="serif"
            style={{
              fontSize: 22,
              margin: 0,
              letterSpacing: "-.02em",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flex: 1,
            }}
          >
            {project.title}
          </h3>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-mid)", flexShrink: 0 }}>
            {new Date(project.evaluatedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        {project.strengths?.[0] && (
          <p
            style={{
              fontSize: 13,
              color: "var(--text-mid)",
              marginTop: 8,
              lineHeight: 1.55,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {project.strengths[0]}
          </p>
        )}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {project.skills.slice(0, 3).map((t) => (
            <span key={t} className="pill" style={{ fontSize: 10 }}>
              {t}
            </span>
          ))}
          {project.skills.length > 3 && (
            <span className="pill" style={{ fontSize: 10, color: "var(--text-mid)" }}>
              +{project.skills.length - 3}
            </span>
          )}
          <a
            href={project.repoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--text-mid)",
              textDecoration: "none",
            }}
          >
            <Icon name="github" size={11} />
            <Icon name="arrow-up-right" size={10} />
          </a>
        </div>
      </div>
    </article>
  );
};

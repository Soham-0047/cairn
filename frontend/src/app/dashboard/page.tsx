"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import {
  Icon,
  KPIChip,
  MagneticButton,
  ProgressRing,
  SmallEyebrow,
} from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type Resource = {
  title: string;
  url: string;
  type: string;
  expectedMinutes: number;
  status: "pending" | "in_progress" | "done" | "skipped";
};

type Milestone = {
  week: number;
  topic: string;
  summary: string;
  deliverable: string;
  resources: Resource[];
  status: "pending" | "in_progress" | "done";
};

type ProjectSpec = {
  title: string;
  description: string;
  difficulty: "easy" | "medium" | "hard";
  expectedHours: number;
  skills: string[];
  isNorthStar: boolean;
};

type Phase = {
  name: string;
  description: string;
  weeks: number[];
  milestones: Milestone[];
  projects: ProjectSpec[];
};

type Path = {
  _id: string;
  goal: string;
  targetRole: string;
  timelineWeeks: number;
  summary: string;
  stretchGoalWarning?: string;
  phases: Phase[];
  generatedBy?: { provider: string; model: string };
};

export default function DashboardPage() {
  const { status, data: session } = useSession();
  const [path, setPath] = useState<Path | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasGuest, setHasGuest] = useState(false);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" && !hasGuest) return;
    proxyFetch("/paths/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPath(data))
      .finally(() => setLoading(false));
  }, [status, hasGuest]);

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card-elev" style={{ padding: 36, maxWidth: 420, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0, letterSpacing: "-.02em" }}>Please sign in</h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 8 }}>Sign in with GitHub to view your dashboard.</p>
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

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="skeleton" style={{ width: 280, height: 32 }} />
      </div>
    );
  }

  if (!path) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="card" style={{ padding: 40, maxWidth: 520, textAlign: "center" }}>
          <SmallEyebrow>No active path</SmallEyebrow>
          <h1 className="serif" style={{ fontSize: 36, margin: "12px 0 8px", letterSpacing: "-.02em" }}>
            Let's <i>build one</i>.
          </h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 20 }}>
            Tell us your goal and Gemma 4 will build your 12-week path.
          </p>
          <MagneticButton href="/onboarding">
            Generate my path <Icon name="arrow-right" size={14} />
          </MagneticButton>
        </div>
      </div>
    );
  }

  const total = path.phases.reduce((acc, p) => acc + p.milestones.length, 0);
  const done = path.phases.reduce((acc, p) => acc + p.milestones.filter((m) => m.status === "done").length, 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  // current week ~ done milestones (clamped)
  const currentWeek = Math.min(path.timelineWeeks || total, done + 1);

  async function markDone(phaseIndex: number, milestoneIndex: number) {
    const res = await proxyFetch(`/paths/${path!._id}/milestone/done`, {
      method: "POST",
      body: JSON.stringify({ phaseIndex, milestoneIndex }),
    });
    if (res.ok) setPath(await res.json());
  }

  const guestMeta = getGuestMeta();
  const userName = session?.user?.name?.split(" ")[0] || guestMeta?.handle || "there";
  const userEmail = session?.user?.email || (guestMeta ? "guest mode" : undefined);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Sidebar
        active="dashboard"
        userName={userName}
        userEmail={userEmail || undefined}
        userHandle={session?.user?.handle || guestMeta?.handle}
        targetRole={path.targetRole}
        weekProgress={{ current: currentWeek, total: path.timelineWeeks || total }}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar
          title="Your 12-week path"
          subtitle={`${path.targetRole || "Your goal"} track`}
          right={
            <MagneticButton variant="ghost" href="/projects/new">
              <Icon name="plus" size={14} /> New submission
            </MagneticButton>
          }
        />
        <div className="dash-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32, padding: 32 }}>
          <div>
            <DashHero pct={pct} completed={done} total={total} userName={userName} stretchWarning={path.stretchGoalWarning} />
            <Timeline phases={path.phases} onMarkDone={markDone} />
          </div>
          <RightRail path={path} />
        </div>
      </main>
      <style>{`
        @media (max-width: 1100px) {
          aside { display: none; }
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

const DashHero = ({
  pct,
  completed,
  total,
  userName,
  stretchWarning,
}: {
  pct: number;
  completed: number;
  total: number;
  userName: string;
  stretchWarning?: string;
}) => (
  <div className="card" style={{ padding: 28, display: "flex", alignItems: "center", gap: 28, position: "relative", overflow: "hidden", flexWrap: "wrap" }}>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at right, rgba(99,102,241,0.15), transparent 60%)" }} />
    <ProgressRing value={pct} size={160} label="path complete" sublabel={`${completed} / ${total} milestones`} />
    <div style={{ position: "relative", flex: 1, minWidth: 280 }}>
      <div className="pill pill-mint" style={{ marginBottom: 12 }}>
        <span className="dot" style={{ background: "#6ee7b7", boxShadow: "0 0 8px #34D399" }} />
        On track · keep shipping
      </div>
      <h2 className="serif" style={{ fontSize: 36, margin: 0, letterSpacing: "-.02em" }}>
        {pct >= 50 ? <>You're <i>well underway</i>, {userName}.</> : <>Welcome back, <i>{userName}</i>.</>}
      </h2>
      <p style={{ color: "var(--text-mid)", fontSize: 15, marginTop: 10, maxWidth: 480, lineHeight: 1.5 }}>
        {stretchWarning || "The path adapts to what you actually shipped — your evaluation scores nudge upcoming milestones."}
      </p>
      <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
        <KPIChip label="Milestones done" value={completed} icon="badge" accent="#6ee7b7" />
        <KPIChip label="Total weeks" value={total} icon="route" accent="#a5b4fc" />
        <KPIChip label="Progress" value={pct} suffix="%" icon="spark" accent="#fdba74" />
      </div>
    </div>
  </div>
);

const Timeline = ({
  phases,
  onMarkDone,
}: {
  phases: Phase[];
  onMarkDone: (phaseIndex: number, milestoneIndex: number) => void;
}) => (
  <div style={{ marginTop: 32 }}>
    {phases.map((phase, pi) => (
      <div key={pi} style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div className="serif" style={{ fontSize: 24, letterSpacing: "-.02em" }}>
            Phase {pi + 1} · {phase.name}
          </div>
          <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span className="pill">{phase.milestones.length} weeks</span>
        </div>
        {phase.description && (
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: -10, marginBottom: 14 }}>{phase.description}</p>
        )}
        <div style={{ position: "relative", paddingLeft: 28 }}>
          <div
            style={{
              position: "absolute",
              left: 10,
              top: 6,
              bottom: 6,
              width: 2,
              background: "linear-gradient(180deg, var(--border-strong), var(--border) 80%, transparent)",
            }}
          />
          {phase.milestones.map((m, mi) => (
            <WeekNode key={mi} milestone={m} onMarkDone={() => onMarkDone(pi, mi)} />
          ))}
        </div>

        {phase.projects?.length ? (
          <div style={{ marginTop: 18, marginLeft: 28 }}>
            <SmallEyebrow>Projects in this phase</SmallEyebrow>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {phase.projects.map((p, pj) => (
                <div key={pj} className="card" style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {p.isNorthStar && <Icon name="sparkles" size={14} style={{ color: "#fdba74" }} />}
                    <span style={{ fontSize: 15 }}>{p.title}</span>
                  </div>
                  <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>{p.description}</p>
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <span className="pill" style={{ fontSize: 10 }}>{p.difficulty}</span>
                    <span className="pill" style={{ fontSize: 10 }}>{p.expectedHours}h</span>
                    {p.isNorthStar && <span className="pill pill-indigo" style={{ fontSize: 10 }}>North star</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    ))}
  </div>
);

const WeekNode = ({
  milestone,
  onMarkDone,
}: {
  milestone: Milestone;
  onMarkDone: () => void;
}) => {
  const [expanded, setExpanded] = useState(milestone.status === "in_progress");
  const statusColor =
    milestone.status === "done" ? "#6ee7b7" : milestone.status === "in_progress" ? "#a5b4fc" : "var(--text-lo)";
  const statusLabel =
    milestone.status === "in_progress" ? "in progress" : milestone.status === "done" ? "completed" : "upcoming";

  return (
    <div style={{ position: "relative", marginBottom: 14 }}>
      <div
        style={{
          position: "absolute",
          left: -23,
          top: 22,
          width: 14,
          height: 14,
          borderRadius: 999,
          background:
            milestone.status === "done"
              ? "linear-gradient(135deg, #34D399, #6ee7b7)"
              : milestone.status === "in_progress"
              ? "linear-gradient(135deg, #6366F1, #818CF8)"
              : "var(--bg-2)",
          boxShadow:
            milestone.status === "in_progress"
              ? "0 0 0 4px rgba(99,102,241,0.2), 0 0 14px rgba(99,102,241,0.5)"
              : milestone.status === "done"
              ? "0 0 0 4px rgba(52,211,153,0.15)"
              : "inset 0 0 0 1px var(--border-strong)",
        }}
      />
      <button
        onClick={() => setExpanded((x) => !x)}
        className="card"
        style={{
          width: "100%",
          textAlign: "left",
          padding: "18px 20px",
          background:
            milestone.status === "in_progress"
              ? "linear-gradient(180deg, color-mix(in srgb, var(--primary) 8%, var(--bg-1)), var(--bg-1))"
              : "var(--bg-1)",
          border: "none",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-mid)", minWidth: 60 }}>
            WEEK {String(milestone.week).padStart(2, "0")}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="serif" style={{ fontSize: 20, letterSpacing: "-.015em" }}>{milestone.topic}</div>
            {milestone.deliverable && (
              <div style={{ fontSize: 13, color: "var(--text-mid)", marginTop: 4 }}>
                <Icon name="cube" size={11} style={{ verticalAlign: "middle", marginRight: 6, color: "var(--text-lo)" }} />
                {milestone.deliverable}
              </div>
            )}
          </div>
          <span
            className="pill"
            style={{
              color: statusColor,
              boxShadow: `inset 0 0 0 1px ${
                milestone.status === "done"
                  ? "rgba(52,211,153,0.3)"
                  : milestone.status === "in_progress"
                  ? "rgba(99,102,241,0.4)"
                  : "var(--border-strong)"
              }`,
              background:
                milestone.status === "done"
                  ? "rgba(52,211,153,0.08)"
                  : milestone.status === "in_progress"
                  ? "rgba(99,102,241,0.08)"
                  : "var(--bg-2)",
            }}
          >
            <span
              className="dot"
              style={{
                background: statusColor,
                boxShadow: milestone.status !== "pending" ? `0 0 8px ${statusColor}` : "none",
              }}
            />
            {statusLabel}
          </span>
          <Icon
            name="chevron-down"
            size={14}
            style={{ color: "var(--text-mid)", transform: expanded ? "rotate(180deg)" : "rotate(0)", transition: "transform .3s" }}
          />
        </div>
      </button>
      <div style={{ maxHeight: expanded ? 800 : 0, overflow: "hidden", transition: "max-height .4s cubic-bezier(.16,1,.3,1)" }}>
        <div className="wd-grid" style={{ padding: "14px 20px 20px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 20 }}>
          <div>
            {milestone.summary && (
              <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 12, lineHeight: 1.6 }}>{milestone.summary}</p>
            )}
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--text-mid)",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                marginBottom: 10,
              }}
            >
              Curated free resources
            </div>
            {milestone.resources?.length ? (
              milestone.resources.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-2)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: "var(--bg-0)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      name={
                        r.type === "video"
                          ? "play"
                          : r.type === "paper"
                          ? "cube"
                          : r.type === "build"
                          ? "github"
                          : "globe"
                      }
                      size={13}
                      style={{ color: "var(--text-mid)" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-hi)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.title}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", marginTop: 2 }}>
                      {r.type} · ~{r.expectedMinutes}m
                    </div>
                  </div>
                  <Icon name="arrow-up-right" size={12} style={{ color: "var(--text-mid)" }} />
                </a>
              ))
            ) : (
              <p style={{ color: "var(--text-lo)", fontSize: 13 }}>No resources yet.</p>
            )}
          </div>
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: "var(--text-mid)",
                textTransform: "uppercase",
                letterSpacing: ".14em",
                marginBottom: 10,
              }}
            >
              Deliverable
            </div>
            <div className="card" style={{ padding: 16, background: "var(--bg-2)" }}>
              <div className="serif italic" style={{ fontSize: 18 }}>{milestone.deliverable || "Ship something."}</div>
              <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
                Submit a GitHub repo + screenshots. We'll run multimodal eval and mint a credential if you score ≥0.65.
              </p>
              <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {milestone.status !== "done" && (
                  <MagneticButton href="/projects/new">
                    <Icon name="upload" size={14} /> Submit project
                  </MagneticButton>
                )}
                {milestone.status !== "done" && (
                  <button onClick={onMarkDone} className="btn-magnetic btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
                    <Icon name="check" size={13} /> Mark done
                  </button>
                )}
                {milestone.status === "done" && (
                  <span className="pill pill-mint">
                    <Icon name="check" size={11} /> credential minted
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <style>{`@media (max-width: 760px){ .wd-grid { grid-template-columns: 1fr !important; }}`}</style>
      </div>
    </div>
  );
};

const RightRail = ({ path }: { path: Path }) => {
  const nextMilestone =
    path.phases.flatMap((p) => p.milestones).find((m) => m.status !== "done") || null;
  return (
    <aside style={{ position: "sticky", top: 100, alignSelf: "flex-start" }}>
      {nextMilestone && (
        <div className="gbc" style={{ marginBottom: 16 }}>
          <div className="gbc-inner" style={{ padding: 20 }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".14em" }}>
              Up next · Week {nextMilestone.week}
            </div>
            <div className="serif" style={{ fontSize: 24, marginTop: 8, lineHeight: 1.1 }}>{nextMilestone.topic}</div>
            <p style={{ color: "var(--text-mid)", fontSize: 13, marginTop: 10, lineHeight: 1.6 }}>
              {nextMilestone.deliverable || nextMilestone.summary}
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <MagneticButton href="/projects/new">
                Submit <Icon name="arrow-right" size={14} />
              </MagneticButton>
            </div>
          </div>
        </div>
      )}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              background: "linear-gradient(135deg, #6366F1, #34D399)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="sparkles" size={14} style={{ color: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 14 }}>Coach Gemma</div>
            <div style={{ fontSize: 11, color: "var(--text-mid)" }}>your weekly nudge</div>
          </div>
        </div>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-hi)", margin: 0 }}>
          <span className="italic" style={{ color: "var(--text-mid)" }}>
            "{path.summary || "Keep shipping. Small, frequent commits beat one big push every time."}"
          </span>
        </p>
        <Link href="/projects/new" className="btn-magnetic btn-ghost" style={{ marginTop: 12, padding: "6px 12px", fontSize: 12 }}>
          Submit a project →
        </Link>
      </div>
      {path.generatedBy?.model && (
        <div className="card" style={{ padding: 20 }}>
          <SmallEyebrow>Generated by</SmallEyebrow>
          <div className="serif" style={{ fontSize: 18, marginTop: 6 }}>{path.generatedBy.model}</div>
          <div className="mono" style={{ fontSize: 11, color: "var(--text-mid)", marginTop: 4 }}>
            {path.generatedBy.provider}
          </div>
        </div>
      )}
    </aside>
  );
};

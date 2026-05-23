"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import { Icon, MagneticButton, SmallEyebrow } from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type EvalListItem = {
  _id: string;
  projectTitle: string;
  repoUrl: string;
  finalScore: number;
  passed: boolean;
  status: "queued" | "running" | "complete" | "failed";
  claimedSkills: string[];
  createdAt: string;
};

type Filter = "all" | "passed" | "in_progress" | "failed";

const SHOT_TONES = ["#6366F1", "#34D399", "#FB923C", "#8B5CF6", "#EC4899", "#A5B4FC"];

export default function ProjectsListPage() {
  const { status, data: session } = useSession();
  const [items, setItems] = useState<EvalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [hasGuest, setHasGuest] = useState(false);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" && !hasGuest) {
      setLoading(false);
      return;
    }
    setLoading(true);
    proxyFetch("/evaluations")
      .then(async (r) => {
        if (!r.ok) {
          const b = await r.json().catch(() => ({}));
          throw new Error(b.error || `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Could not load"))
      .finally(() => setLoading(false));
  }, [status, hasGuest]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "passed") return items.filter((i) => i.passed && i.status === "complete");
    if (filter === "failed") return items.filter((i) => i.status === "failed" || (i.status === "complete" && !i.passed));
    return items.filter((i) => i.status === "queued" || i.status === "running");
  }, [items, filter]);

  const passedCount = items.filter((i) => i.passed && i.status === "complete").length;
  const avgScore =
    items.length > 0 ? Math.round((items.reduce((a, b) => a + (b.finalScore || 0), 0) / items.length) * 100) : 0;

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card-elev" style={{ padding: 36, maxWidth: 420, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0, letterSpacing: "-.02em" }}>Sign in to view projects</h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 8 }}>
            Or start a guest session to try Cairn without an account.
          </p>
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

  const guestMeta = getGuestMeta();
  const userName = session?.user?.name?.split(" ")[0] || guestMeta?.handle || "there";
  const userEmail = session?.user?.email || (guestMeta ? "guest mode" : undefined);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Sidebar
        active="projects-list"
        userName={userName}
        userEmail={userEmail}
        userHandle={session?.user?.handle || guestMeta?.handle}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar
          title="Projects"
          subtitle="All submitted projects · multimodal evaluations"
          right={
            <MagneticButton href="/projects/new">
              <Icon name="plus" size={14} /> New submission
            </MagneticButton>
          }
        />

        <div style={{ padding: 32 }}>
          {/* Summary */}
          {items.length > 0 && (
            <div
              className="card"
              style={{
                padding: 22,
                marginBottom: 22,
                display: "flex",
                alignItems: "center",
                gap: 28,
                flexWrap: "wrap",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "radial-gradient(ellipse at right, rgba(99,102,241,0.12), transparent 60%)",
                }}
              />
              <div style={{ position: "relative", display: "flex", gap: 28, flexWrap: "wrap" }}>
                <Stat n={items.length} l="total" />
                <Stat n={passedCount} l="verified" accent="#6ee7b7" />
                <Stat n={avgScore} l="avg score" suffix="/100" accent="#a5b4fc" />
              </div>
            </div>
          )}

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
            {(
              [
                ["all", "All"],
                ["passed", "Verified"],
                ["in_progress", "In progress"],
                ["failed", "Needs work"],
              ] as [Filter, string][]
            ).map(([k, label]) => {
              const isActive = filter === k;
              return (
                <button
                  key={k}
                  onClick={() => setFilter(k)}
                  className="pill"
                  style={{
                    cursor: "pointer",
                    border: "none",
                    background: isActive ? "var(--bg-2)" : "transparent",
                    boxShadow: `inset 0 0 0 1px ${isActive ? "var(--border-strong)" : "var(--border)"}`,
                    color: isActive ? "var(--text-hi)" : "var(--text-mid)",
                    padding: "8px 14px",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Body */}
          {loading ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card" style={{ padding: 0, overflow: "hidden", height: 240 }}>
                  <div className="skeleton" style={{ width: "100%", height: 130 }} />
                  <div style={{ padding: 16 }}>
                    <div className="skeleton" style={{ width: "70%", height: 14, marginBottom: 8 }} />
                    <div className="skeleton" style={{ width: "40%", height: 10 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : err ? (
            <div
              className="card"
              style={{ padding: 28, color: "#fca5a5", textAlign: "center" }}
            >
              {err}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState filter={filter} />
          ) : (
            <div
              className="proj-grid"
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}
            >
              {filtered.map((p, i) => (
                <ProjectCard key={p._id} item={p} tone={SHOT_TONES[i % SHOT_TONES.length]} />
              ))}
            </div>
          )}
        </div>
      </main>
      <style>{`@media (max-width: 1100px){ aside{ display:none; }}`}</style>
    </div>
  );
}

const Stat = ({ n, l, suffix = "", accent }: { n: number; l: string; suffix?: string; accent?: string }) => (
  <div>
    <div className="serif" style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-.02em", color: accent || "var(--text-hi)" }}>
      {n}
      <span style={{ fontSize: 14, color: "var(--text-mid)" }}>{suffix}</span>
    </div>
    <div
      className="mono"
      style={{ fontSize: 10, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".14em", marginTop: 4 }}
    >
      {l}
    </div>
  </div>
);

const ProjectCard = ({ item, tone }: { item: EvalListItem; tone: string }) => {
  const pct = Math.round((item.finalScore || 0) * 100);
  const repoShort = item.repoUrl.replace(/^https?:\/\/(www\.)?github\.com\//, "");
  const date = new Date(item.createdAt);
  const inProgress = item.status === "queued" || item.status === "running";
  return (
    <Link
      href={`/projects/${item._id}`}
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        cursor: "pointer",
        transition: "transform .25s, box-shadow .25s",
        textDecoration: "none",
        color: "inherit",
        display: "block",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
        (e.currentTarget as HTMLElement).style.boxShadow =
          "0 20px 40px -16px rgba(0,0,0,0.45), inset 0 0 0 1px var(--border-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "";
        (e.currentTarget as HTMLElement).style.boxShadow = "";
      }}
    >
      <div
        style={{
          aspectRatio: "16/9",
          background: `linear-gradient(135deg, ${tone}55, ${tone}11)`,
          position: "relative",
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
          size={32}
          style={{ color: tone, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}
        />
        <div style={{ position: "absolute", top: 10, right: 10 }}>
          {inProgress ? (
            <span
              className="pill"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", fontSize: 10, color: "#fdba74" }}
            >
              <span
                className="dot"
                style={{ background: "#fdba74", boxShadow: "0 0 8px #fdba74", animation: "pulse 1.4s ease-in-out infinite" }}
              />
              {item.status}
            </span>
          ) : item.status === "failed" ? (
            <span
              className="pill"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", fontSize: 10, color: "#f87171" }}
            >
              <Icon name="x" size={10} /> failed
            </span>
          ) : item.passed ? (
            <span
              className="pill"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", fontSize: 10, color: "#6ee7b7" }}
            >
              <Icon name="check" size={10} /> verified · {pct}/100
            </span>
          ) : (
            <span
              className="pill"
              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", fontSize: 10, color: "#fdba74" }}
            >
              below · {pct}/100
            </span>
          )}
        </div>
      </div>
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <h3 className="serif" style={{ fontSize: 18, margin: 0, letterSpacing: "-.015em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {item.projectTitle || "Untitled project"}
          </h3>
          <span className="mono" style={{ fontSize: 10, color: "var(--text-mid)", flexShrink: 0 }}>
            {date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--text-mid)",
            marginTop: 6,
            display: "flex",
            alignItems: "center",
            gap: 6,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          <Icon name="github" size={11} /> {repoShort || "—"}
        </div>
        {item.claimedSkills?.length ? (
          <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
            {item.claimedSkills.slice(0, 3).map((s) => (
              <span key={s} className="pill" style={{ fontSize: 10 }}>
                {s}
              </span>
            ))}
            {item.claimedSkills.length > 3 && (
              <span className="pill" style={{ fontSize: 10, color: "var(--text-mid)" }}>
                +{item.claimedSkills.length - 3}
              </span>
            )}
          </div>
        ) : null}
      </div>
    </Link>
  );
};

const EmptyState = ({ filter }: { filter: Filter }) => {
  const empty = {
    all: { title: "No projects yet", body: "Submit your first project to get a multimodal evaluation and earn a verified credential." },
    passed: { title: "No verified projects yet", body: "Score ≥0.65 on an evaluation to earn a credential. Ship and re-submit." },
    in_progress: { title: "Nothing in progress", body: "Evaluations finish in 30–60 seconds. Submit a new project to start one." },
    failed: { title: "Nothing needs work", body: "When an evaluation falls below threshold, it'll show up here." },
  }[filter];

  return (
    <div
      className="card"
      style={{ padding: 48, textAlign: "center", maxWidth: 560, margin: "0 auto" }}
    >
      <SmallEyebrow>{filter}</SmallEyebrow>
      <h2 className="serif" style={{ fontSize: 32, margin: "10px 0", letterSpacing: "-.02em" }}>
        {empty.title}
      </h2>
      <p style={{ color: "var(--text-mid)", fontSize: 14, lineHeight: 1.6, margin: "0 auto 18px", maxWidth: 420 }}>
        {empty.body}
      </p>
      <MagneticButton href="/projects/new">
        <Icon name="plus" size={14} /> Submit a project
      </MagneticButton>
    </div>
  );
};

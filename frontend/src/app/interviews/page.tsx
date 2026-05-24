"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Icon, MagneticButton, SmallEyebrow } from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestToken, getGuestMeta } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type InterviewListEntry = {
  _id: string;
  role: string;
  level: string;
  focus: string;
  status: "active" | "complete";
  score?: { overall?: number; recommendation?: string };
  messages: { role: string }[];
  createdAt: string;
};

type ActivePath = { targetRole: string };

const SUGGESTED_ROLES = [
  "Backend engineer",
  "Frontend engineer",
  "Full-stack developer",
  "Machine learning engineer",
  "Data scientist",
  "AI engineer",
];

export default function InterviewsPage() {
  const router = useRouter();
  const { status, data: session } = useSession();
  const [items, setItems] = useState<InterviewListEntry[]>([]);
  const [activePath, setActivePath] = useState<ActivePath | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasGuest, setHasGuest] = useState(false);
  const [role, setRole] = useState("");
  const [level, setLevel] = useState<"junior" | "mid" | "senior">("junior");
  const [focus, setFocus] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
  }, []);

  useEffect(() => {
    if (status === "unauthenticated" && !hasGuest) return;
    Promise.all([
      proxyFetch("/interviews").then((r) => (r.ok ? r.json() : [])),
      proxyFetch("/paths/active").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([list, path]) => {
        setItems(list || []);
        setActivePath(path);
        if (path?.targetRole && !role) setRole(path.targetRole);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, hasGuest]);

  async function start() {
    if (role.trim().length < 2) {
      setError("Pick a role to interview for.");
      return;
    }
    setError(null);
    setStarting(true);
    try {
      const res = await proxyFetch("/interviews", {
        method: "POST",
        body: JSON.stringify({ role: role.trim(), level, focus: focus.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || data.error || "Could not start interview");
        return;
      }
      router.push(`/interviews/${data._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start interview");
    } finally {
      setStarting(false);
    }
  }

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card-elev" style={{ padding: 36, maxWidth: 420, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Sign in for mock interviews</h1>
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
        active="interviews"
        userName={userName}
        userEmail={session?.user?.email || (guestMeta ? "guest mode" : undefined)}
        userHandle={session?.user?.handle || guestMeta?.handle}
        targetRole={activePath?.targetRole}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar title="Mock interviews" subtitle="Voice or text · scored by Gemma 4" />
        <div style={{ padding: 32, maxWidth: 980, margin: "0 auto" }}>
          <div className="card" style={{ padding: 24 }}>
            <SmallEyebrow>Start a new interview</SmallEyebrow>
            <h2 className="serif" style={{ fontSize: 28, margin: "8px 0 16px", letterSpacing: "-.02em" }}>
              Pick a role — we'll do the rest.
            </h2>
            <div style={{ display: "grid", gap: 14 }}>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Backend engineer, ML engineer, Full-stack developer"
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
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {SUGGESTED_ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className="pill"
                    style={{ cursor: "pointer", border: "none", background: role === r ? "rgba(99,102,241,0.12)" : "var(--bg-2)", color: role === r ? "#a5b4fc" : "var(--text-mid)" }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ fontSize: 12, color: "var(--text-mid)" }}>
                  Level
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as "junior" | "mid" | "senior")}
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
                    <option value="junior">Junior</option>
                    <option value="mid">Mid</option>
                    <option value="senior">Senior</option>
                  </select>
                </label>
                <input
                  type="text"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  placeholder="Optional focus (e.g. system design, React)"
                  style={{
                    flex: 1,
                    minWidth: 220,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--bg-1)",
                    border: "none",
                    color: "var(--text-hi)",
                    fontSize: 13,
                    boxShadow: "inset 0 0 0 1px var(--border)",
                  }}
                />
                <MagneticButton onClick={start} disabled={starting || role.trim().length < 2}>
                  {starting ? "Setting up…" : (
                    <>
                      <Icon name="mic" size={14} /> Begin interview
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

          <div style={{ marginTop: 32 }}>
            <SmallEyebrow>Past sessions</SmallEyebrow>
            {loading ? (
              <div className="skeleton" style={{ height: 60, marginTop: 12 }} />
            ) : items.length === 0 ? (
              <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 12 }}>
                Run a mock interview above. Speak with your mic or type — both work.
              </p>
            ) : (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {items.map((s) => (
                  <a
                    key={s._id}
                    href={`/interviews/${s._id}`}
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
                        {s.role}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 4 }}>
                        {s.level} · {s.messages.length} turns ·{" "}
                        {new Date(s.createdAt).toLocaleDateString()}
                        {s.focus ? ` · focus: ${s.focus}` : ""}
                      </div>
                    </div>
                    <span
                      className="pill"
                      style={{
                        color: s.status === "complete" ? "#6ee7b7" : "#a5b4fc",
                        background: s.status === "complete" ? "rgba(110,231,183,0.08)" : "rgba(165,180,252,0.08)",
                      }}
                    >
                      {s.status === "complete"
                        ? `${Math.round((s.score?.overall || 0) * 100)}% scored`
                        : "in progress"}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

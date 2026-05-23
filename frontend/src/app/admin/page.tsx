"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CairnMark,
  Icon,
  MagneticButton,
  SmallEyebrow,
} from "@/components/ui/primitives";
import { adminFetch, getAdminToken, setAdminToken } from "@/lib/admin";

const ADMIN_ROUTES: { href: string; icon: string; title: string; body: string }[] = [
  {
    href: "/admin/site",
    icon: "globe",
    title: "Site identity & copy",
    body: "Change brand name, logo, colors, hero text, footer, SEO. The site picks it up immediately.",
  },
  {
    href: "/admin/providers",
    icon: "route",
    title: "AI providers & routing",
    body: "Reorder Gemma 4 chains per task. Switch to Llama, Qwen, Mistral without touching code.",
  },
  {
    href: "/admin/credentials",
    icon: "shield",
    title: "API credentials vault",
    body: "Multi-account keys for any service. Encrypted at rest, rotates on rate limit.",
  },
  {
    href: "/admin/guests",
    icon: "user",
    title: "Guest mode & limits",
    body: "Toggle the no-signup flow. Set per-guest + global daily caps.",
  },
  {
    href: "/admin/resources",
    icon: "folder",
    title: "Learning resource corpus",
    body: "Add, edit, or disable resources Gemma 4 can recommend in paths.",
  },
  {
    href: "/admin/strings",
    icon: "badge",
    title: "Strings / labels",
    body: "Edit arbitrary UI labels by key — useful for translations or A/B tests.",
  },
];

export default function AdminHomePage() {
  const [tokenInput, setTokenInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [stats, setStats] = useState<{ counts: Record<string, number> } | null>(null);

  useEffect(() => {
    const t = getAdminToken();
    if (t) verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify() {
    setError(null);
    try {
      await adminFetch("/check", { method: "POST" });
      setAuthed(true);
      const s = await adminFetch<{ counts: Record<string, number> }>("/stats");
      setStats(s);
    } catch {
      setError("Token rejected.");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      setAuthed(false);
    }
  }

  async function submitToken() {
    setAdminToken(tokenInput);
    await verify();
  }

  if (!authed) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          className="card-elev"
          style={{
            width: 420,
            padding: 36,
            position: "relative",
            zIndex: 2,
            animation: shake ? "shake .4s" : "fadeUp .4s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <Lock3D />
          </div>
          <SmallEyebrow>Admin · CMS</SmallEyebrow>
          <h1 className="serif" style={{ fontSize: 36, margin: "10px 0 8px", letterSpacing: "-.02em" }}>
            The <i>backstage</i>.
          </h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 22 }}>
            Brand, providers, resources, string overrides. Enter your <span className="kbd">ADMIN_SECRET</span>.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitToken();
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: "var(--bg-2)",
                boxShadow: "inset 0 0 0 1px var(--border-strong)",
              }}
            >
              <Icon name="lock" size={14} style={{ color: "var(--text-mid)" }} />
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="admin secret"
                autoFocus
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: "var(--text-hi)",
                  fontFamily: "var(--mono)",
                  fontSize: 14,
                }}
              />
            </div>
            {error && (
              <div style={{ marginTop: 12, color: "#fca5a5", fontSize: 12 }}>{error}</div>
            )}
            <div style={{ marginTop: 14 }}>
              <MagneticButton type="submit">
                Unlock <Icon name="arrow-right" size={14} />
              </MagneticButton>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        className="admin-sidebar"
        style={{
          width: 260,
          flex: "0 0 260px",
          borderRight: "1px solid var(--border)",
          padding: "20px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 24px" }}>
          <CairnMark size={22} />
          <span className="serif" style={{ fontSize: 22 }}>Cairn</span>
          <span className="pill" style={{ marginLeft: "auto", fontSize: 10 }}>admin</span>
        </div>
        {ADMIN_ROUTES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 12px",
              borderRadius: 8,
              fontSize: 14,
              color: "var(--text-mid)",
              marginBottom: 2,
            }}
          >
            <Icon name={r.icon} size={14} /> {r.title.split(" ")[0]}
          </Link>
        ))}
        <Link
          href="/"
          className="pill"
          style={{ marginTop: 16, width: "100%", justifyContent: "center", padding: "10px 12px" }}
        >
          ← Back to product
        </Link>
      </aside>
      <main style={{ flex: 1, minWidth: 0 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 28px",
            borderBottom: "1px solid var(--border)",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="pill pill-mint">
              <Icon name="check" size={11} /> unlocked
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--text-mid)" }}>
              workspace: cairn · env: production
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Link href="/" className="btn-magnetic btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }}>
              <Icon name="eye" size={12} /> Live preview
            </Link>
          </div>
        </header>
        <div style={{ padding: 32 }}>
          <SmallEyebrow>Overview</SmallEyebrow>
          <h2 className="serif" style={{ fontSize: 36, margin: "8px 0 6px", letterSpacing: "-.02em" }}>
            What you can change.
          </h2>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginBottom: 24 }}>
            Everything visible to users — without redeploying.
          </p>

          {stats && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
                marginBottom: 28,
              }}
            >
              {Object.entries(stats.counts).map(([k, v]) => (
                <div key={k} className="card" style={{ padding: 14 }}>
                  <div
                    className="mono"
                    style={{
                      fontSize: 10,
                      color: "var(--text-mid)",
                      textTransform: "uppercase",
                      letterSpacing: ".14em",
                    }}
                  >
                    {k}
                  </div>
                  <div className="serif" style={{ fontSize: 28, marginTop: 4, lineHeight: 1 }}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 14,
            }}
          >
            {ADMIN_ROUTES.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="card"
                style={{ padding: 20, transition: "transform .25s, box-shadow .25s", display: "block" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    "0 30px 60px -20px rgba(0,0,0,0.5), inset 0 0 0 1px var(--border-strong)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #6366F1, #34D399)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                    }}
                  >
                    <Icon name={r.icon} size={18} />
                  </div>
                  <h3 className="serif" style={{ fontSize: 20, margin: 0, letterSpacing: "-.02em" }}>
                    {r.title}
                  </h3>
                </div>
                <p style={{ color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{r.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <style>{`@media (max-width: 900px){ .admin-sidebar { display: none; } }`}</style>
    </div>
  );
}

const Lock3D = () => (
  <div style={{ width: 90, height: 90, perspective: "600px", position: "relative" }}>
    <div
      style={{
        width: 70,
        height: 60,
        borderRadius: 10,
        position: "absolute",
        top: 24,
        left: 10,
        background: "linear-gradient(180deg, #2b2f44, #11131c)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.15), 0 18px 30px -8px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          background: "linear-gradient(135deg, #818CF8, #34D399)",
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          boxShadow: "0 0 20px var(--primary-glow)",
        }}
      />
    </div>
    <div
      style={{
        position: "absolute",
        top: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: 50,
        height: 40,
        border: "4px solid #4b4f6a",
        borderBottom: "none",
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
      }}
    />
  </div>
);

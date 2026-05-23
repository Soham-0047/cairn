"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { ReactNode, useEffect, useState } from "react";
import { CairnMark, Icon, MagneticButton } from "./primitives";

/* ------------------------ Top Nav (landing) ------------------------ */
export const TopNav = () => {
  const [scrolled, setScrolled] = useState(false);
  const { status } = useSession();
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, []);
  const navLinks: [string, string][] = [
    ["How it works", "#how"],
    ["Evaluation", "#eval"],
    ["Portfolio", "/example"],
    ["Pricing", "#pricing"],
  ];

  return (
    <nav
      className={scrolled ? "nav-blur" : ""}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        transition: "all .3s ease",
        padding: scrolled ? "12px 0" : "20px 0",
      }}
    >
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <CairnMark size={22} />
          <span className="serif" style={{ fontSize: 22, letterSpacing: "-.02em" }}>Cairn</span>
          <span className="pill" style={{ marginLeft: 8 }}>beta</span>
        </Link>
        <div className="nav-links" style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {navLinks.map(([l, h]) => (
            <a
              key={l}
              href={h}
              onClick={(e) => {
                if (h.startsWith("#")) {
                  e.preventDefault();
                  const id = h.slice(1);
                  const el = document.getElementById(id);
                  if (el) el.scrollIntoView({ behavior: "smooth" });
                }
              }}
              style={{ fontSize: 14, color: "var(--text-mid)" }}
            >
              {l}
            </a>
          ))}
          {status === "authenticated" ? (
            <button onClick={() => signOut()} className="btn-magnetic btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
              Sign out
            </button>
          ) : (
            <button
              onClick={() => signIn("github")}
              style={{ background: "none", border: "none", fontSize: 14, color: "var(--text-mid)", cursor: "pointer" }}
            >
              Sign in
            </button>
          )}
          <MagneticButton href="/onboarding">
            Start your path <Icon name="arrow-right" size={14} />
          </MagneticButton>
        </div>
      </div>
      <style>{`
        @media (max-width: 820px) {
          .nav-links a:not(:last-child), .nav-links button:not(:last-child) { display: none; }
        }
      `}</style>
    </nav>
  );
};

/* ------------------------ Sidebar (app shell) ------------------------ */
type SidebarKey = "dashboard" | "projects-new" | "projects-detail" | "portfolio" | "admin";

export const Sidebar = ({ active, userName, userEmail, targetRole, weekProgress }: {
  active: SidebarKey;
  userName?: string;
  userEmail?: string;
  targetRole?: string;
  weekProgress?: { current: number; total: number };
}) => {
  const items: [SidebarKey | "home", string, string, string][] = [
    ["home", "/", "Home", "home"],
    ["dashboard", "/dashboard", "Path", "route"],
    ["projects-new", "/projects/new", "Submit", "plus"],
    ["projects-detail", "/dashboard", "Projects", "folder"],
    ["portfolio", "/example", "Portfolio", "user"],
    ["admin", "/admin", "Admin", "settings"],
  ];
  const pct = weekProgress ? Math.round((weekProgress.current / Math.max(1, weekProgress.total)) * 100) : 50;
  return (
    <aside
      style={{
        width: 240,
        flex: "0 0 240px",
        padding: "20px 16px",
        borderRight: "1px solid var(--border)",
        background: "var(--bg-0)",
        position: "sticky",
        top: 0,
        height: "100vh",
        overflow: "auto",
      }}
    >
      <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 8px 20px" }}>
        <CairnMark size={22} />
        <span className="serif" style={{ fontSize: 22 }}>Cairn</span>
      </Link>
      <div style={{ marginBottom: 8, padding: "0 8px", fontSize: 11, color: "var(--text-lo)", textTransform: "uppercase", letterSpacing: ".14em" }}>
        Workspace
      </div>
      {items.map(([key, href, label, ico]) => {
        const isActive = key === active;
        return (
          <Link
            key={key}
            href={href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 10px",
              borderRadius: 8,
              color: isActive ? "var(--text-hi)" : "var(--text-mid)",
              background: isActive ? "var(--bg-2)" : "transparent",
              fontSize: 14,
              marginBottom: 2,
              boxShadow: isActive ? "inset 0 0 0 1px var(--border-strong)" : "none",
            }}
          >
            <Icon name={ico} size={16} /> {label}
            {key === "projects-new" && (
              <span className="pill pill-mint" style={{ marginLeft: "auto", fontSize: 10 }}>new</span>
            )}
          </Link>
        );
      })}
      <div
        style={{
          marginTop: 24,
          padding: 14,
          borderRadius: 12,
          background: "var(--bg-2)",
          boxShadow: "inset 0 0 0 1px var(--border)",
        }}
      >
        <div style={{ fontSize: 12, color: "var(--text-mid)", marginBottom: 6 }}>Current path</div>
        <div className="serif italic" style={{ fontSize: 18, lineHeight: 1.2 }}>{targetRole || "Choose a goal"}</div>
        <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: "var(--bg-0)", overflow: "hidden" }}>
          <div
            style={{
              width: `${pct}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--primary), var(--mint))",
            }}
          />
        </div>
        {weekProgress && (
          <div style={{ marginTop: 6, fontSize: 11, color: "var(--text-mid)" }}>
            Week {weekProgress.current} of {weekProgress.total}
          </div>
        )}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 16,
          right: 16,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 10,
          borderRadius: 10,
          background: "var(--bg-1)",
          boxShadow: "inset 0 0 0 1px var(--border)",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            background: "linear-gradient(135deg, #6366F1, #34D399)",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, color: "var(--text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {userName || "Guest"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-mid)" }}>{userEmail || "no signup"}</div>
        </div>
        <Icon name="settings" size={14} style={{ color: "var(--text-mid)" }} />
      </div>
    </aside>
  );
};

/* ------------------------ Topbar (app) ------------------------ */
export const Topbar = ({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) => (
  <header
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "22px 32px",
      borderBottom: "1px solid var(--border)",
      background: "color-mix(in srgb, var(--bg-0) 80%, transparent)",
      backdropFilter: "blur(12px)",
      position: "sticky",
      top: 0,
      zIndex: 30,
    }}
  >
    <div>
      {subtitle && (
        <div style={{ fontSize: 12, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".14em" }}>
          {subtitle}
        </div>
      )}
      <h1 className="serif" style={{ fontSize: 30, margin: 0, letterSpacing: "-.02em" }}>{title}</h1>
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div className="pill" style={{ gap: 8 }}>
        <Icon name="flame" size={12} style={{ color: "#fb923c" }} /> 7 day streak
      </div>
      <div className="pill" style={{ gap: 8 }}>
        <Icon name="sparkles" size={12} style={{ color: "#a5b4fc" }} /> 1,240 XP
      </div>
      <button className="btn-magnetic btn-ghost" style={{ padding: 8 }}>
        <Icon name="search" size={14} />
      </button>
      <button className="btn-magnetic btn-ghost" style={{ padding: 8, position: "relative" }}>
        <Icon name="bell" size={14} />
        <span
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 6,
            height: 6,
            borderRadius: 999,
            background: "#FB923C",
            boxShadow: "0 0 8px #FB923C",
          }}
        />
      </button>
      {right}
    </div>
  </header>
);

/* ------------------------ Footer ------------------------ */
export const Footer = () => (
  <footer style={{ borderTop: "1px solid var(--border)", marginTop: 120, padding: "80px 0 40px", position: "relative", overflow: "hidden" }}>
    <div className="container">
      <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 48, paddingBottom: 60 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <CairnMark size={22} />
            <span className="serif" style={{ fontSize: 24 }}>Cairn</span>
          </div>
          <p style={{ color: "var(--text-mid)", fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
            Verified paths from free tutorials to real careers. Built on Gemma 4, open evaluation, and signed credentials you can actually share.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
            <a className="pill" style={{ padding: 8 }} href="#"><Icon name="twitter" size={14} /></a>
            <a className="pill" style={{ padding: 8 }} href="#"><Icon name="github" size={14} /></a>
            <a className="pill" style={{ padding: 8 }} href="#"><Icon name="linkedin" size={14} /></a>
          </div>
        </div>
        {[
          ["Product", ["Roadmap", "Evaluation", "Credentials", "Portfolio", "Pricing"]],
          ["Learners", ["Paths library", "Resources", "Discord", "Changelog"]],
          ["Recruiters", ["Browse talent", "Verify badge", "Hire faster"]],
          ["Company", ["About", "Blog", "Careers", "Privacy", "Terms"]],
        ].map(([h, items]) => (
          <div key={h as string}>
            <div style={{ fontSize: 12, color: "var(--text-mid)", textTransform: "uppercase", letterSpacing: ".14em", marginBottom: 14 }}>{h}</div>
            {(items as string[]).map((i) => (
              <a key={i} href="#" style={{ display: "block", fontSize: 14, color: "var(--text-hi)", marginBottom: 8, opacity: 0.85 }}>
                {i}
              </a>
            ))}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 24, fontSize: 12, color: "var(--text-mid)" }}>
        <div>© 2026 Cairn Labs. Verified paths, not promises.</div>
        <div style={{ display: "flex", gap: 18 }}>
          <span>v1.4.0 · Gemma 4 · 27B/12B/4B routed</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 6, height: 6, background: "#34D399", borderRadius: 999, boxShadow: "0 0 8px #34D399" }} />{" "}
            All systems normal
          </span>
        </div>
      </div>
      <div
        className="serif italic"
        aria-hidden="true"
        style={{
          position: "relative",
          fontSize: "clamp(160px, 28vw, 380px)",
          lineHeight: 0.9,
          color: "transparent",
          background: "linear-gradient(180deg, color-mix(in srgb, var(--text-hi) 6%, transparent) 0%, transparent 80%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          textAlign: "center",
          marginTop: 40,
          userSelect: "none",
        }}
      >
        Cairn
      </div>
    </div>
    <style>{`
      @media (max-width: 900px) {
        .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
      }
    `}</style>
  </footer>
);

/* ------------------------ Auth gate (shared) ------------------------ */
export const AuthRequired = ({ children, redirectTo = "/onboarding" }: { children: ReactNode; redirectTo?: string }) => {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (status === "unauthenticated") {
      // optional: redirect or display gate
    }
  }, [status, router, pathname, redirectTo]);
  if (status === "loading") {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-mid)" }}>
        <div className="skeleton" style={{ width: 240, height: 24 }} />
      </div>
    );
  }
  if (status === "unauthenticated") {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card" style={{ padding: 36, textAlign: "center", maxWidth: 420 }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0, letterSpacing: "-.02em" }}>Sign in to continue</h1>
          <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 8 }}>
            Save your progress and earn verified credentials.
          </p>
          <div style={{ marginTop: 18 }}>
            <MagneticButton onClick={() => signIn("github")}>
              <Icon name="github" size={14} /> Sign in with GitHub
            </MagneticButton>
          </div>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

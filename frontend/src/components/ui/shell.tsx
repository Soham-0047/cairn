"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CairnMark, Icon, MagneticButton } from "./primitives";
import { proxyFetch } from "@/lib/clientFetch";

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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={() => signIn("github")}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 14,
                  color: "var(--text-mid)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Sign in with GitHub"
              >
                <Icon name="github" size={14} /> Sign in
              </button>
              <button
                onClick={() => signIn("google")}
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  fontSize: 13,
                  color: "var(--text-mid)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Sign in with Google"
              >
                <Icon name="google" size={14} /> Google
              </button>
            </div>
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
type SidebarKey = "dashboard" | "projects-new" | "projects-detail" | "projects-list" | "portfolio" | "settings" | "admin";

export const Sidebar = ({ active, userName, userEmail, userHandle, targetRole, weekProgress }: {
  active: SidebarKey;
  userName?: string;
  userEmail?: string;
  userHandle?: string;
  targetRole?: string;
  weekProgress?: { current: number; total: number };
}) => {
  const portfolioHref = userHandle ? `/u/${userHandle}` : "/example";
  const items: [SidebarKey | "home", string, string, string][] = [
    ["home", "/", "Home", "home"],
    ["dashboard", "/dashboard", "Path", "route"],
    ["projects-new", "/projects/new", "Submit", "plus"],
    ["projects-list", "/projects", "Projects", "folder"],
    ["portfolio", portfolioHref, "Portfolio", "user"],
    ["settings", "/settings", "Settings", "settings"],
    ["admin", "/admin", "Admin", "shield"],
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
        <Link href="/settings" aria-label="Open settings" style={{ display: "flex" }}>
          <Icon name="settings" size={14} style={{ color: "var(--text-mid)" }} />
        </Link>
      </div>
    </aside>
  );
};

/* ------------------------ Topbar (app) ------------------------ */
type UserStats = {
  xp: number;
  streak: number;
  completedMilestones: number;
  totalMilestones: number;
  passedEvals: number;
  totalEvals: number;
};

type Notification = {
  id: string;
  kind: "success" | "warning" | "info" | "error";
  title: string;
  body: string;
  href: string;
  createdAt: string;
};

const useTheme = () => {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("cairn:theme")) as
      | "dark"
      | "light"
      | null;
    const t = saved || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);
  const toggle = useCallback(() => {
    setTheme((curr) => {
      const next = curr === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("cairn:theme", next);
      } catch {}
      return next;
    });
  }, []);
  return { theme, toggle };
};

const formatRelative = (iso: string) => {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};

export const Topbar = ({
  title,
  subtitle,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
}) => {
  const { status } = useSession();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { theme, toggle } = useTheme();

  const hasAuthContext = status === "authenticated" || (typeof window !== "undefined" && !!localStorage.getItem("cairn_guest_token"));

  useEffect(() => {
    if (!hasAuthContext) return;
    proxyFetch("/auth/me/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStats(d))
      .catch(() => {});
    proxyFetch("/auth/me/notifications")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.items && setNotifs(d.items))
      .catch(() => {});
  }, [hasAuthContext]);

  // global keyboard shortcut for search (⌘K / Ctrl+K)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((x) => !x);
      } else if (e.key === "Escape") {
        setSearchOpen(false);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const unreadCount = notifs.filter((n) => {
    const ageMs = Date.now() - new Date(n.createdAt).getTime();
    return ageMs < 7 * 24 * 3600 * 1000;
  }).length;

  return (
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
        <div className="pill" style={{ gap: 8 }} title={`Daily streak: ${stats?.streak ?? 0} days`}>
          <Icon name="flame" size={12} style={{ color: "#fb923c" }} /> {stats?.streak ?? 0} day streak
        </div>
        <div className="pill" style={{ gap: 8 }} title={`XP: ${stats?.xp ?? 0}`}>
          <Icon name="spark" size={12} style={{ color: "#a5b4fc" }} /> {(stats?.xp ?? 0).toLocaleString()} XP
        </div>
        <button
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
          className="btn-magnetic btn-ghost"
          style={{ padding: 8 }}
          title="Search (⌘K)"
        >
          <Icon name="search" size={14} />
        </button>
        <NotifBell
          notifs={notifs}
          unread={unreadCount}
          open={notifOpen}
          setOpen={setNotifOpen}
        />
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="btn-magnetic btn-ghost"
          style={{ padding: 8 }}
          title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        >
          <Icon name={theme === "dark" ? "sun" : "moon"} size={14} />
        </button>
        {right}
      </div>

      {searchOpen && <SearchPalette onClose={() => setSearchOpen(false)} />}
    </header>
  );
};

/* ------------------------ Notification bell ------------------------ */
const NotifBell = ({
  notifs,
  unread,
  open,
  setOpen,
}: {
  notifs: Notification[];
  unread: number;
  open: boolean;
  setOpen: (v: boolean) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open, setOpen]);

  const kindColor = (k: Notification["kind"]) =>
    k === "success" ? "#6ee7b7" : k === "warning" ? "#fdba74" : k === "error" ? "#f87171" : "#a5b4fc";

  return (
    <div style={{ position: "relative" }} ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="btn-magnetic btn-ghost"
        style={{ padding: 8, position: "relative" }}
      >
        <Icon name="bell" size={14} />
        {unread > 0 && (
          <span
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 14,
              height: 14,
              padding: "0 4px",
              borderRadius: 999,
              background: "#FB923C",
              color: "#0a0a0f",
              fontSize: 9,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 8px rgba(251,146,60,0.6)",
            }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: 360,
            maxHeight: 460,
            overflow: "auto",
            background: "var(--bg-1)",
            border: "1px solid var(--border-strong)",
            borderRadius: 14,
            boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
            zIndex: 50,
          }}
        >
          <div
            style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ fontSize: 14, color: "var(--text-hi)" }}>Notifications</div>
            <span className="mono" style={{ fontSize: 10, color: "var(--text-mid)" }}>
              {notifs.length} total
            </span>
          </div>
          {notifs.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--text-mid)", fontSize: 13 }}>
              <Icon name="bell-off" size={20} style={{ color: "var(--text-lo)", marginBottom: 8 }} />
              <div>You're all caught up.</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Submit a project to see updates here.</div>
            </div>
          ) : (
            notifs.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                onClick={() => setOpen(false)}
                style={{
                  display: "flex",
                  gap: 12,
                  padding: "14px 16px",
                  borderBottom: "1px solid var(--border)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: kindColor(n.kind),
                    boxShadow: `0 0 8px ${kindColor(n.kind)}`,
                    marginTop: 6,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--text-hi)", lineHeight: 1.4 }}>{n.title}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-mid)",
                      marginTop: 3,
                      lineHeight: 1.45,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                    }}
                  >
                    {n.body}
                  </div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--text-lo)", marginTop: 6 }}>
                    {formatRelative(n.createdAt)}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};

/* ------------------------ Search palette ------------------------ */
type SearchItem = {
  id: string;
  label: string;
  sublabel: string;
  href: string;
  kind: "project" | "milestone" | "page";
};

const STATIC_PAGES: SearchItem[] = [
  { id: "p:dashboard", label: "Dashboard", sublabel: "Your 12-week path", href: "/dashboard", kind: "page" },
  { id: "p:projects", label: "Projects", sublabel: "Submitted evaluations", href: "/projects", kind: "page" },
  { id: "p:new", label: "New submission", sublabel: "Submit a GitHub repo", href: "/projects/new", kind: "page" },
  { id: "p:onboarding", label: "Onboarding", sublabel: "Generate your path", href: "/onboarding", kind: "page" },
  { id: "p:settings", label: "Settings", sublabel: "Profile & preferences", href: "/settings", kind: "page" },
];

const SearchPalette = ({ onClose }: { onClose: () => void }) => {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const collected: SearchItem[] = [...STATIC_PAGES];
    Promise.all([
      proxyFetch("/evaluations").then((r) => (r.ok ? r.json() : [])).catch(() => []),
      proxyFetch("/paths/active").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([evals, path]) => {
      if (cancelled) return;
      if (Array.isArray(evals)) {
        evals.forEach((e: { _id: string; projectTitle: string; repoUrl: string }) => {
          collected.push({
            id: `e:${e._id}`,
            label: e.projectTitle || "Untitled project",
            sublabel: (e.repoUrl || "").replace(/^https?:\/\/(www\.)?github\.com\//, "") || "project",
            href: `/projects/${e._id}`,
            kind: "project",
          });
        });
      }
      if (path?.phases) {
        path.phases.forEach((ph: { milestones: { week: number; topic: string; deliverable: string }[] }) => {
          ph.milestones.forEach((m) => {
            collected.push({
              id: `m:${m.week}`,
              label: m.topic,
              sublabel: `Week ${m.week} · ${m.deliverable || "milestone"}`,
              href: `/dashboard`,
              kind: "milestone",
            });
          });
        });
      }
      setItems(collected);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items.slice(0, 12);
    return items
      .filter((i) => i.label.toLowerCase().includes(needle) || i.sublabel.toLowerCase().includes(needle))
      .slice(0, 12);
  }, [items, q]);

  useEffect(() => {
    setActive(0);
  }, [q]);

  const go = (i: SearchItem) => {
    onClose();
    router.push(i.href);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(7,7,11,0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "12vh",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 92vw)",
          background: "var(--bg-1)",
          border: "1px solid var(--border-strong)",
          borderRadius: 16,
          boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Icon name="search" size={16} style={{ color: "var(--text-mid)" }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(filtered.length - 1, a + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (filtered[active]) go(filtered[active]);
              }
            }}
            placeholder="Search projects, milestones, pages…"
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              fontSize: 16,
              color: "var(--text-hi)",
            }}
          />
          <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
            ESC
          </span>
        </div>
        <div style={{ maxHeight: "60vh", overflow: "auto", padding: 8 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 36, textAlign: "center", color: "var(--text-mid)", fontSize: 13 }}>
              No matches for "{q}".
            </div>
          ) : (
            filtered.map((i, idx) => {
              const isActive = idx === active;
              const icon =
                i.kind === "project" ? "cube" : i.kind === "milestone" ? "route" : "arrow-right";
              return (
                <button
                  key={i.id}
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => go(i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: isActive ? "var(--bg-2)" : "transparent",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: "var(--bg-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={icon} size={13} style={{ color: "var(--text-mid)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        color: "var(--text-hi)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {i.label}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-mid)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {i.sublabel}
                    </div>
                  </div>
                  <span
                    className="pill"
                    style={{ fontSize: 10, color: "var(--text-mid)", textTransform: "capitalize" }}
                  >
                    {i.kind}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

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
  return <>{children}</>;
};

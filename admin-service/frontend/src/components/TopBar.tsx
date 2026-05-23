"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { api } from "@/lib/api";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/credentials", label: "Credentials" },
  { href: "/site", label: "Site config" },
  { href: "/strings", label: "Strings" },
  { href: "/resources", label: "Resources" },
];

export function TopBar() {
  const session = useSession();
  const pathname = usePathname();

  if (pathname === "/login") return null;

  async function logout() {
    await api("/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/login";
  }

  return (
    <header
      style={{
        borderBottom: "1px solid #1f232d",
        background: "#0e1117",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div className="max-w-5xl mx-auto px-6 flex items-center gap-6 h-14">
        <div className="font-semibold">Admin Service</div>
        {session.status === "authed" && (
          <nav className="flex items-center gap-1 text-sm">
            {TABS.map((t) => {
              const active = pathname === t.href || (t.href !== "/" && pathname.startsWith(t.href));
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 6,
                    color: active ? "#fff" : "#9ba3b3",
                    background: active ? "#1a1d27" : "transparent",
                  }}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        )}
        <div className="ml-auto flex items-center gap-3 text-sm">
          {session.status === "authed" && (
            <>
              <span style={{ color: "#9ba3b3" }}>{session.admin.email}</span>
              <button className="btn btn-ghost" onClick={logout}>
                Sign out
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

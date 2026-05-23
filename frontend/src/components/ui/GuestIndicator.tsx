"use client";
import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Icon } from "@/components/ui/primitives";
import { clearGuest, getGuestMeta, type GuestMeta } from "@/lib/guest";

/**
 * Sticky banner shown to guest users on app pages.
 * Surfaces guest status, remaining quota, and a sign-in CTA so the user
 * knows they are NOT signed in and progress will not persist past the
 * session window.
 */
export function GuestBanner() {
  const { data: session } = useSession();
  const [meta, setMeta] = useState<GuestMeta | null>(null);

  useEffect(() => {
    setMeta(getGuestMeta());
  }, []);

  useEffect(() => {
    if (session?.backendToken && meta) {
      clearGuest();
      setMeta(null);
    }
  }, [session, meta]);

  if (!meta || session?.backendToken) return null;
  const expires = new Date(meta.expiresAt);
  const hoursLeft = Math.max(0, Math.round((expires.getTime() - Date.now()) / 3600000));

  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        padding: "10px 24px",
        background: "linear-gradient(90deg, rgba(251,146,60,0.18), rgba(99,102,241,0.18))",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        backdropFilter: "blur(12px)",
      }}
    >
      <span className="pill pill-warm" style={{ flexShrink: 0 }}>
        <Icon name="sparkles" size={11} /> Guest mode
      </span>
      <span style={{ fontSize: 13, color: "var(--text-hi)", flex: 1, minWidth: 220 }}>
        You're trying Cairn without an account. Progress saves for {hoursLeft}h —{" "}
        <strong>sign in to keep your path and earn verified credentials.</strong>
      </span>
      <span className="mono" style={{ fontSize: 11, color: "var(--text-mid)" }}>
        @{meta.handle} · {meta.limits.maxPathsPerGuest} path · {meta.limits.maxEvalsPerGuest} evals
      </span>
      <button
        onClick={() => signIn("github")}
        className="btn-magnetic btn-primary"
        style={{ padding: "8px 14px", fontSize: 13 }}
      >
        <Icon name="github" size={13} /> Sign in to save
      </button>
    </div>
  );
}

/**
 * Small pill suitable for the Topbar right slot, indicating guest status.
 */
export function GuestPill() {
  const { data: session } = useSession();
  const [meta, setMeta] = useState<GuestMeta | null>(null);
  useEffect(() => {
    setMeta(getGuestMeta());
  }, []);
  if (!meta || session?.backendToken) return null;
  return (
    <span className="pill pill-warm" title="You are signed in as a guest. Progress will not persist past the session.">
      <Icon name="user" size={11} /> guest · @{meta.handle}
    </span>
  );
}

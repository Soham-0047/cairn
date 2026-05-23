"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import { Icon, MagneticButton, SmallEyebrow, useToast } from "@/components/ui/primitives";
import { Sidebar, Topbar } from "@/components/ui/shell";
import { GuestBanner } from "@/components/ui/GuestIndicator";
import { getGuestMeta, getGuestToken, clearGuest } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";

type Me = {
  id: string;
  email: string;
  name: string;
  handle: string;
  avatarUrl: string;
  githubUsername: string;
  timezone?: string;
  profile?: {
    targetRole?: string;
    background?: string;
    weeklyHours?: number;
    timelineWeeks?: number;
  };
  isGuest?: boolean;
};

type Prefs = {
  notifyMilestones: boolean;
  notifyCredentials: boolean;
  notifyWeeklyDigest: boolean;
  reduceMotion: boolean;
  compactLayout: boolean;
};

const DEFAULT_PREFS: Prefs = {
  notifyMilestones: true,
  notifyCredentials: true,
  notifyWeeklyDigest: false,
  reduceMotion: false,
  compactLayout: false,
};

const PREFS_KEY = "cairn_user_prefs";

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFS_KEY, JSON.stringify(p));
}

export default function SettingsPage() {
  const { status, data: session } = useSession();
  const toast = useToast();
  const [hasGuest, setHasGuest] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  // form fields
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [background, setBackground] = useState("");
  const [weeklyHours, setWeeklyHours] = useState<number | "">("");
  const [timelineWeeks, setTimelineWeeks] = useState<number | "">("");
  const [timezone, setTimezone] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
    setPrefs(loadPrefs());
  }, []);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" && !hasGuest) {
      setLoading(false);
      return;
    }
    proxyFetch("/auth/me")
      .then(async (r) => {
        if (!r.ok) throw new Error(`Failed to load profile (${r.status})`);
        return r.json() as Promise<Me>;
      })
      .then((data) => {
        setMe(data);
        setName(data.name || "");
        setHandle(data.handle || "");
        setAvatarUrl(data.avatarUrl || "");
        setTargetRole(data.profile?.targetRole || "");
        setBackground(data.profile?.background || "");
        setWeeklyHours(data.profile?.weeklyHours ?? "");
        setTimelineWeeks(data.profile?.timelineWeeks ?? "");
        setTimezone(data.timezone || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load profile"))
      .finally(() => setLoading(false));
  }, [status, hasGuest]);

  const isGuest = me?.isGuest || (hasGuest && status !== "authenticated");

  const dirty = useMemo(() => {
    if (!me) return false;
    return (
      name !== (me.name || "") ||
      handle !== (me.handle || "") ||
      avatarUrl !== (me.avatarUrl || "") ||
      targetRole !== (me.profile?.targetRole || "") ||
      background !== (me.profile?.background || "") ||
      String(weeklyHours) !== String(me.profile?.weeklyHours ?? "") ||
      String(timelineWeeks) !== String(me.profile?.timelineWeeks ?? "") ||
      timezone !== (me.timezone || "")
    );
  }, [me, name, handle, avatarUrl, targetRole, background, weeklyHours, timelineWeeks, timezone]);

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      if (name !== (me?.name || "")) payload.name = name;
      if (handle !== (me?.handle || "")) payload.handle = handle.toLowerCase();
      if (avatarUrl !== (me?.avatarUrl || "")) payload.avatarUrl = avatarUrl;
      if (timezone !== (me?.timezone || "")) payload.timezone = timezone;
      const profile: Record<string, unknown> = {};
      if (targetRole !== (me?.profile?.targetRole || "")) profile.targetRole = targetRole;
      if (background !== (me?.profile?.background || "")) profile.background = background;
      if (String(weeklyHours) !== String(me?.profile?.weeklyHours ?? "")) {
        profile.weeklyHours = weeklyHours === "" ? undefined : Number(weeklyHours);
      }
      if (String(timelineWeeks) !== String(me?.profile?.timelineWeeks ?? "")) {
        profile.timelineWeeks = timelineWeeks === "" ? undefined : Number(timelineWeeks);
      }
      if (Object.keys(profile).length > 0) payload.profile = profile;

      const res = await proxyFetch("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        const flat = body?.error;
        const msg =
          typeof flat === "string"
            ? flat
            : flat && typeof flat === "object"
            ? Object.values(flat).flat().join(" · ")
            : "Could not save";
        throw new Error(msg);
      }
      setMe((prev) => (prev ? { ...prev, ...body } : prev));
      toast.push("Profile saved", "success");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  function togglePref<K extends keyof Prefs>(k: K) {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    savePrefs(next);
    toast.push("Preference updated", "success");
  }

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="card-elev" style={{ padding: 36, maxWidth: 420, textAlign: "center" }}>
          <h1 className="serif" style={{ fontSize: 28, margin: 0, letterSpacing: "-.02em" }}>Sign in to settings</h1>
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
  const userEmail = session?.user?.email || (hasGuest ? "guest mode" : undefined);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-0)" }}>
      <Sidebar
        active="settings"
        userName={userName}
        userEmail={userEmail}
        userHandle={session?.user?.handle || guestMeta?.handle}
      />
      <main style={{ flex: 1, minWidth: 0 }}>
        <GuestBanner />
        <Topbar
          title="Settings"
          subtitle="Profile · notifications · preferences"
          right={
            dirty && !isGuest ? (
              <MagneticButton onClick={save}>
                {saving ? "Saving…" : "Save changes"}
              </MagneticButton>
            ) : undefined
          }
        />

        <div className="set-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 32, padding: 32 }}>
          <div>
            {/* Guest notice */}
            {isGuest && (
              <div
                className="card"
                style={{
                  padding: 18,
                  marginBottom: 22,
                  background:
                    "linear-gradient(135deg, color-mix(in srgb, var(--warm) 14%, var(--bg-1)), var(--bg-1))",
                  boxShadow: "inset 0 0 0 1px rgba(251,146,60,0.3)",
                }}
              >
                <SmallEyebrow>Guest mode</SmallEyebrow>
                <h3 className="serif" style={{ fontSize: 22, margin: "8px 0", letterSpacing: "-.015em" }}>
                  Sign in to save profile changes.
                </h3>
                <p style={{ color: "var(--text-mid)", fontSize: 13, lineHeight: 1.6 }}>
                  Guest accounts cannot persist profile edits. Sign in with GitHub or Google to keep your changes.
                </p>
                <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button onClick={() => signIn("github")} className="btn-magnetic btn-primary" style={{ padding: "8px 14px", fontSize: 13 }}>
                    <Icon name="github" size={13} /> Sign in with GitHub
                  </button>
                  <button onClick={() => signIn("google")} className="btn-magnetic btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }}>
                    <Icon name="google" size={13} /> Google
                  </button>
                </div>
              </div>
            )}

            {/* Profile */}
            <Section title="Profile" eyebrow="01 · public">
              {loading ? (
                <div className="skeleton" style={{ width: "100%", height: 120 }} />
              ) : (
                <>
                  <Row label="Avatar">
                    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                      {avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={avatarUrl}
                          alt={name || handle}
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 999,
                            objectFit: "cover",
                            boxShadow: "inset 0 0 0 1px var(--border-strong)",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: 999,
                            background: "linear-gradient(135deg, #6366F1, #34D399)",
                          }}
                        />
                      )}
                      <Input
                        value={avatarUrl}
                        onChange={setAvatarUrl}
                        placeholder="https://…/avatar.png"
                        style={{ flex: 1, minWidth: 220 }}
                        disabled={isGuest}
                      />
                    </div>
                  </Row>
                  <Row label="Name">
                    <Input value={name} onChange={setName} placeholder="Your name" disabled={isGuest} />
                  </Row>
                  <Row label="Handle" hint={`cairn.dev/u/${handle || "your-handle"}`}>
                    <Input
                      value={handle}
                      onChange={(v) => setHandle(v.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="your-handle"
                      disabled={isGuest}
                    />
                  </Row>
                  <Row label="Target role">
                    <Input
                      value={targetRole}
                      onChange={setTargetRole}
                      placeholder="e.g. AI engineer"
                      disabled={isGuest}
                    />
                  </Row>
                  <Row label="Background">
                    <Textarea
                      value={background}
                      onChange={setBackground}
                      placeholder="What's your story? Recruiters & coach Gemma both use this."
                      disabled={isGuest}
                    />
                  </Row>
                </>
              )}
            </Section>

            {/* Path preferences */}
            <Section title="Path preferences" eyebrow="02 · learning">
              <Row label="Weekly hours" hint="How many hours / week can you commit?">
                <Input
                  type="number"
                  value={String(weeklyHours)}
                  onChange={(v) => setWeeklyHours(v === "" ? "" : Math.max(1, Math.min(80, Number(v))))}
                  placeholder="10"
                  style={{ maxWidth: 120 }}
                  disabled={isGuest}
                />
              </Row>
              <Row label="Timeline (weeks)">
                <Input
                  type="number"
                  value={String(timelineWeeks)}
                  onChange={(v) => setTimelineWeeks(v === "" ? "" : Math.max(2, Math.min(52, Number(v))))}
                  placeholder="12"
                  style={{ maxWidth: 120 }}
                  disabled={isGuest}
                />
              </Row>
              <Row label="Timezone">
                <Input
                  value={timezone}
                  onChange={setTimezone}
                  placeholder="Asia/Kolkata"
                  style={{ maxWidth: 240 }}
                  disabled={isGuest}
                />
              </Row>
            </Section>

            {/* Notifications — stored client-side */}
            <Section title="Notifications" eyebrow="03 · alerts">
              <p style={{ color: "var(--text-mid)", fontSize: 13, marginBottom: 14, marginTop: -4 }}>
                Notification delivery is coming soon. Preferences are saved on this device.
              </p>
              <Toggle
                label="Milestone reminders"
                description="Nudge me when a milestone is up next."
                on={prefs.notifyMilestones}
                onChange={() => togglePref("notifyMilestones")}
              />
              <Toggle
                label="Credential issued"
                description="Notify me when a credential is minted from an evaluation."
                on={prefs.notifyCredentials}
                onChange={() => togglePref("notifyCredentials")}
              />
              <Toggle
                label="Weekly progress digest"
                description="A summary of what you shipped each Sunday."
                on={prefs.notifyWeeklyDigest}
                onChange={() => togglePref("notifyWeeklyDigest")}
              />
            </Section>

            {/* Appearance */}
            <Section title="Appearance" eyebrow="04 · interface">
              <Toggle
                label="Reduce motion"
                description="Disable subtle animations and parallax."
                on={prefs.reduceMotion}
                onChange={() => togglePref("reduceMotion")}
              />
              <Toggle
                label="Compact layout"
                description="Tighter spacing on dashboards and lists."
                on={prefs.compactLayout}
                onChange={() => togglePref("compactLayout")}
              />
            </Section>

            {/* Connected accounts */}
            <Section title="Connected accounts" eyebrow="05 · auth">
              <Row label="GitHub">
                {me?.githubUsername ? (
                  <a
                    className="pill"
                    href={`https://github.com/${me.githubUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ padding: "6px 12px" }}
                  >
                    <Icon name="github" size={12} /> {me.githubUsername}
                  </a>
                ) : (
                  <button onClick={() => signIn("github")} className="btn-magnetic btn-ghost" style={{ padding: "8px 12px", fontSize: 13 }}>
                    <Icon name="github" size={13} /> Connect GitHub
                  </button>
                )}
              </Row>
              <Row label="Google">
                {session?.user?.email && !me?.githubUsername ? (
                  <span className="pill" style={{ padding: "6px 12px" }}>
                    <Icon name="google" size={12} /> {session.user.email}
                  </span>
                ) : (
                  <button onClick={() => signIn("google")} className="btn-magnetic btn-ghost" style={{ padding: "8px 12px", fontSize: 13 }}>
                    <Icon name="google" size={13} /> Connect Google
                  </button>
                )}
              </Row>
            </Section>

            {/* Danger zone */}
            <Section title="Session" eyebrow="06 · account">
              {hasGuest && status !== "authenticated" ? (
                <button
                  onClick={() => {
                    clearGuest();
                    toast.push("Guest session cleared", "success");
                    if (typeof window !== "undefined") window.location.href = "/";
                  }}
                  className="btn-magnetic btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  <Icon name="x" size={13} /> End guest session
                </button>
              ) : (
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="btn-magnetic btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  <Icon name="x" size={13} /> Sign out
                </button>
              )}
            </Section>

            {error && (
              <div
                style={{
                  marginTop: 18,
                  padding: 12,
                  borderRadius: 10,
                  background: "rgba(248,113,113,0.08)",
                  boxShadow: "inset 0 0 0 1px rgba(248,113,113,0.3)",
                  color: "#fca5a5",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {dirty && !isGuest && (
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={() => {
                    if (!me) return;
                    setName(me.name || "");
                    setHandle(me.handle || "");
                    setAvatarUrl(me.avatarUrl || "");
                    setTargetRole(me.profile?.targetRole || "");
                    setBackground(me.profile?.background || "");
                    setWeeklyHours(me.profile?.weeklyHours ?? "");
                    setTimelineWeeks(me.profile?.timelineWeeks ?? "");
                    setTimezone(me.timezone || "");
                  }}
                  className="btn-magnetic btn-ghost"
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  Revert
                </button>
                <MagneticButton onClick={save}>{saving ? "Saving…" : "Save changes"}</MagneticButton>
              </div>
            )}
          </div>

          {/* Right rail */}
          <aside style={{ position: "sticky", top: 100, alignSelf: "flex-start" }}>
            <div className="card" style={{ padding: 20 }}>
              <SmallEyebrow>Account summary</SmallEyebrow>
              <div style={{ marginTop: 12 }}>
                <Pair k="Email" v={me?.email || (isGuest ? "guest" : "—")} mono />
                <Pair k="Handle" v={me?.handle ? `@${me.handle}` : "—"} mono />
                <Pair k="Plan" v="free" />
                <Pair k="Timezone" v={me?.timezone || "—"} mono />
              </div>
              {me?.handle && (
                <Link
                  href={`/u/${me.handle}`}
                  className="btn-magnetic btn-ghost"
                  style={{ marginTop: 14, padding: "8px 14px", fontSize: 13, display: "inline-flex" }}
                >
                  <Icon name="arrow-up-right" size={12} /> View public portfolio
                </Link>
              )}
            </div>
            <div className="card" style={{ padding: 20, marginTop: 16 }}>
              <SmallEyebrow>Need help?</SmallEyebrow>
              <p style={{ marginTop: 10, fontSize: 13, color: "var(--text-mid)", lineHeight: 1.6 }}>
                Notifications and email delivery are still being wired up. Settings save instantly to your profile.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <style>{`
        @media (max-width: 1100px) {
          aside.sticky-rail, aside[style*="sticky"] { position: static !important; }
          aside { display: revert; }
          .set-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 1100px) {
          /* hide the main left sidebar on small screens */
          main > .set-grid { padding: 16px !important; }
          aside[style*="240px"] { display: none; }
        }
      `}</style>
    </div>
  );
}

/* ------------------------ small UI helpers ------------------------ */

const Section = ({ title, eyebrow, children }: { title: string; eyebrow: string; children: React.ReactNode }) => (
  <section className="card" style={{ padding: 22, marginBottom: 22 }}>
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 14 }}>
      <SmallEyebrow>{eyebrow}</SmallEyebrow>
      <h2 className="serif" style={{ fontSize: 22, margin: 0, letterSpacing: "-.015em" }}>{title}</h2>
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
  </section>
);

const Row = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 14, alignItems: "start" }}>
    <div>
      <div style={{ fontSize: 13, color: "var(--text-hi)" }}>{label}</div>
      {hint && <div className="mono" style={{ fontSize: 10, color: "var(--text-mid)", marginTop: 4 }}>{hint}</div>}
    </div>
    <div style={{ minWidth: 0 }}>{children}</div>
  </div>
);

const Input = ({
  value,
  onChange,
  placeholder,
  type = "text",
  style,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
}) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    type={type}
    disabled={disabled}
    style={{
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      background: disabled ? "var(--bg-0)" : "var(--bg-2)",
      boxShadow: "inset 0 0 0 1px var(--border)",
      border: "none",
      outline: "none",
      color: disabled ? "var(--text-mid)" : "var(--text-hi)",
      fontFamily: "inherit",
      fontSize: 14,
      opacity: disabled ? 0.7 : 1,
      ...style,
    }}
  />
);

const Textarea = ({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    disabled={disabled}
    rows={4}
    style={{
      width: "100%",
      padding: "10px 14px",
      borderRadius: 10,
      background: disabled ? "var(--bg-0)" : "var(--bg-2)",
      boxShadow: "inset 0 0 0 1px var(--border)",
      border: "none",
      outline: "none",
      color: disabled ? "var(--text-mid)" : "var(--text-hi)",
      fontFamily: "inherit",
      fontSize: 14,
      resize: "vertical",
      lineHeight: 1.5,
      opacity: disabled ? 0.7 : 1,
    }}
  />
);

const Toggle = ({
  label,
  description,
  on,
  onChange,
}: {
  label: string;
  description?: string;
  on: boolean;
  onChange: () => void;
}) => (
  <button
    onClick={onChange}
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "10px 12px",
      borderRadius: 10,
      background: "var(--bg-2)",
      boxShadow: "inset 0 0 0 1px var(--border)",
      border: "none",
      cursor: "pointer",
      textAlign: "left",
      width: "100%",
    }}
  >
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14, color: "var(--text-hi)" }}>{label}</div>
      {description && <div style={{ fontSize: 12, color: "var(--text-mid)", marginTop: 2 }}>{description}</div>}
    </div>
    <span
      style={{
        width: 36,
        height: 20,
        borderRadius: 999,
        background: on ? "linear-gradient(135deg, var(--primary), var(--mint))" : "var(--bg-0)",
        boxShadow: on ? "0 0 12px rgba(99,102,241,0.5)" : "inset 0 0 0 1px var(--border-strong)",
        position: "relative",
        flexShrink: 0,
        transition: "background .2s",
      }}
      aria-pressed={on}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: on ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: 999,
          background: "#fff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          transition: "left .2s",
        }}
      />
    </span>
  </button>
);

const Pair = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
    <span style={{ fontSize: 12, color: "var(--text-mid)" }}>{k}</span>
    <span className={mono ? "mono" : undefined} style={{ fontSize: 12, color: "var(--text-hi)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginLeft: 12 }}>
      {v}
    </span>
  </div>
);

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Trash2, RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/admin";

type GuestConfig = {
  enabled: boolean;
  maxPathsPerGuest: number;
  maxEvalsPerGuest: number;
  maxEvalsPerDayGlobal: number;
  maxGuestsPerDayGlobal: number;
  sessionHours: number;
  allowScreenshots: boolean;
  bannerText: string;
};

type GuestStats = {
  counts: { totalGuests: number; last24h: number; lastHour: number; expired: number; evals24h: number };
  recent: { handle: string; createdAt: string; guestExpiresAt: string }[];
};

export default function AdminGuestsPage() {
  const [config, setConfig] = useState<GuestConfig | null>(null);
  const [stats, setStats] = useState<GuestStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setErr(null);
    try {
      const [c, s] = await Promise.all([
        adminFetch<{ guestMode: GuestConfig }>("/config"),
        adminFetch<GuestStats>("/guests"),
      ]);
      setConfig(c.guestMode);
      setStats(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    setErr(null);
    try {
      await adminFetch("/config", {
        method: "PATCH",
        body: JSON.stringify({ guestMode: config }),
      });
      setSavedAt(new Date());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function cleanup() {
    if (!confirm("Delete all expired guests (and their paths/evals)?")) return;
    const res = await adminFetch<{ deleted: number }>("/guests/cleanup", { method: "POST" });
    alert(`Deleted ${res.deleted} expired guests.`);
    refresh();
  }

  async function purgeAll() {
    if (!confirm("PURGE every guest? This deletes all guest users + their data.")) return;
    const res = await adminFetch<{ deleted: number }>("/guests/purge-all", { method: "POST" });
    alert(`Deleted ${res.deleted} guest users.`);
    refresh();
  }

  if (!config || !stats) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-zinc-400">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Admin
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Guest mode</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Let judges &amp; visitors try the product without GitHub OAuth. Limits keep your free-tier quotas safe.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>
      {savedAt ? <p className="mt-2 text-xs text-emerald-700">Saved {savedAt.toLocaleTimeString()}</p> : null}
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            ["totalGuests", "Total guests"],
            ["last24h", "Last 24h"],
            ["lastHour", "Last hour"],
            ["expired", "Expired"],
            ["evals24h", "Evals (24h)"],
          ] as const
        ).map(([k, label]) => (
          <div key={k} className="card !p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
            <p className="mt-1 text-xl font-semibold text-zinc-900">{stats.counts[k]}</p>
          </div>
        ))}
      </section>

      <section className="mt-8 card space-y-4">
        <Toggle
          label="Enable guest mode"
          help="Turn off entirely if you need to stop new guest sessions immediately."
          value={config.enabled}
          onChange={(v) => setConfig({ ...config, enabled: v })}
        />
        <Toggle
          label="Allow screenshots for guests"
          help="Multimodal eval costs more. Turn off to disable visual review for guests only."
          value={config.allowScreenshots}
          onChange={(v) => setConfig({ ...config, allowScreenshots: v })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField
            label="Max paths per guest"
            value={config.maxPathsPerGuest}
            min={0}
            max={50}
            onChange={(v) => setConfig({ ...config, maxPathsPerGuest: v })}
          />
          <NumField
            label="Max evaluations per guest"
            value={config.maxEvalsPerGuest}
            min={0}
            max={50}
            onChange={(v) => setConfig({ ...config, maxEvalsPerGuest: v })}
          />
          <NumField
            label="Max evaluations per day (global)"
            value={config.maxEvalsPerDayGlobal}
            min={0}
            max={10000}
            onChange={(v) => setConfig({ ...config, maxEvalsPerDayGlobal: v })}
          />
          <NumField
            label="Max new guests per day (global)"
            value={config.maxGuestsPerDayGlobal}
            min={0}
            max={10000}
            onChange={(v) => setConfig({ ...config, maxGuestsPerDayGlobal: v })}
          />
          <NumField
            label="Guest session length (hours)"
            value={config.sessionHours}
            min={1}
            max={720}
            onChange={(v) => setConfig({ ...config, sessionHours: v })}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-700">Guest banner text</label>
          <textarea
            value={config.bannerText}
            onChange={(e) => setConfig({ ...config, bannerText: e.target.value })}
            rows={2}
            className="input mt-1"
          />
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Maintenance</h2>
          <div className="flex gap-2">
            <button onClick={refresh} className="btn-ghost !text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <button onClick={cleanup} className="btn-secondary !text-xs">
              <Trash2 className="h-3.5 w-3.5" /> Delete expired
            </button>
            <button
              onClick={purgeAll}
              className="!text-xs inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" /> Purge ALL guests
            </button>
          </div>
        </div>
        <div className="mt-3 card !p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Recent guests</p>
          <ul className="mt-2 divide-y divide-zinc-100 text-sm">
            {stats.recent.map((g) => (
              <li key={g.handle} className="flex items-center justify-between py-1.5">
                <span className="font-mono text-xs">{g.handle}</span>
                <span className="text-xs text-zinc-500">
                  created {new Date(g.createdAt).toLocaleString()} · expires{" "}
                  {new Date(g.guestExpiresAt).toLocaleString()}
                </span>
              </li>
            ))}
            {stats.recent.length === 0 ? <li className="py-2 text-zinc-400">None.</li> : null}
          </ul>
        </div>
      </section>
    </div>
  );
}

function Toggle({
  label,
  help,
  value,
  onChange,
}: {
  label: string;
  help?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <p className="text-sm font-medium text-zinc-800">{label}</p>
        {help ? <p className="text-xs text-zinc-500">{help}</p> : null}
      </div>
    </label>
  );
}
function NumField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-700">{label}</label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value || "0", 10))}
        className="input mt-1"
      />
    </div>
  );
}

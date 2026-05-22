"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin";

type ConfigBlob = { strings: Record<string, string> };

export default function AdminStringsPage() {
  const [strings, setStrings] = useState<Record<string, string>>({});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<ConfigBlob>("/config")
      .then((c) => {
        const obj = c.strings && c.strings instanceof Map
          ? Object.fromEntries(c.strings)
          : (c.strings as unknown as Record<string, string>) || {};
        setStrings(obj);
      })
      .catch((e) => setErr(e.message));
  }, []);

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      await adminFetch("/config", {
        method: "PATCH",
        body: JSON.stringify({ strings }),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function add() {
    if (!newKey.trim()) return;
    setStrings({ ...strings, [newKey.trim()]: newVal });
    setNewKey("");
    setNewVal("");
  }

  function remove(k: string) {
    const { [k]: _, ...rest } = strings;
    setStrings(rest);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Admin
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Strings</h1>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        </button>
      </div>
      <p className="mt-1 text-sm text-zinc-600">
        Custom UI labels by key. Use these for A/B copy or quick translations without touching code.
      </p>
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}

      <section className="mt-6 card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Add string</h2>
        <div className="mt-3 grid grid-cols-[180px_1fr_auto] gap-2">
          <input
            placeholder="key e.g. dashboard.welcome"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="input"
          />
          <input
            placeholder="value"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            className="input"
          />
          <button onClick={add} className="btn-ghost">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="mt-6 space-y-2">
        {Object.entries(strings).map(([k, v]) => (
          <div key={k} className="card !p-3">
            <div className="grid grid-cols-[180px_1fr_auto] gap-2">
              <code className="rounded bg-zinc-100 px-2 py-1 text-xs">{k}</code>
              <input
                value={v}
                onChange={(e) => setStrings({ ...strings, [k]: e.target.value })}
                className="input !py-1.5 text-sm"
              />
              <button onClick={() => remove(k)} className="rounded p-1.5 hover:bg-red-100 hover:text-red-700">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {Object.keys(strings).length === 0 ? (
          <p className="text-sm text-zinc-500">No strings yet.</p>
        ) : null}
      </section>
    </div>
  );
}

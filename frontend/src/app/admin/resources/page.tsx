"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin";

type Resource = {
  _id?: string;
  url: string;
  title: string;
  type: "video" | "article" | "course" | "book" | "doc";
  source?: string;
  durationMin?: number;
  topics: string[];
  qualityScore?: number;
  description?: string;
  enabled?: boolean;
};

const EMPTY: Resource = {
  url: "",
  title: "",
  type: "article",
  topics: [],
  qualityScore: 0.7,
  enabled: true,
};

export default function AdminResourcesPage() {
  const [items, setItems] = useState<Resource[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Resource>(EMPTY);
  const [topicsInput, setTopicsInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [q]);

  async function load() {
    try {
      const data = await adminFetch<Resource[]>(`/resources${q ? `?q=${encodeURIComponent(q)}` : ""}`);
      setItems(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        ...editing,
        topics: topicsInput.split(",").map((t) => t.trim()).filter(Boolean),
      };
      await adminFetch("/resources", { method: "POST", body: JSON.stringify(payload) });
      setEditing(EMPTY);
      setTopicsInput("");
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this resource?")) return;
    await adminFetch(`/resources/${id}`, { method: "DELETE" });
    await load();
  }

  function edit(r: Resource) {
    setEditing(r);
    setTopicsInput(r.topics.join(", "));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Admin
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">Learning resources</h1>
      <p className="mt-1 text-sm text-zinc-600">Free content that Gemma 4 can recommend in paths.</p>
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}

      <section className="mt-6 card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {editing._id ? "Edit resource" : "Add resource"}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="URL" value={editing.url} onChange={(v) => setEditing({ ...editing, url: v })} />
          <Field label="Title" value={editing.title} onChange={(v) => setEditing({ ...editing, title: v })} />
          <div>
            <label className="text-xs font-medium text-zinc-700">Type</label>
            <select
              value={editing.type}
              onChange={(e) => setEditing({ ...editing, type: e.target.value as Resource["type"] })}
              className="input mt-1"
            >
              {(["video", "article", "course", "book", "doc"] as const).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <Field label="Source" value={editing.source || ""} onChange={(v) => setEditing({ ...editing, source: v })} />
          <div>
            <label className="text-xs font-medium text-zinc-700">Duration (min)</label>
            <input
              type="number"
              value={editing.durationMin || 0}
              onChange={(e) => setEditing({ ...editing, durationMin: parseInt(e.target.value || "0", 10) })}
              className="input mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-700">Quality (0-1)</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={editing.qualityScore ?? 0.7}
              onChange={(e) => setEditing({ ...editing, qualityScore: parseFloat(e.target.value || "0.7") })}
              className="input mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-zinc-700">Topics (comma-separated)</label>
            <input
              value={topicsInput}
              onChange={(e) => setTopicsInput(e.target.value)}
              placeholder="python, ml, fundamentals"
              className="input mt-1"
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </button>
          {editing._id ? (
            <button
              onClick={() => {
                setEditing(EMPTY);
                setTopicsInput("");
              }}
              className="btn-ghost"
            >
              Cancel edit
            </button>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">All resources</h2>
          <input
            placeholder="Search title or topic"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input !w-64"
          />
        </div>
        <div className="mt-3 space-y-2">
          {items.map((r) => (
            <div key={r._id} className="card !p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium text-zinc-900 hover:underline">
                    {r.title}
                  </a>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {r.type} · {r.source || "—"} · {r.durationMin}m · quality {r.qualityScore?.toFixed(2)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.topics.map((t) => (
                      <span key={t} className="badge-neutral !text-[10px]">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => edit(r)} className="btn-ghost !py-1.5 text-xs">
                    Edit
                  </button>
                  <button onClick={() => r._id && remove(r._id)} className="rounded p-1.5 hover:bg-red-100 hover:text-red-700">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 ? <p className="text-sm text-zinc-500">No resources match.</p> : null}
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-zinc-700">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1" />
    </div>
  );
}

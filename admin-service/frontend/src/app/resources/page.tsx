"use client";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/session";
import { api } from "@/lib/api";

type Resource = {
  _id: string;
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

export default function ResourcesPage() {
  const s = useRequireAuth();
  const [items, setItems] = useState<Resource[]>([]);
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (s.status !== "authed") return;
    refresh();
  }, [s.status]);

  async function refresh() {
    const url = q ? `/admin/resources?q=${encodeURIComponent(q)}` : "/admin/resources";
    setItems(await api<Resource[]>(url));
  }
  async function remove(id: string) {
    if (!confirm("Delete?")) return;
    await api(`/admin/resources/${id}`, { method: "DELETE" });
    refresh();
  }

  if (s.status !== "authed") return null;

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Resources</h1>
        <button className="btn" onClick={() => setAdding((v) => !v)}>{adding ? "Close" : "+ Add"}</button>
      </header>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          className="input"
          placeholder="search title or topic…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refresh()}
        />
        <button className="btn btn-ghost" onClick={refresh}>Search</button>
      </div>

      {adding && <AddResource onDone={() => { setAdding(false); refresh(); }} />}

      <div style={{ display: "grid", gap: 8 }}>
        {items.length === 0 && (
          <div className="card" style={{ color: "#9ba3b3", textAlign: "center" }}>No resources.</div>
        )}
        {items.map((r) => (
          <div key={r._id} className="card" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="pill">{r.type}</span>
                <a href={r.url} target="_blank" rel="noreferrer" style={{ color: "#fff", fontWeight: 500 }}>
                  {r.title}
                </a>
              </div>
              <div style={{ fontSize: 12, color: "#9ba3b3", marginTop: 4 }}>
                {(r.topics || []).join(", ")} {r.qualityScore != null && `· quality ${r.qualityScore}`}
              </div>
            </div>
            <button className="btn btn-danger" onClick={() => remove(r._id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddResource({ onDone }: { onDone: () => void }) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"video" | "article" | "course" | "book" | "doc">("article");
  const [topics, setTopics] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api("/admin/resources", {
        method: "POST",
        body: JSON.stringify({
          url,
          title,
          type,
          topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
        }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">URL</label>
          <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">Title</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {["video", "article", "course", "book", "doc"].map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">Topics (comma-separated)</label>
          <input className="input" value={topics} onChange={(e) => setTopics(e.target.value)} />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" disabled={busy || !url || !title} onClick={submit}>
          {busy ? "Saving…" : "Add resource"}
        </button>
      </div>
    </div>
  );
}

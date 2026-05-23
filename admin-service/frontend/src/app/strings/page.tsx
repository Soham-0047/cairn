"use client";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/session";
import { api } from "@/lib/api";

export default function StringsPage() {
  const s = useRequireAuth();
  const [key, setKey] = useState("default");
  const [rows, setRows] = useState<Array<{ k: string; v: string }>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (s.status !== "authed") return;
    load(key);
  }, [s.status, key]);

  async function load(k: string) {
    const r = await api<{ strings?: Record<string, string> | Map<string, string> }>(
      `/admin/config?key=${encodeURIComponent(k)}`,
    );
    const obj = normalize(r.strings);
    setRows(Object.entries(obj).map(([k2, v]) => ({ k: k2, v })));
  }

  function normalize(s: unknown): Record<string, string> {
    if (!s) return {};
    if (s instanceof Map) return Object.fromEntries(s);
    if (typeof s === "object") return s as Record<string, string>;
    return {};
  }

  function update(i: number, patch: Partial<{ k: string; v: string }>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }
  function add() {
    setRows((r) => [...r, { k: "", v: "" }]);
  }
  function remove(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function save() {
    setBusy(true);
    try {
      const payload: Record<string, string> = {};
      for (const r of rows) if (r.k.trim()) payload[r.k.trim()] = r.v;
      await api(`/admin/config?key=${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: JSON.stringify({ strings: payload }),
      });
    } finally {
      setBusy(false);
    }
  }

  if (s.status !== "authed") return null;

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 600 }}>Strings</h1>
      <p style={{ color: "#9ba3b3", fontSize: 13, marginTop: 4 }}>
        Free-form UI label key/value map. Useful for ad-hoc copy overrides or A/B tests.
      </p>
      <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
        <span className="label" style={{ margin: 0 }}>Key:</span>
        <input className="input" style={{ width: 240 }} value={key} onChange={(e) => setKey(e.target.value)} />
        <button className="btn btn-ghost" onClick={() => load(key)}>Load</button>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        {rows.length === 0 && (
          <p style={{ color: "#9ba3b3", fontSize: 13, marginBottom: 10 }}>No strings yet.</p>
        )}
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                style={{ width: 240 }}
                placeholder="key"
                value={row.k}
                onChange={(e) => update(i, { k: e.target.value })}
              />
              <input
                className="input"
                style={{ flex: 1 }}
                placeholder="value"
                value={row.v}
                onChange={(e) => update(i, { v: e.target.value })}
              />
              <button className="btn btn-ghost" onClick={() => remove(i)}>×</button>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={add}>+ Row</button>
          <button className="btn" disabled={busy} onClick={save}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/session";
import { api } from "@/lib/api";

type Cred = {
  id: string;
  service: string;
  kind: string;
  label: string;
  keyHint: string;
  priority: number;
  enabled: boolean;
  source: string;
  successCount: number;
  failureCount: number;
  lastUsedAt?: string;
  lastFailureAt?: string;
  lastFailureReason?: string;
  metadata: Record<string, unknown>;
};

type ServiceMeta = {
  service: string;
  kind: string;
  displayName: string;
  baseURL?: string;
  docsUrl?: string;
};

export default function CredentialsPage() {
  const s = useRequireAuth();
  const [list, setList] = useState<Cred[]>([]);
  const [catalog, setCatalog] = useState<ServiceMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [testing, setTesting] = useState<Record<string, string>>({});

  useEffect(() => {
    if (s.status !== "authed") return;
    refresh();
    api<{ services: ServiceMeta[] }>("/admin/credentials/catalog").then((r) => setCatalog(r.services));
  }, [s.status]);

  async function refresh() {
    setLoading(true);
    try {
      const r = await api<{ credentials: Cred[] }>("/admin/credentials");
      setList(r.credentials);
    } finally {
      setLoading(false);
    }
  }

  async function testCred(id: string) {
    setTesting((t) => ({ ...t, [id]: "running" }));
    try {
      const r = await api<{ ok: boolean; status: number; latencyMs?: number; detail?: string }>(
        `/admin/credentials/${id}/test`,
        { method: "POST" },
      );
      setTesting((t) => ({
        ...t,
        [id]: r.ok ? `ok (${r.latencyMs}ms)` : `fail ${r.status}: ${(r.detail || "").slice(0, 80)}`,
      }));
    } catch (err) {
      setTesting((t) => ({ ...t, [id]: `err: ${(err as Error).message}` }));
    }
  }

  async function toggleEnabled(c: Cred) {
    await api(`/admin/credentials/${c.id}`, {
      method: "PATCH",
      body: JSON.stringify({ enabled: !c.enabled }),
    });
    refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this credential?")) return;
    await api(`/admin/credentials/${id}`, { method: "DELETE" });
    refresh();
  }

  async function rotate(id: string) {
    const apiKey = prompt("New API key:");
    if (!apiKey) return;
    await api(`/admin/credentials/${id}/rotate`, {
      method: "POST",
      body: JSON.stringify({ apiKey }),
    });
    refresh();
  }

  if (s.status !== "authed") return null;

  return (
    <div>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>API credentials</h1>
          <p style={{ color: "#9ba3b3", fontSize: 13, marginTop: 4 }}>
            Encrypted at rest. Consumer projects pull plaintext from <code>/public/credentials</code> using the service token.
          </p>
        </div>
        <button className="btn" onClick={() => setAdding((v) => !v)}>
          {adding ? "Close" : "+ Add credential"}
        </button>
      </header>

      {adding && (
        <AddCredentialForm
          catalog={catalog}
          onDone={() => {
            setAdding(false);
            refresh();
          }}
        />
      )}

      {loading ? (
        <p style={{ color: "#9ba3b3" }}>Loading…</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {list.length === 0 && (
            <div className="card" style={{ color: "#9ba3b3", textAlign: "center" }}>
              No credentials yet. Click <strong>Add credential</strong> to seed one.
            </div>
          )}
          {list.map((c) => (
            <div key={c.id} className="card" style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong>{c.service}</strong>
                  <span className="pill">{c.kind}</span>
                  {c.source === "env" && <span className="pill">env-seeded</span>}
                  {!c.enabled && <span className="pill pill-err">disabled</span>}
                </div>
                <div style={{ fontSize: 13, color: "#c5cbd6", marginTop: 4 }}>
                  {c.label} <span style={{ color: "#8b94a7" }}>· …{c.keyHint}</span>
                </div>
                <div style={{ fontSize: 11, color: "#8b94a7", marginTop: 4 }}>
                  priority {c.priority} · ok {c.successCount} / fail {c.failureCount}
                  {testing[c.id] && (
                    <span style={{ marginLeft: 10, color: testing[c.id]?.startsWith("ok") ? "#6ee7b7" : "#fca5a5" }}>
                      → {testing[c.id]}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="btn btn-ghost" onClick={() => testCred(c.id)}>Test</button>
                <button className="btn btn-ghost" onClick={() => rotate(c.id)}>Rotate</button>
                <button className="btn btn-ghost" onClick={() => toggleEnabled(c)}>
                  {c.enabled ? "Disable" : "Enable"}
                </button>
                <button className="btn btn-danger" onClick={() => remove(c.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AddCredentialForm({
  catalog,
  onDone,
}: {
  catalog: ServiceMeta[];
  onDone: () => void;
}) {
  const [service, setService] = useState(catalog[0]?.service || "google");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [priority, setPriority] = useState(100);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const meta = catalog.find((c) => c.service === service);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await api("/admin/credentials", {
        method: "POST",
        body: JSON.stringify({
          service,
          kind: meta?.kind || "llm",
          label: label || `${service} key`,
          apiKey,
          priority,
          enabled: true,
          metadata: meta?.baseURL ? { baseURL: meta.baseURL } : {},
        }),
      });
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <label className="label">Service</label>
          <select className="input" value={service} onChange={(e) => setService(e.target.value)}>
            {catalog.map((c) => (
              <option key={c.service} value={c.service}>
                {c.displayName} ({c.service})
              </option>
            ))}
          </select>
          {meta?.docsUrl && (
            <a href={meta.docsUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#818CF8" }}>
              Get a key →
            </a>
          )}
        </div>
        <div>
          <label className="label">Label</label>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Personal Gmail" />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label className="label">API key</label>
          <input
            className="input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="paste the key here"
          />
        </div>
        <div>
          <label className="label">Priority (lower = used first)</label>
          <input
            className="input"
            type="number"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10) || 100)}
          />
        </div>
      </div>
      {error && <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>{error}</div>}
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <button className="btn" disabled={busy || apiKey.length < 4} onClick={submit}>
          {busy ? "Saving…" : "Save credential"}
        </button>
      </div>
    </div>
  );
}

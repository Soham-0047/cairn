"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Plus,
  Trash2,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Power,
  ExternalLink,
} from "lucide-react";
import { adminFetch } from "@/lib/admin";

type Credential = {
  id: string;
  service: string;
  kind: "llm" | "image" | "content" | "embedding" | "oauth" | "storage" | "other";
  label: string;
  keyHint: string;
  metadata: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  source: "env" | "admin" | "import";
  successCount: number;
  failureCount: number;
  lastUsedAt?: string;
  lastFailureAt?: string;
  lastFailureReason?: string;
  createdAt: string;
};

type CatalogEntry = {
  service: string;
  kind: Credential["kind"];
  displayName: string;
  baseURL?: string;
  docsUrl: string;
};

type ListResponse = {
  credentials: Credential[];
  store: Array<{ service: string; count: number; throttled: number }>;
};

const KIND_LABELS: Record<Credential["kind"], string> = {
  llm: "LLM",
  image: "Image",
  content: "Content",
  embedding: "Embedding",
  oauth: "OAuth",
  storage: "Storage",
  other: "Other",
};

export default function AdminCredentialsPage() {
  const [data, setData] = useState<ListResponse | null>(null);
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [testResult, setTestResult] = useState<
    Record<string, { ok: boolean; status: number; detail?: string; latencyMs: number }>
  >({});

  useEffect(() => {
    refresh();
    loadCatalog();
  }, []);

  async function refresh() {
    try {
      const d = await adminFetch<ListResponse>("/credentials");
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  async function loadCatalog() {
    try {
      const c = await adminFetch<{ services: CatalogEntry[] }>("/credentials/catalog");
      setCatalog(c.services);
    } catch {
      // catalog is a nicety, not required.
    }
  }

  async function toggle(id: string, enabled: boolean) {
    setBusy(true);
    try {
      await adminFetch(`/credentials/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Toggle failed");
    } finally {
      setBusy(false);
    }
  }

  async function setPriority(id: string, priority: number) {
    setBusy(true);
    try {
      await adminFetch(`/credentials/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ priority }),
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this credential? This cannot be undone.")) return;
    setBusy(true);
    try {
      await adminFetch(`/credentials/${id}`, { method: "DELETE" });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function rotate(id: string) {
    const newKey = prompt("Paste the new API key — it will be encrypted and stored.");
    if (!newKey) return;
    setBusy(true);
    try {
      await adminFetch(`/credentials/${id}/rotate`, {
        method: "POST",
        body: JSON.stringify({ apiKey: newKey }),
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rotate failed");
    } finally {
      setBusy(false);
    }
  }

  async function test(id: string) {
    setTestResult((p) => ({ ...p, [id]: { ok: false, status: 0, detail: "...", latencyMs: 0 } }));
    try {
      const r = await adminFetch<{
        ok: boolean;
        status: number;
        detail?: string;
        latencyMs: number;
      }>(`/credentials/${id}/test`, { method: "POST" });
      setTestResult((p) => ({ ...p, [id]: r }));
    } catch (e) {
      setTestResult((p) => ({
        ...p,
        [id]: { ok: false, status: 0, detail: e instanceof Error ? e.message : "Failed", latencyMs: 0 },
      }));
    }
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-zinc-400">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  const grouped = groupByService(data.credentials);
  const storeMap = new Map(data.store.map((s) => [s.service, s]));

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
        ← Admin
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">API credentials vault</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Add multiple accounts per service. Highest-priority enabled key wins; throttled keys rotate to the next.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> Add credential
        </button>
      </div>

      {err ? (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
      ) : null}

      {showAdd ? (
        <AddCredentialForm
          catalog={catalog}
          existingServices={Array.from(new Set(data.credentials.map((c) => c.service)))}
          onClose={() => setShowAdd(false)}
          onCreated={async () => {
            setShowAdd(false);
            await refresh();
          }}
        />
      ) : null}

      <div className="mt-6 space-y-4">
        {Object.entries(grouped).length === 0 ? (
          <div className="card text-center text-sm text-zinc-500">
            <KeyRound className="mx-auto mb-2 h-5 w-5" />
            No credentials yet. Click <strong>Add credential</strong> to register your first key.
          </div>
        ) : (
          Object.entries(grouped).map(([service, creds]) => {
            const stats = storeMap.get(service);
            const meta = catalog.find((c) => c.service === service);
            return (
              <section key={service} className="card">
                <header className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <div>
                    <h2 className="font-semibold text-zinc-900">
                      {meta?.displayName || service}
                      <span className="ml-2 font-mono text-xs font-normal text-zinc-500">{service}</span>
                    </h2>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {creds.length} {creds.length === 1 ? "credential" : "credentials"}
                      {stats ? ` · ${stats.throttled} throttled` : null}
                      {meta?.docsUrl ? (
                        <>
                          {" · "}
                          <a
                            href={meta.docsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 underline hover:text-zinc-700"
                          >
                            Get key <ExternalLink className="h-3 w-3" />
                          </a>
                        </>
                      ) : null}
                    </p>
                  </div>
                </header>
                <ul className="mt-2 divide-y divide-zinc-100">
                  {creds.map((c) => (
                    <li key={c.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => toggle(c.id, !c.enabled)}
                          disabled={busy}
                          title={c.enabled ? "Disable" : "Enable"}
                          className={`flex h-7 w-7 items-center justify-center rounded-md ${
                            c.enabled
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-zinc-900">{c.label}</p>
                          <p className="text-xs text-zinc-500">
                            <span className="font-mono">••••{c.keyHint}</span>
                            <span className="ml-2 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                              {KIND_LABELS[c.kind]}
                            </span>
                            {c.source === "env" ? (
                              <span className="ml-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-amber-700">
                                .env
                              </span>
                            ) : null}
                            <span className="ml-2">
                              {c.successCount} ok · {c.failureCount} fail
                            </span>
                          </p>
                          {c.lastFailureReason ? (
                            <p className="mt-1 line-clamp-1 text-[11px] text-red-600">
                              <AlertTriangle className="mr-1 inline h-3 w-3" />
                              {c.lastFailureReason}
                            </p>
                          ) : null}
                          {testResult[c.id] ? (
                            <p
                              className={`mt-1 text-[11px] ${
                                testResult[c.id]!.ok ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {testResult[c.id]!.ok ? (
                                <CheckCircle2 className="mr-1 inline h-3 w-3" />
                              ) : (
                                <AlertTriangle className="mr-1 inline h-3 w-3" />
                              )}
                              {testResult[c.id]!.ok
                                ? `OK · ${testResult[c.id]!.latencyMs}ms`
                                : `${testResult[c.id]!.status || "ERR"} · ${testResult[c.id]!.detail || ""}`}
                            </p>
                          ) : null}
                        </div>
                        <label className="text-xs text-zinc-500">
                          priority{" "}
                          <input
                            type="number"
                            min={1}
                            max={10000}
                            defaultValue={c.priority}
                            onBlur={(e) => {
                              const v = parseInt(e.target.value, 10);
                              if (v && v !== c.priority) setPriority(c.id, v);
                            }}
                            className="ml-1 w-16 rounded border border-zinc-200 bg-white px-1.5 py-0.5 text-xs"
                          />
                        </label>
                        <button onClick={() => test(c.id)} className="btn-ghost !py-1 text-xs">
                          Test
                        </button>
                        <button
                          onClick={() => rotate(c.id)}
                          className="btn-ghost !py-1 text-xs"
                          title="Rotate key"
                        >
                          <RotateCw className="h-3.5 w-3.5" /> Rotate
                        </button>
                        <button
                          onClick={() => remove(c.id)}
                          disabled={busy}
                          className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}

function groupByService(creds: Credential[]): Record<string, Credential[]> {
  const out: Record<string, Credential[]> = {};
  for (const c of creds) {
    if (!out[c.service]) out[c.service] = [];
    out[c.service]!.push(c);
  }
  return out;
}

function AddCredentialForm({
  catalog,
  existingServices,
  onClose,
  onCreated,
}: {
  catalog: CatalogEntry[];
  existingServices: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [service, setService] = useState<string>(catalog[0]?.service || "");
  const [customService, setCustomService] = useState("");
  const [kind, setKind] = useState<Credential["kind"]>("llm");
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [priority, setPriority] = useState(100);
  const [metaJson, setMetaJson] = useState("{}");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isCustom = service === "__custom__";
  const resolvedService = isCustom ? customService.trim().toLowerCase() : service;

  const allOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: CatalogEntry[] = [];
    for (const e of catalog) {
      if (seen.has(e.service)) continue;
      seen.add(e.service);
      opts.push(e);
    }
    for (const s of existingServices) {
      if (!seen.has(s)) {
        opts.push({ service: s, kind: "other", displayName: s, docsUrl: "" });
        seen.add(s);
      }
    }
    return opts;
  }, [catalog, existingServices]);

  async function submit() {
    setErr(null);
    if (!resolvedService) {
      setErr("Service is required");
      return;
    }
    let metadata: Record<string, unknown> = {};
    if (metaJson.trim()) {
      try {
        const parsed = JSON.parse(metaJson);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          metadata = parsed;
        } else {
          throw new Error("metadata must be an object");
        }
      } catch (e) {
        setErr(`Invalid metadata JSON: ${(e as Error).message}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await adminFetch("/credentials", {
        method: "POST",
        body: JSON.stringify({
          service: resolvedService,
          kind,
          label,
          apiKey,
          priority,
          metadata,
        }),
      });
      onCreated();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Create failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card mt-4">
      <h3 className="font-semibold text-zinc-900">Add a credential</h3>
      <p className="mt-0.5 text-xs text-zinc-500">
        Multi-account: re-use the same service with a different label to register a second key.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Service</span>
          <select
            value={service}
            onChange={(e) => {
              const v = e.target.value;
              setService(v);
              const entry = catalog.find((c) => c.service === v);
              if (entry) setKind(entry.kind);
            }}
            className="input mt-1"
          >
            {allOptions.map((c) => (
              <option key={c.service} value={c.service}>
                {c.displayName}
              </option>
            ))}
            <option value="__custom__">+ Custom service…</option>
          </select>
          {isCustom ? (
            <input
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
              placeholder="e.g. anthropic, imgur, my-internal-api"
              className="input mt-2"
            />
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Kind</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Credential["kind"])}
            className="input mt-1"
          >
            <option value="llm">LLM</option>
            <option value="image">Image</option>
            <option value="content">Content</option>
            <option value="embedding">Embedding</option>
            <option value="oauth">OAuth</option>
            <option value="storage">Storage</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-zinc-600">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Personal Gmail, Work account, Team shared"
            className="input mt-1"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="text-xs font-medium text-zinc-600">API key / secret</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Pasted secret. Encrypted at rest with AES-256-GCM."
            className="input mt-1 font-mono"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Priority (lower = preferred)</span>
          <input
            type="number"
            min={1}
            max={10000}
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value, 10) || 100)}
            className="input mt-1"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Metadata (JSON)</span>
          <input
            value={metaJson}
            onChange={(e) => setMetaJson(e.target.value)}
            placeholder='{"baseURL": "...", "accountId": "..."}'
            className="input mt-1 font-mono text-xs"
          />
        </label>
      </div>

      {err ? <p className="mt-3 text-sm text-red-700">{err}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={submitting || !apiKey || !label || !resolvedService}
          className="btn-primary"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Save
        </button>
      </div>
    </div>
  );
}

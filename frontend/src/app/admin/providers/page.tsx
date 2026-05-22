"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save, ChevronUp, ChevronDown, X, Play, RotateCcw } from "lucide-react";
import { adminFetch } from "@/lib/admin";

type ChainEntry = { provider: string; model: string };

type TestTrace = {
  task: string;
  attempts: Array<{
    provider: string;
    model: string;
    status: "skipped" | "throttled" | "error" | "success";
    error?: string;
    latencyMs?: number;
  }>;
  finalProvider?: string;
  finalModel?: string;
};

type ProviderStatus = {
  name: string;
  enabled: boolean;
  throttled: boolean;
  models: { modelId: string; displayName: string }[];
};

type ProvidersResponse = {
  providers: ProviderStatus[];
  chains: Record<string, ChainEntry[]>;
  throttle: { provider: string; remainingMs: number; reason: string }[];
};

export default function AdminProvidersPage() {
  const [data, setData] = useState<ProvidersResponse | null>(null);
  const [savingTask, setSavingTask] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [testTask, setTestTask] = useState("parse_goal");
  const [testPrompt, setTestPrompt] = useState("Say hello in 5 words.");
  const [testOutput, setTestOutput] = useState<{
    output: string;
    provider: string;
    model: string;
    latencyMs: number;
    trace?: TestTrace;
  } | null>(null);
  const [testError, setTestError] = useState<{ message: string; trace?: TestTrace | null } | null>(null);
  const [testing, setTesting] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    try {
      const d = await adminFetch<ProvidersResponse>("/providers");
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Load failed");
    }
  }

  async function saveChain(task: string, chain: ChainEntry[]) {
    setSavingTask(task);
    try {
      await adminFetch("/providers/chain", {
        method: "POST",
        body: JSON.stringify({ task, chain }),
      });
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingTask(null);
    }
  }

  async function runTest() {
    setTesting(true);
    setTestOutput(null);
    setTestError(null);
    try {
      const res = await adminFetch<{
        output: string;
        provider: string;
        model: string;
        latencyMs: number;
        trace?: TestTrace;
      }>("/providers/test", {
        method: "POST",
        body: JSON.stringify({ task: testTask, prompt: testPrompt }),
      });
      setTestOutput(res);
      await refresh();
    } catch (e) {
      const body = (e as { body?: { error?: string; trace?: TestTrace | null } }).body;
      setTestError({
        message: body?.error || (e instanceof Error ? e.message : "Test failed"),
        trace: body?.trace ?? null,
      });
      await refresh();
    } finally {
      setTesting(false);
    }
  }

  async function resetThrottles() {
    setResetting(true);
    try {
      await adminFetch("/providers/reset-throttles", {
        method: "POST",
        body: JSON.stringify({}),
      });
      setTestError(null);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setResetting(false);
    }
  }

  if (!data) {
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
      <h1 className="mt-2 text-2xl font-bold text-zinc-900">AI providers & routing</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Each task walks its chain top-to-bottom. First enabled, non-throttled provider wins.
      </p>
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Provider status</h2>
          <button
            onClick={resetThrottles}
            disabled={resetting}
            className="btn-ghost !py-1.5 text-xs"
            title="Clear in-memory throttles so providers can be retried immediately"
          >
            {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
            Reset throttles
          </button>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {data.providers.map((p) => (
            <div key={p.name} className="card !p-3">
              <div className="flex items-center justify-between">
                <p className="font-mono text-sm font-medium">{p.name}</p>
                <span
                  className={`badge ${
                    !p.enabled ? "bg-zinc-200 text-zinc-600" : p.throttled ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {!p.enabled ? "no key" : p.throttled ? "throttled" : "ready"}
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{p.models.length} models</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Routing chains</h2>
        <div className="mt-3 space-y-4">
          {Object.entries(data.chains).map(([task, chain]) => (
            <ChainEditor
              key={task}
              task={task}
              chain={chain}
              providers={data.providers}
              saving={savingTask === task}
              onSave={(c) => saveChain(task, c)}
            />
          ))}
        </div>
      </section>

      <section className="mt-10 card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Test routing</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Send a real prompt through the active chain. Useful to verify keys and see fallback behavior.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-[180px_1fr_auto]">
          <select value={testTask} onChange={(e) => setTestTask(e.target.value)} className="input">
            {Object.keys(data.chains).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input value={testPrompt} onChange={(e) => setTestPrompt(e.target.value)} className="input" />
          <button onClick={runTest} disabled={testing} className="btn-primary">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Run
          </button>
        </div>
        {testOutput ? (
          <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm">
            <p className="font-mono text-xs text-zinc-500">
              {testOutput.provider}/{testOutput.model} · {testOutput.latencyMs}ms
            </p>
            <pre className="mt-2 whitespace-pre-wrap text-zinc-800">{testOutput.output}</pre>
            {testOutput.trace ? <TraceView trace={testOutput.trace} /> : null}
          </div>
        ) : null}
        {testError ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm">
            <p className="font-medium text-red-800">{testError.message}</p>
            {testError.trace ? <TraceView trace={testError.trace} /> : (
              <p className="mt-2 text-xs text-red-700">
                Hint: click <span className="font-medium">Reset throttles</span> above and retry — a previous 401/429 may have locked out every key for an hour.
              </p>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ChainEditor({
  task,
  chain,
  providers,
  saving,
  onSave,
}: {
  task: string;
  chain: ChainEntry[];
  providers: ProviderStatus[];
  saving: boolean;
  onSave: (chain: ChainEntry[]) => void;
}) {
  const [local, setLocal] = useState<ChainEntry[]>(chain);
  const [addProv, setAddProv] = useState("");
  const [addModel, setAddModel] = useState("");

  useEffect(() => {
    setLocal(chain);
  }, [chain]);

  const dirty = JSON.stringify(local) !== JSON.stringify(chain);

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= local.length) return;
    const arr = [...local];
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    setLocal(arr);
  }
  function remove(i: number) {
    setLocal(local.filter((_, j) => j !== i));
  }
  function add() {
    if (!addProv || !addModel) return;
    setLocal([...local, { provider: addProv, model: addModel }]);
    setAddProv("");
    setAddModel("");
  }

  const addProvModels = providers.find((p) => p.name === addProv)?.models || [];

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-zinc-900">{task}</h3>
        <button
          onClick={() => onSave(local)}
          disabled={!dirty || saving || local.length === 0}
          className="btn-primary !px-3 !py-1.5 text-xs"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>
      <ol className="mt-3 space-y-2">
        {local.map((e, i) => (
          <li
            key={`${e.provider}-${e.model}-${i}`}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-sm"
          >
            <span className="w-6 text-center text-xs text-zinc-400">{i + 1}</span>
            <span className="font-mono text-xs">{e.provider}/{e.model}</span>
            <div className="ml-auto flex items-center gap-0.5">
              <button onClick={() => move(i, -1)} className="rounded p-1 hover:bg-zinc-200" disabled={i === 0}>
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => move(i, 1)} className="rounded p-1 hover:bg-zinc-200" disabled={i === local.length - 1}>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => remove(i)} className="rounded p-1 hover:bg-red-100 hover:text-red-700">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <select value={addProv} onChange={(e) => setAddProv(e.target.value)} className="input !w-auto !py-1.5 text-xs">
          <option value="">+ Provider</option>
          {providers.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name}
            </option>
          ))}
        </select>
        <select
          value={addModel}
          onChange={(e) => setAddModel(e.target.value)}
          disabled={!addProv}
          className="input !w-auto !py-1.5 text-xs"
        >
          <option value="">Model</option>
          {addProvModels.map((m) => (
            <option key={m.modelId} value={m.modelId}>
              {m.displayName}
            </option>
          ))}
        </select>
        <button onClick={add} disabled={!addProv || !addModel} className="btn-ghost !py-1.5 text-xs">
          Add
        </button>
      </div>
    </div>
  );
}

function TraceView({ trace }: { trace: TestTrace }) {
  return (
    <div className="mt-3 border-t border-zinc-200 pt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Attempts</p>
      <ol className="mt-1 space-y-1">
        {trace.attempts.map((a, i) => {
          const badge =
            a.status === "success"
              ? "bg-emerald-100 text-emerald-800"
              : a.status === "error"
              ? "bg-red-100 text-red-800"
              : a.status === "throttled"
              ? "bg-amber-100 text-amber-800"
              : "bg-zinc-200 text-zinc-700";
          return (
            <li key={i} className="flex flex-wrap items-baseline gap-2 text-xs">
              <span className="w-4 text-zinc-400">{i + 1}.</span>
              <span className="font-mono">{a.provider}/{a.model}</span>
              <span className={`badge ${badge}`}>{a.status}</span>
              {a.latencyMs != null ? <span className="text-zinc-500">{a.latencyMs}ms</span> : null}
              {a.error ? <span className="font-mono text-zinc-600 break-all">{a.error}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

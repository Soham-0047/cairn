"use client";
import { useEffect, useState } from "react";
import { useRequireAuth } from "@/lib/session";
import { api } from "@/lib/api";

type Cfg = {
  key: string;
  brand: Record<string, string>;
  copy: Record<string, string>;
  seo: Record<string, string>;
  guestMode: Record<string, string | number | boolean>;
};

export default function SitePage() {
  const s = useRequireAuth();
  const [key, setKey] = useState("default");
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (s.status !== "authed") return;
    load(key);
  }, [s.status, key]);

  async function load(k: string) {
    const r = await api<Cfg>(`/admin/config?key=${encodeURIComponent(k)}`);
    setCfg(r);
  }

  async function save() {
    if (!cfg) return;
    setBusy(true);
    try {
      await api(`/admin/config?key=${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: JSON.stringify({
          brand: cfg.brand,
          copy: cfg.copy,
          seo: cfg.seo,
          guestMode: cfg.guestMode,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setBusy(false);
    }
  }

  if (s.status !== "authed" || !cfg) return <p style={{ color: "#9ba3b3" }}>Loading…</p>;

  return (
    <div>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 28, fontWeight: 600 }}>Site config</h1>
        <p style={{ color: "#9ba3b3", fontSize: 13, marginTop: 4 }}>
          Per-product config — switch with the key field. Consumers pass <code>?key=&lt;product-id&gt;</code> when fetching.
        </p>
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <span className="label" style={{ margin: 0 }}>Key:</span>
          <input className="input" style={{ width: 240 }} value={key} onChange={(e) => setKey(e.target.value)} />
          <button className="btn btn-ghost" onClick={() => load(key)}>Load</button>
        </div>
      </header>

      <Section title="Brand">
        {(["name", "tagline", "logoUrl", "faviconUrl", "primaryColor", "accentColor"] as const).map((f) => (
          <Field
            key={f}
            label={f}
            value={cfg.brand?.[f] ?? ""}
            onChange={(v) => setCfg({ ...cfg, brand: { ...cfg.brand, [f]: v } })}
          />
        ))}
      </Section>

      <Section title="Copy">
        {(["heroTitle", "heroSubtitle", "heroCtaPrimary", "heroCtaSecondary", "footerNote", "poweredByLabel"] as const).map((f) => (
          <Field
            key={f}
            label={f}
            value={cfg.copy?.[f] ?? ""}
            multiline={f.startsWith("hero") && f !== "heroCtaPrimary" && f !== "heroCtaSecondary"}
            onChange={(v) => setCfg({ ...cfg, copy: { ...cfg.copy, [f]: v } })}
          />
        ))}
      </Section>

      <Section title="SEO">
        {(["title", "description", "ogImageUrl"] as const).map((f) => (
          <Field
            key={f}
            label={f}
            value={cfg.seo?.[f] ?? ""}
            multiline={f === "description"}
            onChange={(v) => setCfg({ ...cfg, seo: { ...cfg.seo, [f]: v } })}
          />
        ))}
      </Section>

      <Section title="Guest mode">
        {Object.entries(cfg.guestMode || {}).map(([k, v]) => (
          <Field
            key={k}
            label={k}
            value={String(v)}
            onChange={(val) =>
              setCfg({
                ...cfg,
                guestMode: {
                  ...cfg.guestMode,
                  [k]:
                    typeof v === "boolean"
                      ? val === "true"
                      : typeof v === "number"
                        ? Number(val)
                        : val,
                },
              })
            }
          />
        ))}
      </Section>

      <div style={{ marginTop: 20, display: "flex", gap: 10, alignItems: "center" }}>
        <button className="btn" disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="pill pill-ok">saved</span>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>{title}</h2>
      <div style={{ display: "grid", gap: 10 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      {multiline ? (
        <textarea className="input" rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  );
}

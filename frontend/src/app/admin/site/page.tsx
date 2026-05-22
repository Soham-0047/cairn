"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { adminFetch } from "@/lib/admin";

type ConfigBlob = {
  brand: {
    name: string;
    tagline: string;
    logoUrl: string;
    faviconUrl: string;
    primaryColor: string;
    accentColor: string;
  };
  copy: {
    heroTitle: string;
    heroSubtitle: string;
    heroCtaPrimary: string;
    heroCtaSecondary: string;
    footerNote: string;
    poweredByLabel: string;
  };
  seo: { title: string; description: string; ogImageUrl: string };
  features: Record<string, boolean>;
};

export default function AdminSitePage() {
  const [config, setConfig] = useState<ConfigBlob | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    adminFetch<ConfigBlob>("/config").then(setConfig).catch((e) => setErr(e.message));
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    setErr(null);
    try {
      await adminFetch("/config", {
        method: "PATCH",
        body: JSON.stringify({
          brand: config.brand,
          copy: config.copy,
          seo: config.seo,
          features: config.features,
        }),
      });
      setSavedAt(new Date());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  if (!config) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-zinc-400">
        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin" className="text-sm text-zinc-500 hover:text-zinc-700">
            ← Admin
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-zinc-900">Site identity & copy</h1>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>
      {savedAt ? (
        <p className="mt-2 text-xs text-emerald-700">Saved at {savedAt.toLocaleTimeString()}</p>
      ) : null}
      {err ? <p className="mt-2 text-sm text-red-700">{err}</p> : null}

      <Section title="Brand">
        <Field
          label="Name"
          value={config.brand.name}
          onChange={(v) => setConfig({ ...config, brand: { ...config.brand, name: v } })}
        />
        <Field
          label="Tagline"
          value={config.brand.tagline}
          onChange={(v) => setConfig({ ...config, brand: { ...config.brand, tagline: v } })}
        />
        <Field
          label="Logo URL"
          value={config.brand.logoUrl}
          onChange={(v) => setConfig({ ...config, brand: { ...config.brand, logoUrl: v } })}
        />
        <Field
          label="Favicon URL"
          value={config.brand.faviconUrl}
          onChange={(v) => setConfig({ ...config, brand: { ...config.brand, faviconUrl: v } })}
        />
        <div className="grid grid-cols-2 gap-4">
          <ColorField
            label="Primary color"
            value={config.brand.primaryColor}
            onChange={(v) => setConfig({ ...config, brand: { ...config.brand, primaryColor: v } })}
          />
          <ColorField
            label="Accent color"
            value={config.brand.accentColor}
            onChange={(v) => setConfig({ ...config, brand: { ...config.brand, accentColor: v } })}
          />
        </div>
      </Section>

      <Section title="Copy">
        <Field
          label="Hero title"
          value={config.copy.heroTitle}
          onChange={(v) => setConfig({ ...config, copy: { ...config.copy, heroTitle: v } })}
        />
        <Field
          label="Hero subtitle"
          multiline
          value={config.copy.heroSubtitle}
          onChange={(v) => setConfig({ ...config, copy: { ...config.copy, heroSubtitle: v } })}
        />
        <Field
          label="CTA — primary"
          value={config.copy.heroCtaPrimary}
          onChange={(v) => setConfig({ ...config, copy: { ...config.copy, heroCtaPrimary: v } })}
        />
        <Field
          label="CTA — secondary"
          value={config.copy.heroCtaSecondary}
          onChange={(v) => setConfig({ ...config, copy: { ...config.copy, heroCtaSecondary: v } })}
        />
        <Field
          label="Footer note"
          value={config.copy.footerNote}
          onChange={(v) => setConfig({ ...config, copy: { ...config.copy, footerNote: v } })}
        />
        <Field
          label="Powered-by label"
          value={config.copy.poweredByLabel}
          onChange={(v) => setConfig({ ...config, copy: { ...config.copy, poweredByLabel: v } })}
        />
      </Section>

      <Section title="SEO / OG">
        <Field
          label="Page title"
          value={config.seo.title}
          onChange={(v) => setConfig({ ...config, seo: { ...config.seo, title: v } })}
        />
        <Field
          label="Meta description"
          multiline
          value={config.seo.description}
          onChange={(v) => setConfig({ ...config, seo: { ...config.seo, description: v } })}
        />
        <Field
          label="OG image URL"
          value={config.seo.ogImageUrl}
          onChange={(v) => setConfig({ ...config, seo: { ...config.seo, ogImageUrl: v } })}
        />
      </Section>

      <Section title="Feature flags">
        {Object.entries(config.features).map(([k, v]) => (
          <label key={k} className="flex items-center gap-3 py-1.5 text-sm">
            <input
              type="checkbox"
              checked={v}
              onChange={(e) =>
                setConfig({ ...config, features: { ...config.features, [k]: e.target.checked } })
              }
            />
            <span className="font-medium text-zinc-700">{k}</span>
          </label>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{title}</h2>
      <div className="mt-3 space-y-3 card">{children}</div>
    </section>
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
      <label className="text-xs font-medium text-zinc-700">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} className="input mt-1" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="input mt-1" />
      )}
    </div>
  );
}
function ColorField({
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
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded border border-zinc-300"
        />
        <input value={value} onChange={(e) => onChange(e.target.value)} className="input flex-1 font-mono text-sm" />
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, LogIn, Palette, Cpu, FileText, ListTree, UserPlus, KeyRound } from "lucide-react";
import { adminFetch, getAdminToken, setAdminToken } from "@/lib/admin";

export default function AdminHomePage() {
  const [tokenInput, setTokenInput] = useState("");
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ counts: Record<string, number> } | null>(null);

  useEffect(() => {
    const t = getAdminToken();
    if (t) verify();
  }, []);

  async function verify() {
    setError(null);
    try {
      await adminFetch("/check", { method: "POST" });
      setAuthed(true);
      const s = await adminFetch<{ counts: Record<string, number> }>("/stats");
      setStats(s);
    } catch {
      setError("Token rejected.");
      setAuthed(false);
    }
  }

  async function signIn() {
    setAdminToken(tokenInput);
    await verify();
  }

  if (!authed) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <h1 className="text-2xl font-bold text-zinc-900">Admin sign-in</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Enter the <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">ADMIN_SECRET</code> from your backend
          .env.
        </p>
        <input
          type="password"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          className="input mt-4"
          placeholder="••••••••••••"
          onKeyDown={(e) => e.key === "Enter" && signIn()}
        />
        {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
        <button onClick={signIn} className="btn-primary mt-4 w-full">
          <LogIn className="h-4 w-4" /> Enter admin
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Admin</h1>
      <p className="mt-1 text-zinc-600">Everything you can change without redeploying.</p>

      {stats ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-6">
          {Object.entries(stats.counts).map(([k, v]) => (
            <div key={k} className="card !p-3">
              <p className="text-xs uppercase tracking-wide text-zinc-500">{k}</p>
              <p className="mt-1 text-xl font-semibold text-zinc-900">{v}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-6 flex items-center justify-center py-12 text-zinc-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <AdminCard
          href="/admin/site"
          icon={<Palette className="h-5 w-5" />}
          title="Site identity & copy"
          body="Change brand name, logo, colors, hero text, footer, SEO. The site picks it up immediately."
        />
        <AdminCard
          href="/admin/providers"
          icon={<Cpu className="h-5 w-5" />}
          title="AI providers & routing"
          body="Reorder Gemma 4 chains per task. Switch to Llama, Qwen, Mistral without touching code."
        />
        <AdminCard
          href="/admin/credentials"
          icon={<KeyRound className="h-5 w-5" />}
          title="API credentials vault"
          body="Multi-account keys for any service (Gemini, OpenAI, image APIs, OAuth). Encrypted at rest, rotates on rate limit."
        />
        <AdminCard
          href="/admin/guests"
          icon={<UserPlus className="h-5 w-5" />}
          title="Guest mode & limits"
          body="Toggle the no-signup flow. Set per-guest + global daily caps. Purge guests after a demo."
        />
        <AdminCard
          href="/admin/resources"
          icon={<ListTree className="h-5 w-5" />}
          title="Learning resource corpus"
          body="Add, edit, or disable resources Gemma 4 can recommend in paths."
        />
        <AdminCard
          href="/admin/strings"
          icon={<FileText className="h-5 w-5" />}
          title="Strings / labels"
          body="Edit arbitrary UI labels by key — useful for translations or A/B tests."
        />
      </div>

      <div className="mt-10 text-sm text-zinc-500">
        <Link href="/" className="underline hover:text-zinc-700">
          ← back to site
        </Link>
      </div>
    </div>
  );
}

function AdminCard({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link href={href} className="card transition hover:shadow-md">
      <div className="flex items-center gap-3">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
          style={{ backgroundColor: "var(--brand-primary)" }}
        >
          {icon}
        </div>
        <h2 className="font-semibold text-zinc-900">{title}</h2>
      </div>
      <p className="mt-2 text-sm text-zinc-600">{body}</p>
    </Link>
  );
}

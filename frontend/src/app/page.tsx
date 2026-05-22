import Link from "next/link";
import { getSiteConfig } from "@/lib/config";
import { Sparkles, Target, ShieldCheck, Layers } from "lucide-react";
import { TryAsGuestButton } from "@/components/TryAsGuestButton";

export default async function HomePage() {
  const cfg = await getSiteConfig();
  return (
    <>
      <section className="hero-bg">
        <div className="mx-auto max-w-5xl px-4 pt-16 pb-20 text-center sm:pt-24 sm:pb-28 sm:px-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" style={{ color: cfg.brand.primaryColor }} />
            {cfg.copy.poweredByLabel}
          </div>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
            {cfg.copy.heroTitle}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600">
            {cfg.copy.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/onboarding" className="btn-primary px-6 py-3 text-base">
              {cfg.copy.heroCtaPrimary}
            </Link>
            {cfg.guestMode?.enabled ? (
              <TryAsGuestButton />
            ) : (
              <Link href="/example" className="btn-secondary px-6 py-3 text-base">
                {cfg.copy.heroCtaSecondary}
              </Link>
            )}
          </div>
          {cfg.guestMode?.enabled ? (
            <p className="mt-3 text-xs text-zinc-500">
              No signup. Generate {cfg.guestMode.maxPathsPerGuest} path · evaluate {cfg.guestMode.maxEvalsPerGuest} project{cfg.guestMode.maxEvalsPerGuest === 1 ? "" : "s"} · expires in {cfg.guestMode.sessionHours}h.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          Three loops, one outcome.
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-zinc-600">
          Path → Accountability → Verification. Each loop uses a different Gemma 4 variant for the job it fits best.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Target className="h-5 w-5" />}
            title="Personalized path"
            body="Tell us your starting point and target role. Gemma 4 27B reads your goal and builds a 12-week plan with concrete deliverables — not just videos to watch."
            tag="Gemma 4 27B"
          />
          <FeatureCard
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Verified projects"
            body="Submit your GitHub repo. We pull the code, READ it, and ask Gemma 4 — is this original, does it match the claimed skills, does it actually work?"
            tag="Gemma 4 27B"
          />
          <FeatureCard
            icon={<Layers className="h-5 w-5" />}
            title="Multimodal review"
            body="Upload screenshots of your app. Gemma 4 12B looks at the UI — does it match the code claims? Is it shipped or just a prototype?"
            tag="Gemma 4 12B · vision"
          />
        </div>
      </section>

      <section className="bg-zinc-50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Why three Gemma 4 variants?
          </h2>
          <p className="mt-3 text-zinc-600">
            The right model for the job. Small Gemma for fast goal parsing, dense 27B for deep reasoning on path generation + code review, and the vision-capable 12B for visual project critique. Every call is routed automatically, with fallbacks to Gemini, DeepSeek, or Llama if a provider rate-limits.
          </p>
        </div>
      </section>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  tag,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  tag: string;
}) {
  return (
    <div className="card flex flex-col gap-3">
      <div
        className="flex h-9 w-9 items-center justify-center rounded-lg text-white"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-zinc-900">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-600">{body}</p>
      <span className="badge-neutral mt-auto w-fit">{tag}</span>
    </div>
  );
}

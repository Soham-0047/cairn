"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { Loader2, Wand2 } from "lucide-react";
import { getGuestToken } from "@/lib/guest";
import { proxyFetch } from "@/lib/clientFetch";
import { TryAsGuestButton } from "@/components/TryAsGuestButton";

const EXAMPLE =
  "I want to become an AI engineer at a US-based startup in 6 months. I know Python basics and have built one Flask app. I can spend 12 hours per week.";

export default function OnboardingPage() {
  const router = useRouter();
  const { status } = useSession();
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGuest, setHasGuest] = useState(false);

  useEffect(() => {
    setHasGuest(!!getGuestToken());
  }, []);

  if (status === "unauthenticated" && !hasGuest) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-zinc-900">Choose how to start</h1>
        <p className="mt-2 text-zinc-600">
          Sign in with GitHub to save your progress and earn credentials, or try as a guest first.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button onClick={() => signIn("github", { callbackUrl: "/onboarding" })} className="btn-primary w-full">
            Sign in with GitHub
          </button>
          <TryAsGuestButton className="btn-secondary w-full" redirectTo="/onboarding" />
        </div>
      </div>
    );
  }

  async function submit() {
    if (goal.trim().length < 10) {
      setError("Tell us a bit more — at least a sentence or two.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await proxyFetch("/paths", {
        method: "POST",
        body: JSON.stringify({ goal }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || "Path generation failed");
      }
      router.push("/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-900">What do you want to become?</h1>
      <p className="mt-2 text-zinc-600">
        Describe your goal in your own words. Be specific about your current skills, target role, and timeline. Gemma 4 builds the rest.
      </p>

      <div className="mt-8">
        <label className="text-sm font-medium text-zinc-700">Your goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          rows={6}
          placeholder={EXAMPLE}
          className="input mt-2 leading-relaxed"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
          <button onClick={() => setGoal(EXAMPLE)} className="underline hover:text-zinc-700">
            Use the example
          </button>
          <span>{goal.length} chars</span>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      ) : null}

      <button onClick={submit} disabled={loading} className="btn-primary mt-6 w-full sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Generating your path…
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4" /> Generate my 12-week path
          </>
        )}
      </button>

      <p className="mt-3 text-xs text-zinc-500">
        Routed through Gemma 4 27B by default. Falls back to Gemini 2.5 Pro or DeepSeek V3 if rate-limited.
      </p>
    </div>
  );
}

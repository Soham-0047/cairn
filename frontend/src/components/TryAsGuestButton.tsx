"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { startGuestSession } from "@/lib/guest";

export function TryAsGuestButton({
  className = "btn-secondary px-6 py-3 text-base",
  redirectTo = "/onboarding",
  label = "Try as guest — no signup",
}: {
  className?: string;
  redirectTo?: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setErr(null);
    try {
      await startGuestSession();
      // Navigating to the route we are already on does not remount anything,
      // so the spinner has to be cleared here. The guest store is reactive, so
      // whatever was gated on the session re-renders on its own either way.
      setLoading(false);
      router.push(redirectTo);
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start guest session");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={start} disabled={loading} className={className}>
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Starting…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" /> {label}
          </>
        )}
      </button>
      {err ? (
        <p className="text-xs" style={{ color: "var(--warm)", maxWidth: 280, textAlign: "center" }}>
          {err}
        </p>
      ) : null}
    </div>
  );
}

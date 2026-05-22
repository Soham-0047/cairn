"use client";
import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { Sparkles, X } from "lucide-react";
import { clearGuest, getGuestMeta, type GuestMeta } from "@/lib/guest";

export function GuestBanner({ bannerText }: { bannerText?: string }) {
  const { data: session } = useSession();
  const [meta, setMeta] = useState<GuestMeta | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMeta(getGuestMeta());
  }, []);

  // If a real session shows up, drop the guest token.
  useEffect(() => {
    if (session?.backendToken && meta) {
      clearGuest();
      setMeta(null);
    }
  }, [session, meta]);

  if (!meta || dismissed || session?.backendToken) return null;

  return (
    <div
      className="sticky top-14 z-30 border-b border-amber-200 bg-amber-50"
      style={{ animation: "fade-in 0.3s ease-out" }}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 text-sm text-amber-900 sm:px-6">
        <Sparkles className="h-4 w-4 flex-shrink-0" />
        <p className="flex-1">
          <strong>Guest mode</strong> ·{" "}
          {bannerText || "Try the full flow without signing in. Sign in with GitHub to save your progress and earn verified credentials."}{" "}
          <span className="text-amber-700">
            ({meta.limits.maxPathsPerGuest} path · {meta.limits.maxEvalsPerGuest} project evals)
          </span>
        </p>
        <button
          onClick={() => signIn("github")}
          className="rounded-md bg-amber-900 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-800"
        >
          Sign in
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 hover:bg-amber-100"
          aria-label="Dismiss"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Mountain } from "lucide-react";
import type { SiteConfig } from "@/lib/config";
import { clearGuest, getGuestMeta, type GuestMeta } from "@/lib/guest";

export function Header({ config }: { config: SiteConfig }) {
  const { data: session, status } = useSession();
  const handle = session?.user?.handle;
  const [guest, setGuest] = useState<GuestMeta | null>(null);
  useEffect(() => {
    setGuest(getGuestMeta());
  }, [status]);
  const isGuest = !session?.backendToken && !!guest;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-900">
          <Mountain
            className="h-5 w-5"
            style={{ color: config.brand.primaryColor }}
            strokeWidth={2.5}
          />
          <span className="text-base">{config.brand.name}</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {status === "authenticated" ? (
            <>
              <Link href="/dashboard" className="btn-ghost">
                Dashboard
              </Link>
              <Link href="/projects/new" className="btn-ghost">
                Submit project
              </Link>
              {handle ? (
                <Link href={`/u/${handle}`} className="btn-ghost">
                  Portfolio
                </Link>
              ) : null}
              <button onClick={() => signOut()} className="btn-ghost text-zinc-500">
                Sign out
              </button>
            </>
          ) : isGuest && guest ? (
            <>
              <Link href="/dashboard" className="btn-ghost">
                Dashboard
              </Link>
              <Link href="/projects/new" className="btn-ghost">
                Submit project
              </Link>
              <Link href={`/u/${guest.handle}`} className="btn-ghost">
                Portfolio
              </Link>
              <button
                onClick={() => {
                  clearGuest();
                  window.location.href = "/";
                }}
                className="btn-ghost text-zinc-500"
              >
                Exit guest
              </button>
              <button onClick={() => signIn("github")} className="btn-primary">
                Sign in
              </button>
            </>
          ) : (
            <>
              <Link href="/example" className="btn-ghost">
                Example
              </Link>
              <button onClick={() => signIn("github")} className="btn-primary">
                Sign in with GitHub
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

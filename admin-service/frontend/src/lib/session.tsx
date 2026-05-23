"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./api";

type Admin = { sub: string; email: string; name?: string; picture?: string };
type State =
  | { status: "loading" }
  | { status: "anon" }
  | { status: "authed"; admin: Admin };

const Ctx = createContext<State>({ status: "loading" });

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    api<{ authenticated: boolean; admin?: Admin }>("/auth/me")
      .then((r) => {
        if (r.authenticated && r.admin) setState({ status: "authed", admin: r.admin });
        else setState({ status: "anon" });
      })
      .catch(() => setState({ status: "anon" }));
  }, []);

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>;
}

export function useSession() {
  return useContext(Ctx);
}

export function useRequireAuth() {
  const session = useSession();
  const router = useRouter();
  useEffect(() => {
    if (session.status === "anon") router.replace("/login");
  }, [session.status, router]);
  return session;
}

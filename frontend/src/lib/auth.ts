import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { backendUrl } from "./api";

declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      email?: string | null;
      name?: string | null;
      image?: string | null;
      handle?: string;
      onboarded?: boolean;
      githubUsername?: string;
    };
    backendToken?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      authorization: { params: { scope: "read:user user:email public_repo" } },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: { params: { scope: "openid email profile" } },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, account, profile }) {
      // After GitHub login, exchange with our backend for a Cairn JWT.
      if (account && profile) {
        try {
          const isGoogle = account.provider === "google";
          const p = profile as {
            avatar_url?: string;
            picture?: string;
            login?: string;
            email?: string;
            name?: string;
          };
          const res = await fetch(`${backendUrl()}/api/auth/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: token.email || p.email,
              name: token.name || p.name,
              avatarUrl: p.avatar_url || p.picture || token.picture,
              githubUsername: isGoogle ? "" : p.login || "",
              githubAccessToken: isGoogle ? "" : account.access_token || "",
              provider: account.provider,
            }),
          });
          if (res.ok) {
            const data = (await res.json()) as {
              token: string;
              user: { id: string; handle: string; onboarded: boolean; githubUsername: string };
            };
            token.backendToken = data.token;
            token.uid = data.user.id;
            token.handle = data.user.handle;
            token.onboarded = data.user.onboarded;
            token.githubUsername = data.user.githubUsername;
          }
        } catch {
          // ignore; session will just lack a backend token
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        ...(session.user || {}),
        id: token.uid as string | undefined,
        handle: token.handle as string | undefined,
        onboarded: token.onboarded as boolean | undefined,
        githubUsername: token.githubUsername as string | undefined,
      };
      session.backendToken = token.backendToken as string | undefined;
      return session;
    },
  },
};

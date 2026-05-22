import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { backendUrl } from "@/lib/api";

/**
 * Authenticated proxy. Prefers NextAuth session token; falls back to the
 * X-Guest-Token header set by the browser for guest mode.
 *
 * GET  /api/proxy/paths/active  -> backend GET /api/paths/active
 */
async function forward(req: NextRequest, segments: string[]) {
  const session = await getServerSession(authOptions);
  const guestToken = req.headers.get("x-guest-token");
  const token = session?.backendToken || guestToken;
  if (!token) {
    return NextResponse.json({ error: "Not signed in (and no guest session)" }, { status: 401 });
  }

  const path = "/api/" + segments.join("/");
  const url = `${backendUrl()}${path}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const res = await fetch(url, init);
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}

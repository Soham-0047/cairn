import { NextRequest, NextResponse } from "next/server";
import { backendUrl } from "@/lib/api";

/**
 * Admin proxy. Browser passes X-Admin-Token; we forward it verbatim.
 * The frontend admin page handles storing the token in localStorage.
 */
async function forward(req: NextRequest, segments: string[]) {
  const token = req.headers.get("x-admin-token");
  if (!token) return NextResponse.json({ error: "Admin token required" }, { status: 401 });

  const path = "/api/admin/" + segments.join("/");
  const url = `${backendUrl()}${path}${req.nextUrl.search}`;

  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": token,
    },
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }
  const res = await fetch(url, init);
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
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

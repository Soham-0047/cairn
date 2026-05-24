import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/api";

export async function POST() {
  const res = await fetch(`${backendUrl()}/api/auth/guest`, { method: "POST" });
  const body = await res.text();
  return new NextResponse(body, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
  });
}

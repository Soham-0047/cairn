import { NextResponse } from "next/server";
import { backendUrl } from "@/lib/api";

export async function POST() {
  const url = `${backendUrl()}/api/auth/guest`;
  try {
    const res = await fetch(url, { method: "POST" });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") || "application/json" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Backend unreachable",
        message: err instanceof Error ? err.message : "fetch failed",
        hint: `Could not reach ${url}. Is NEXT_PUBLIC_BACKEND_URL set on Netlify?`,
      },
      { status: 502 },
    );
  }
}

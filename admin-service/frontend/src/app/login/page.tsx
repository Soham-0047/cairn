"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/session";
import { apiUrl } from "@/lib/api";

export default function LoginPage() {
  const session = useSession();
  const router = useRouter();
  const params = useSearchParams();
  const error = params.get("error");

  useEffect(() => {
    if (session.status === "authed") router.replace("/");
  }, [session.status, router]);

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 100 }}>
      <div className="card" style={{ width: 380 }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: ".1em", color: "#8b94a7" }}>
            Admin Service
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 600, marginTop: 4 }}>Sign in</h1>
          <p style={{ color: "#9ba3b3", fontSize: 13, marginTop: 8 }}>
            Only emails on the server&apos;s ADMIN_EMAILS allowlist can access this panel.
          </p>
        </div>
        {error && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: "rgba(220,38,38,.12)",
              color: "#fca5a5",
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {errorLabel(error)}
          </div>
        )}
        <a className="btn" href={apiUrl("/auth/google/start")} style={{ width: "100%", justifyContent: "center" }}>
          Continue with Google
        </a>
      </div>
    </div>
  );
}

function errorLabel(code: string): string {
  switch (code) {
    case "not_authorized": return "Your email isn't on the allowlist.";
    case "email_unverified": return "Your Google email isn't verified.";
    case "invalid_state": return "Login link expired. Try again.";
    case "missing_code": return "Google didn't return a code. Try again.";
    case "oauth_failed": return "OAuth failed. Check the server logs.";
    default: return `Login failed: ${code}`;
  }
}

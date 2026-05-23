"use client";
import Link from "next/link";
import { useRequireAuth } from "@/lib/session";

const CARDS = [
  {
    href: "/credentials",
    title: "API credentials",
    body: "Add, rotate, test, and disable API keys. Encrypted at rest. Consumer projects pull from /public/credentials.",
  },
  {
    href: "/site",
    title: "Site config",
    body: "Brand, copy, SEO, feature flags, guest mode. Per-product key supported.",
  },
  {
    href: "/strings",
    title: "Strings",
    body: "Free-form UI label key/value map. Edit copy without redeploying any consumer.",
  },
  {
    href: "/resources",
    title: "Resources catalog",
    body: "Curated learning resources by topic. Read by consumers via /public/resources.",
  },
];

export default function Home() {
  const s = useRequireAuth();
  if (s.status !== "authed") return null;

  return (
    <div>
      <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em" }}>
        Welcome, {s.admin.name?.split(" ")[0] ?? s.admin.email}.
      </h1>
      <p style={{ color: "#9ba3b3", marginTop: 6, fontSize: 14 }}>
        Manage everything from here. Changes apply to every consumer project on its next cache refresh.
      </p>
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 14,
        }}
      >
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="card"
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 600 }}>{c.title}</h2>
            <p style={{ color: "#9ba3b3", fontSize: 13, marginTop: 8, lineHeight: 1.5 }}>{c.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

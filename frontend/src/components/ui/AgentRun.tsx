"use client";
import { useMemo, useState } from "react";
import { Icon, SmallEyebrow } from "@/components/ui/primitives";

/**
 * The audit surface for one evaluation.
 *
 * A score with no visible working is something a user either accepts or
 * dismisses; there is nothing in between, and nothing they can argue with.
 * These panels show the three things that make the score checkable: which
 * files the agent chose to open, which claims survived being checked against
 * those files, and how the surviving evidence was weighted.
 *
 * The dropped claims are shown rather than hidden. What a system rejected is
 * better evidence that it is checking than any badge saying it does.
 */

export type AgentStep = {
  index: number;
  thought: string;
  tool: string;
  args: Record<string, unknown>;
  observation: string;
  isError: boolean;
  latencyMs: number;
  provider: string;
  model: string;
};

export type Claim = {
  id: string;
  text: string;
  cite: string;
  polarity: "positive" | "negative" | "neutral";
  source: string;
  verdict: "supported" | "unsupported" | "contradicted" | "uncitable";
  reason: string;
};

export type ScoreComponent = {
  key: string;
  label: string;
  value: number;
  weight: number;
  effectiveWeight: number;
  confidence: string;
  present: boolean;
};

const TOOL_ICON: Record<string, string> = {
  list_files: "layers",
  read_file: "file",
  search_code: "search",
  read_history: "clock",
  read_manifest: "package",
};

const TOOL_LABEL: Record<string, string> = {
  list_files: "Listed files",
  read_file: "Read",
  search_code: "Searched for",
  read_history: "Read commit history",
  read_manifest: "Read dependencies",
};

/** The one-line summary of a tool call, in the terms a reader cares about. */
function describe(step: AgentStep): string {
  const a = step.args || {};
  switch (step.tool) {
    case "read_file":
      return String(a.path ?? "a file");
    case "search_code":
      return `/${String(a.query ?? "")}/${a.path_filter ? ` in ${a.path_filter}` : ""}`;
    case "list_files":
      return a.pattern ? `matching ${a.pattern}` : "across the whole tree";
    default:
      return "";
  }
}

/* ------------------------------ trajectory ------------------------------ */

export function AgentTrajectory({
  steps,
  live,
}: {
  steps: AgentStep[];
  live?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (steps.length === 0) {
    return (
      <div className="card" style={{ padding: 22 }}>
        <SmallEyebrow>Investigation</SmallEyebrow>
        <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 10, marginBottom: 0 }}>
          {live ? "Waiting for the first tool call…" : "No tool calls were recorded for this run."}
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: 22 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <SmallEyebrow>{live ? "Investigating · live" : "Investigation"}</SmallEyebrow>
        <span className="mono" style={{ fontSize: 11, color: "var(--text-lo)" }}>
          {steps.length} tool call{steps.length === 1 ? "" : "s"}
        </span>
      </div>
      <p style={{ color: "var(--text-mid)", fontSize: 13, margin: "8px 0 16px", maxWidth: 620, lineHeight: 1.55 }}>
        The agent chose what to read. Each step below is a decision it made about where the
        answer was likely to be.
      </p>

      <ol style={{ listStyle: "none", margin: 0, padding: 0, position: "relative" }}>
        {/* Spine connecting the steps, so the sequence reads as one thread. */}
        <span
          aria-hidden
          style={{
            position: "absolute",
            left: 15,
            top: 14,
            bottom: 14,
            width: 1,
            background: "var(--border)",
          }}
        />
        {steps.map((s, i) => {
          const isOpen = open === s.index;
          return (
            <li key={`${s.index}-${i}`} style={{ position: "relative", paddingLeft: 42, paddingBottom: 10 }}>
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: 6,
                  top: 10,
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  display: "grid",
                  placeItems: "center",
                  background: s.isError ? "rgba(251,146,60,0.16)" : "var(--bg-2)",
                  boxShadow: `inset 0 0 0 1px ${s.isError ? "rgba(251,146,60,0.4)" : "var(--border-strong)"}`,
                  color: s.isError ? "var(--warm)" : "var(--text-mid)",
                }}
              >
                <Icon name={TOOL_ICON[s.tool] || "spark"} size={11} />
              </span>

              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : s.index)}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "var(--bg-2)",
                  border: 0,
                  boxShadow: "inset 0 0 0 1px var(--border)",
                  borderRadius: 10,
                  padding: "10px 12px",
                  cursor: "pointer",
                  color: "inherit",
                  font: "inherit",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>
                    {TOOL_LABEL[s.tool] || s.tool}
                  </span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--text-mid)", wordBreak: "break-all" }}>
                    {describe(s)}
                  </span>
                  {s.isError && <span className="pill pill-warm" style={{ fontSize: 10 }}>no result</span>}
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    {s.latencyMs > 0 && (
                      <span className="mono" style={{ fontSize: 10.5, color: "var(--text-lo)" }}>
                        {(s.latencyMs / 1000).toFixed(1)}s
                      </span>
                    )}
                    <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={12} />
                  </span>
                </div>
                {s.thought && (
                  <p style={{ margin: "6px 0 0", fontSize: 12.5, color: "var(--text-mid)", lineHeight: 1.5 }}>
                    {s.thought}
                  </p>
                )}
              </button>

              {isOpen && (
                <div
                  style={{
                    marginTop: 6,
                    background: "var(--bg-1)",
                    boxShadow: "inset 0 0 0 1px var(--border)",
                    borderRadius: 10,
                    padding: 12,
                  }}
                >
                  {(s.provider || s.model) && (
                    <div className="mono" style={{ fontSize: 10.5, color: "var(--text-lo)", marginBottom: 8 }}>
                      {s.provider}/{s.model}
                    </div>
                  )}
                  <pre
                    className="mono"
                    style={{
                      margin: 0,
                      fontSize: 11.5,
                      lineHeight: 1.6,
                      color: "var(--text-mid)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 320,
                      overflow: "auto",
                    }}
                  >
                    {s.observation || "(no output recorded)"}
                  </pre>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ------------------------------- evidence ------------------------------- */

const VERDICT_STYLE: Record<Claim["verdict"], { label: string; color: string; bg: string }> = {
  supported: { label: "verified", color: "var(--mint)", bg: "rgba(52,211,153,0.12)" },
  unsupported: { label: "dropped", color: "var(--text-lo)", bg: "rgba(255,255,255,0.05)" },
  contradicted: { label: "contradicted", color: "var(--warm)", bg: "rgba(251,146,60,0.14)" },
  uncitable: { label: "no valid citation", color: "var(--text-lo)", bg: "rgba(255,255,255,0.05)" },
};

export function EvidenceLedger({
  claims,
  groundedness,
  filesRead,
}: {
  claims: Claim[];
  groundedness: number;
  filesRead: string[];
}) {
  const [showDropped, setShowDropped] = useState(false);
  const { supported, dropped } = useMemo(
    () => ({
      supported: claims.filter((c) => c.verdict === "supported"),
      dropped: claims.filter((c) => c.verdict !== "supported"),
    }),
    [claims],
  );

  if (claims.length === 0) {
    return (
      <div className="card" style={{ padding: 22 }}>
        <SmallEyebrow>Evidence</SmallEyebrow>
        <p style={{ color: "var(--text-mid)", fontSize: 14, marginTop: 10, marginBottom: 0 }}>
          No claims were recorded for this run.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <SmallEyebrow>Evidence</SmallEyebrow>
          <span className="mono" style={{ fontSize: 11, color: "var(--text-lo)" }}>
            {supported.length}/{claims.length} held up · {Math.round(groundedness * 100)}%
          </span>
        </div>
        <p style={{ color: "var(--text-mid)", fontSize: 13, margin: "8px 0 16px", maxWidth: 620, lineHeight: 1.55 }}>
          Every statement below was checked against the lines it cites. Anything the source
          did not actually show was dropped before your score was calculated.
        </p>

        {/* Proportion bar — reads faster than the numbers above it. */}
        <div
          role="img"
          aria-label={`${supported.length} of ${claims.length} claims verified`}
          style={{ display: "flex", height: 6, borderRadius: 999, overflow: "hidden", background: "var(--bg-3)" }}
        >
          <span style={{ width: `${(supported.length / claims.length) * 100}%`, background: "var(--mint)" }} />
          <span style={{ flex: 1, background: "var(--bg-3)" }} />
        </div>

        <ul style={{ listStyle: "none", margin: "18px 0 0", padding: 0, display: "grid", gap: 8 }}>
          {supported.map((c) => (
            <ClaimRow key={c.id} claim={c} />
          ))}
        </ul>
      </div>

      {dropped.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <button
            type="button"
            onClick={() => setShowDropped((v) => !v)}
            aria-expanded={showDropped}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: "100%",
              background: "none",
              border: 0,
              padding: 0,
              cursor: "pointer",
              color: "inherit",
              font: "inherit",
              textAlign: "left",
            }}
          >
            <SmallEyebrow>{dropped.length} claim{dropped.length === 1 ? "" : "s"} discarded</SmallEyebrow>
            <Icon name={showDropped ? "chevron-up" : "chevron-down"} size={12} />
          </button>
          <p style={{ color: "var(--text-mid)", fontSize: 13, margin: "8px 0 0", maxWidth: 620, lineHeight: 1.55 }}>
            These did not survive checking. Some may still be true — they just were not shown
            by the source they pointed at, so they were not counted for or against you.
          </p>
          {showDropped && (
            <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 8 }}>
              {dropped.map((c) => (
                <ClaimRow key={c.id} claim={c} muted />
              ))}
            </ul>
          )}
        </div>
      )}

      {filesRead.length > 0 && (
        <div className="card" style={{ padding: 22 }}>
          <SmallEyebrow>Read {filesRead.length} file{filesRead.length === 1 ? "" : "s"}</SmallEyebrow>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
            {filesRead.map((f) => (
              <span key={f} className="mono" style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 6,
                background: "var(--bg-2)",
                boxShadow: "inset 0 0 0 1px var(--border)",
                color: "var(--text-mid)",
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClaimRow({ claim, muted }: { claim: Claim; muted?: boolean }) {
  const v = VERDICT_STYLE[claim.verdict];
  return (
    <li
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: 10,
        background: "var(--bg-2)",
        boxShadow: "inset 0 0 0 1px var(--border)",
        opacity: muted ? 0.72 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          marginTop: 3,
          flexShrink: 0,
          color: claim.polarity === "negative" ? "var(--warm)" : "var(--mint)",
        }}
      >
        <Icon name={claim.polarity === "negative" ? "alert" : "check"} size={13} />
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.55 }}>{claim.text}</p>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 5, flexWrap: "wrap" }}>
          {claim.cite && (
            <span className="mono" style={{ fontSize: 11, color: "var(--text-lo)", wordBreak: "break-all" }}>
              {claim.cite}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              padding: "2px 7px",
              borderRadius: 999,
              background: v.bg,
              color: v.color,
              letterSpacing: ".02em",
            }}
          >
            {v.label}
          </span>
          {muted && claim.reason && (
            <span style={{ fontSize: 11.5, color: "var(--text-lo)" }}>{claim.reason}</span>
          )}
        </div>
      </div>
    </li>
  );
}

/* ---------------------------- score breakdown ---------------------------- */

export function ScoreBreakdown({
  components,
  groundedness,
  shrinkage,
  passReason,
}: {
  components: ScoreComponent[];
  groundedness: number;
  shrinkage: number;
  passReason: string;
}) {
  const present = components.filter((c) => c.present);
  if (present.length === 0) return null;

  return (
    <div className="card" style={{ padding: 22 }}>
      <SmallEyebrow>How the score was built</SmallEyebrow>
      <p style={{ color: "var(--text-mid)", fontSize: 13, margin: "8px 0 18px", maxWidth: 620, lineHeight: 1.55 }}>
        Each input carries the weight shown. A reviewer that told us it was unsure carries
        less, and the rest take up the difference.
      </p>

      <div style={{ display: "grid", gap: 12 }}>
        {present.map((c) => (
          <div key={c.key}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13.5 }}>{c.label}</span>
              {c.confidence && c.confidence !== "high" && (
                <span style={{ fontSize: 11, color: "var(--text-lo)" }}>
                  {c.confidence} confidence
                </span>
              )}
              <span className="mono" style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--text-mid)" }}>
                {Math.round(c.value * 100)} × {Math.round(c.effectiveWeight * 100)}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 999, background: "var(--bg-3)", overflow: "hidden" }}>
              <span
                style={{
                  display: "block",
                  height: "100%",
                  width: `${c.value * 100}%`,
                  background: "linear-gradient(90deg, var(--primary), var(--primary-hi))",
                  // Weight is encoded as opacity so a lightly-weighted input
                  // reads as lighter without needing a second bar.
                  opacity: 0.45 + c.effectiveWeight,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {shrinkage > 0 && (
        <div
          style={{
            marginTop: 18,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(251,146,60,0.09)",
            boxShadow: "inset 0 0 0 1px rgba(251,146,60,0.24)",
            fontSize: 12.5,
            color: "var(--text-mid)",
            lineHeight: 1.55,
          }}
        >
          Only {Math.round(groundedness * 100)}% of claims could be confirmed against the
          source, so the score was pulled {Math.round(shrinkage * 100)}% toward the
          structural signals — the part measured from the repository itself.
        </div>
      )}

      {passReason && (
        <p style={{ marginTop: 16, marginBottom: 0, fontSize: 13, color: "var(--text-mid)", lineHeight: 1.55 }}>
          {passReason}
        </p>
      )}
    </div>
  );
}

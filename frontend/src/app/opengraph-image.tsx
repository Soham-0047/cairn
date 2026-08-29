import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION_SHORT, SITE_DOMAIN, SITE_NAME } from "@/lib/site";

/**
 * Generated share card, served at /opengraph-image and reused for Twitter.
 *
 * Rendered rather than shipped as a binary so the card can never drift out of
 * sync with the brand, and so there is no 1200x630 PNG to maintain in git.
 */
export const alt = `${SITE_NAME} — AI learning paths with verified projects`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #0e1019 0%, #1a1d2e 55%, #10231f 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        {/* Wordmark: the cairn stack, drawn as stacked pills. */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            {[16, 26, 36, 46].map((w, i) => (
              <div
                key={i}
                style={{
                  width: w,
                  height: 9,
                  borderRadius: 9,
                  background: "linear-gradient(90deg, #818CF8, #34D399)",
                  opacity: 0.75 + i * 0.08,
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.02em" }}>{SITE_NAME}</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.035em", maxWidth: 960 }}>
            Your AI-built path from where you are to where you want to be.
          </div>
          <div style={{ fontSize: 30, lineHeight: 1.4, color: "#A3AAC2", maxWidth: 900 }}>
            {SITE_DESCRIPTION_SHORT}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 24, color: "#8E96B0" }}>
          <div
            style={{
              padding: "9px 20px",
              borderRadius: 999,
              border: "1px solid #34D39955",
              color: "#34D399",
              fontSize: 21,
            }}
          >
            Free to start
          </div>
          <div>{SITE_DOMAIN}</div>
        </div>
      </div>
    ),
    size,
  );
}

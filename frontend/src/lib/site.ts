/**
 * Canonical site identity — the single source of truth for the public URL,
 * search keywords and structured data.
 *
 * Everything SEO-critical lives here as a static constant rather than coming
 * from the backend `SiteConfig`. Crawlers hit us cold, and the backend is on a
 * free tier that sleeps: a canonical URL or sitemap that depends on a live
 * fetch is a canonical URL that sometimes disappears. Brand copy still comes
 * from SiteConfig (see `lib/config.ts`) — only the machine-readable layer is
 * pinned here.
 */

/** Public origin, no trailing slash. Override per-environment with NEXT_PUBLIC_SITE_URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://cairn.sohamdev.com").replace(/\/$/, "");

/** Bare hostname, e.g. "cairn.sohamdev.com" — for display in share cards and copy. */
export const SITE_DOMAIN = SITE_URL.replace(/^https?:\/\//, "");

export const SITE_NAME = "Cairn";
export const SITE_TAGLINE = "AI learning paths with verified projects";

/** Default title. Front-loads the job-to-be-done, not the brand. */
export const SITE_TITLE = "Cairn — AI Learning Path Generator with Verified Project Credentials";

export const SITE_DESCRIPTION =
  "Cairn builds you a free, personalized 12-week learning path from the best free tutorials on the internet, " +
  "reviews the projects you ship with AI (code + screenshots), and issues signed credentials that build a " +
  "recruiter-ready portfolio. Free to start, no course to buy.";

/** Short form for OG/Twitter cards, where long descriptions get truncated. */
export const SITE_DESCRIPTION_SHORT =
  "Get a personalized 12-week learning path, ship real projects, and earn AI-verified credentials for your portfolio.";

export const TWITTER_HANDLE = "@cairnapp";

export const GITHUB_URL = "https://github.com/Soham-0047/cairn";

/** Public contact address — lives on the app subdomain. */
export const SITE_EMAIL = "hi@sohamdev.com";

/**
 * Search intent this product should rank for. Ordered by how directly each
 * phrase maps to someone who would actually sign up.
 */
export const SITE_KEYWORDS = [
  "AI learning path generator",
  "personalized learning roadmap",
  "free coding roadmap",
  "AI career path planner",
  "verified project portfolio",
  "AI code review for portfolio projects",
  "developer portfolio builder",
  "learn to code roadmap 2026",
  "12 week learning plan",
  "AI project evaluation",
  "verifiable developer credentials",
  "self-taught developer portfolio",
  "AI skill assessment",
  "free tutorials curated path",
  "Gemma 4 learning app",
];

/** Absolute URL from an app-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Routes that must never be indexed — authenticated app surfaces, the admin
 * CMS, and the NextAuth callback endpoints. Shared by robots.ts and the
 * per-route metadata so the two can't drift apart.
 */
export const NOINDEX_PATHS = ["/admin", "/api", "/dashboard", "/settings", "/projects", "/quizzes", "/interviews", "/onboarding"];

/** Public, crawlable routes with their sitemap weighting. */
export const PUBLIC_ROUTES: { path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/example", priority: 0.8, changeFrequency: "monthly" },
];

/** FAQ shown on the landing page — mirrored into FAQPage structured data. */
export const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: "How is Cairn different from a course platform?",
    a: "Cairn never sells you content. It curates the best free resources on the internet, paces them into a 12-week path, and — most importantly — verifies what you actually shipped. The credential lives outside Cairn: it's an HMAC-signed JSON payload anyone can check.",
  },
  {
    q: "What does multimodal evaluation actually do?",
    a: "For each project Cairn runs four stages: structural analysis of the commit graph, tests and README; AI code review that reads the source; visual review that looks at screenshots of your running app; and synthesis, which issues a signed credential if the score clears the bar.",
  },
  {
    q: "What happens if the AI model is down?",
    a: "Every task has a fallback chain. The default is Gemma 4 27B, then Gemini 2.5, then DeepSeek, then a local 4B model. The chain is configurable per task in the admin panel.",
  },
  {
    q: "Can recruiters trust the credential?",
    a: "Yes. The badge contains a signed JSON payload. Recruiters can verify it against the public key or run their own verifier — no Cairn account required.",
  },
  {
    q: "Will Cairn generate a learning path for anything?",
    a: "It works best for technical paths: software engineering, machine learning, design engineering and devrel. For very niche or non-technical careers it ships a best-effort path with a warning.",
  },
  {
    q: "Is my code stored?",
    a: "No. Cairn pulls the repo at evaluation time, builds a structural representation, and discards the source. The evaluation report is yours.",
  },
  {
    q: "Is Cairn free?",
    a: "Yes. You can generate a learning path and evaluate projects without paying, and guest mode lets you try a path without creating an account.",
  },
];

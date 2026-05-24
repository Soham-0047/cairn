import { Exa } from "exa-js";
import { env } from "../config/env.js";
import { Resource } from "../models/Resource.js";
import { logger } from "../utils/logger.js";

export interface ResourceResult {
  title: string;
  url: string;
  summary: string;
  publishedDate?: string;
  source: "exa" | "tavily" | "corpus";
}

const EXA_DOMAINS = [
  "youtube.com",
  "freecodecamp.org",
  "dev.to",
  "medium.com",
  "github.com",
  "docs.python.org",
  "developer.mozilla.org",
  "roadmap.sh",
];

let exaClient: Exa | null = null;
function getExa(): Exa | null {
  if (!env.EXA_API_KEY) return null;
  if (!exaClient) exaClient = new Exa(env.EXA_API_KEY);
  return exaClient;
}

function buildQuery(milestoneTitle: string, skills: string[]): string {
  const skillsPart = skills.slice(0, 3).join(" ");
  const q = `${milestoneTitle} tutorial free ${skillsPart}`.trim();
  return q.length > 100 ? q.slice(0, 100) : q;
}

async function searchExa(query: string): Promise<ResourceResult[] | null> {
  const exa = getExa();
  if (!exa) return null;
  const start = Date.now();
  try {
    const res = await exa.searchAndContents(query, {
      numResults: 3,
      useAutoprompt: true,
      type: "neural",
      includeDomains: EXA_DOMAINS,
      summary: true,
    });
    const results: ResourceResult[] = (res.results || []).map((r: Record<string, unknown>) => ({
      title: (r.title as string) || (r.url as string),
      url: r.url as string,
      summary: (r.summary as string) || ((r.text as string) || "").slice(0, 280),
      publishedDate: r.publishedDate as string | undefined,
      source: "exa" as const,
    }));
    logger.info(
      { provider: "exa", query, count: results.length, latencyMs: Date.now() - start },
      "Resource search succeeded",
    );
    return results;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), query, latencyMs: Date.now() - start },
      "Exa search failed — will try fallback",
    );
    return null;
  }
}

async function searchTavily(query: string): Promise<ResourceResult[] | null> {
  if (!env.EXA_FALLBACK_TAVILY_KEY) return null;
  const start = Date.now();
  try {
    const resp = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        api_key: env.EXA_FALLBACK_TAVILY_KEY,
        search_depth: "basic",
        max_results: 3,
      }),
    });
    if (!resp.ok) throw new Error(`Tavily ${resp.status}`);
    const data = (await resp.json()) as {
      results?: { title?: string; url: string; content?: string; published_date?: string }[];
    };
    const results: ResourceResult[] = (data.results || []).map((r) => ({
      title: r.title || r.url,
      url: r.url,
      summary: (r.content || "").slice(0, 280),
      publishedDate: r.published_date,
      source: "tavily" as const,
    }));
    logger.info(
      { provider: "tavily", query, count: results.length, latencyMs: Date.now() - start },
      "Resource search succeeded",
    );
    return results;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err), query, latencyMs: Date.now() - start },
      "Tavily search failed — will try corpus",
    );
    return null;
  }
}

async function searchCorpus(milestoneTitle: string): Promise<ResourceResult[]> {
  const start = Date.now();
  try {
    const words = milestoneTitle
      .toLowerCase()
      .split(/[^a-z0-9+-]+/)
      .filter((w) => w.length > 2);
    const docs = await Resource.find({
      enabled: true,
      $or: [
        { topics: { $in: words } },
        { title: { $regex: words.slice(0, 3).join("|"), $options: "i" } },
      ],
    })
      .sort({ qualityScore: -1 })
      .limit(3)
      .lean();

    const results: ResourceResult[] = docs.map((d) => ({
      title: d.title,
      url: d.url,
      summary: d.description || "",
      source: "corpus" as const,
    }));
    logger.info(
      { provider: "corpus", query: milestoneTitle, count: results.length, latencyMs: Date.now() - start },
      "Resource search fallback to corpus",
    );
    return results;
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : String(err) },
      "Corpus search failed — returning empty",
    );
    return [];
  }
}

/**
 * Fetch 3 freshest free tutorials for a milestone. Tries Exa → Tavily → seeded corpus.
 * Never throws — returns at least an empty array.
 */
export async function searchResourcesForMilestone(
  milestoneTitle: string,
  skills: string[],
): Promise<ResourceResult[]> {
  const query = buildQuery(milestoneTitle, skills);

  const fromExa = await searchExa(query);
  if (fromExa && fromExa.length > 0) return fromExa;

  const fromTavily = await searchTavily(query);
  if (fromTavily && fromTavily.length > 0) return fromTavily;

  return searchCorpus(milestoneTitle);
}

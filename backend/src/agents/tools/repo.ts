import { Octokit } from "@octokit/rest";
import { logger } from "../../utils/logger.js";
import type { Tool, ToolResult } from "../types.js";

/**
 * Read-only GitHub toolbelt for the repo investigator.
 *
 * Design notes:
 *  - Every file the agent reads is recorded in `ledger` with its line count.
 *    The verifier later uses that ledger to reject any claim citing a file the
 *    agent never opened, or a line beyond the file's length. Citations are
 *    only worth something if they can be checked.
 *  - Blobs are cached per run, so a repeated read costs no network call.
 *  - Everything is read-only. There is no tool that can write, and the token
 *    used is either the user's own OAuth token or a public-read PAT.
 */

export type RepoToolContext = {
  octokit: Octokit;
  owner: string;
  repo: string;
  ref: string;
  /** Full recursive tree, fetched once before the agent starts. */
  tree: Array<{ path: string; type: string; size: number }>;
  /** path → file content, populated as the agent reads. */
  blobs: Map<string, string>;
  /** path → line count, for citation checking. */
  ledger: Map<string, number>;
  /** Network reads performed, for cost reporting. */
  reads: number;
};

const IGNORE = [
  /(^|\/)node_modules\//,
  /(^|\/)\.next\//,
  /(^|\/)dist\//,
  /(^|\/)build\//,
  /(^|\/)__pycache__\//,
  /(^|\/)\.venv\//,
  /(^|\/)vendor\//,
  /(^|\/)target\//,
  /\.min\.(js|css)$/,
  /(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|Cargo\.lock|composer\.lock)$/,
  /\.(png|jpe?g|gif|webp|svg|ico|woff2?|ttf|eot|mp4|mp3|pdf|zip|gz)$/i,
];

const MAX_FILE_BYTES = 120_000;
const MAX_READ_LINES = 400;

export function visibleFiles(ctx: RepoToolContext) {
  return ctx.tree.filter(
    (n) => n.type === "blob" && !IGNORE.some((rx) => rx.test(n.path)),
  );
}

async function readBlob(ctx: RepoToolContext, path: string): Promise<string> {
  const cached = ctx.blobs.get(path);
  if (cached !== undefined) return cached;

  const res = await ctx.octokit.repos.getContent({
    owner: ctx.owner,
    repo: ctx.repo,
    path,
    ref: ctx.ref,
  });
  ctx.reads++;
  if (Array.isArray(res.data) || !("content" in res.data) || !res.data.content) {
    throw new Error(`${path} is not a readable file`);
  }
  const text = Buffer.from(res.data.content, "base64").toString("utf-8");
  ctx.blobs.set(path, text);
  ctx.ledger.set(path, text.split("\n").length);
  return text;
}

function ok(content: string, data?: unknown): ToolResult {
  return { content, data };
}
function fail(content: string): ToolResult {
  return { content, isError: true };
}

/* ------------------------------- tools ------------------------------- */

export const listFiles: Tool<RepoToolContext> = {
  name: "list_files",
  description:
    "List repository files, newest-relevant first. Use this before reading anything. Filter with `pattern` to narrow to a directory or extension.",
  cost: 0,
  params: [
    {
      name: "pattern",
      type: "string",
      required: false,
      description: 'substring or regex to match against the path, e.g. "src/services" or "\\.test\\."',
    },
    { name: "limit", type: "number", required: false, description: "max paths to return (default 120)" },
  ],
  async run(args, ctx) {
    const limit = Math.min(400, Math.max(1, Number(args.limit) || 120));
    let files = visibleFiles(ctx);
    const pattern = typeof args.pattern === "string" ? args.pattern.trim() : "";
    if (pattern) {
      let rx: RegExp;
      try {
        rx = new RegExp(pattern, "i");
      } catch {
        return fail(`"${pattern}" is not a valid pattern`);
      }
      files = files.filter((f) => rx.test(f.path));
    }
    if (files.length === 0) {
      return ok(`No files match "${pattern}". Try a broader pattern or call list_files with no pattern.`);
    }
    const shown = files.slice(0, limit);
    const body = shown.map((f) => `${f.path} (${f.size} B)`).join("\n");
    return ok(
      `${files.length} file(s) match${files.length > shown.length ? `, showing ${shown.length}` : ""}:\n${body}`,
      shown.map((f) => f.path),
    );
  },
};

export const readFile: Tool<RepoToolContext> = {
  name: "read_file",
  description:
    "Read a file with line numbers. Read the files that decide whether this project is real work — entry points, core logic, tests — not config.",
  cost: 1,
  params: [
    { name: "path", type: "string", required: true, description: "exact path from list_files" },
    { name: "start_line", type: "number", required: false, description: "1-indexed first line (default 1)" },
    {
      name: "max_lines",
      type: "number",
      required: false,
      description: `lines to return, capped at ${MAX_READ_LINES}`,
    },
  ],
  async run(args, ctx) {
    const path = String(args.path).trim().replace(/^\.?\//, "");
    const entry = visibleFiles(ctx).find((f) => f.path === path);
    if (!entry) {
      const near = visibleFiles(ctx)
        .filter((f) => f.path.toLowerCase().includes(path.toLowerCase().split("/").pop() || ""))
        .slice(0, 5)
        .map((f) => f.path);
      return fail(
        `No such file: ${path}.${near.length ? ` Did you mean: ${near.join(", ")}?` : " Call list_files first."}`,
      );
    }
    if (entry.size > MAX_FILE_BYTES) {
      return fail(`${path} is ${entry.size} B — too large to read. Pick a smaller file.`);
    }

    let text: string;
    try {
      text = await readBlob(ctx, path);
    } catch (err) {
      return fail(`Could not read ${path}: ${err instanceof Error ? err.message : String(err)}`);
    }

    const lines = text.split("\n");
    const start = Math.max(1, Number(args.start_line) || 1);
    const count = Math.min(MAX_READ_LINES, Math.max(1, Number(args.max_lines) || MAX_READ_LINES));
    const slice = lines.slice(start - 1, start - 1 + count);
    if (slice.length === 0) {
      return fail(`${path} has ${lines.length} lines; start_line ${start} is past the end.`);
    }
    const numbered = slice.map((l, i) => `${start + i}\t${l}`).join("\n");
    const more =
      start - 1 + slice.length < lines.length
        ? `\n… ${lines.length - (start - 1 + slice.length)} more lines. Read again with start_line=${start + slice.length} if it matters.`
        : "";
    return ok(`${path} (lines ${start}-${start + slice.length - 1} of ${lines.length}):\n${numbered}${more}`, {
      path,
      totalLines: lines.length,
    });
  },
};

export const searchCode: Tool<RepoToolContext> = {
  name: "search_code",
  description:
    "Search file contents for a pattern and return matching lines with their paths. Use it to check a claim (does this repo actually have tests? real error handling? hardcoded secrets?) without reading whole files.",
  cost: 2,
  params: [
    { name: "query", type: "string", required: true, description: "substring or regex to find" },
    {
      name: "path_filter",
      type: "string",
      required: false,
      description: "only search files whose path matches this",
    },
    { name: "max_results", type: "number", required: false, description: "default 40" },
  ],
  async run(args, ctx) {
    const query = String(args.query).trim();
    if (!query) return fail("query is empty");
    let rx: RegExp;
    try {
      rx = new RegExp(query, "i");
    } catch {
      rx = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
    const maxResults = Math.min(120, Math.max(1, Number(args.max_results) || 40));
    const pathFilter = typeof args.path_filter === "string" ? args.path_filter.trim() : "";

    let candidates = visibleFiles(ctx).filter((f) => f.size <= MAX_FILE_BYTES);
    if (pathFilter) {
      try {
        const prx = new RegExp(pathFilter, "i");
        candidates = candidates.filter((f) => prx.test(f.path));
      } catch {
        candidates = candidates.filter((f) => f.path.includes(pathFilter));
      }
    }

    // Files already in cache are free to scan; prefer them, then spend a
    // bounded number of network reads on the rest.
    const cached = candidates.filter((f) => ctx.blobs.has(f.path));
    const uncached = candidates.filter((f) => !ctx.blobs.has(f.path)).slice(0, 25);
    const hits: string[] = [];

    for (const f of [...cached, ...uncached]) {
      if (hits.length >= maxResults) break;
      let text: string;
      try {
        text = await readBlob(ctx, f.path);
      } catch {
        continue;
      }
      const lines = text.split("\n");
      for (let i = 0; i < lines.length && hits.length < maxResults; i++) {
        if (rx.test(lines[i]!)) {
          hits.push(`${f.path}:${i + 1}: ${lines[i]!.trim().slice(0, 200)}`);
        }
      }
    }

    if (hits.length === 0) {
      return ok(
        `No matches for /${query}/ in ${candidates.length} candidate file(s). That absence is itself evidence — record it if it matters.`,
        [],
      );
    }
    return ok(`${hits.length} match(es) for /${query}/:\n${hits.join("\n")}`, hits);
  },
};

export const readHistory: Tool<RepoToolContext> = {
  name: "read_history",
  description:
    "Commit history: messages, dates and authors. Distinguishes steady incremental work from a single bulk upload.",
  cost: 1,
  params: [
    { name: "limit", type: "number", required: false, description: "commits to fetch, max 100 (default 40)" },
  ],
  async run(args, ctx) {
    const per_page = Math.min(100, Math.max(1, Number(args.limit) || 40));
    try {
      const res = await ctx.octokit.repos.listCommits({
        owner: ctx.owner,
        repo: ctx.repo,
        per_page,
      });
      ctx.reads++;
      const commits = res.data || [];
      if (commits.length === 0) return ok("No commits returned.");
      const authors = new Set<string>();
      const lines = commits.map((c) => {
        const who = c.author?.login || c.commit.author?.name || "unknown";
        authors.add(who);
        const when = (c.commit.author?.date || "").slice(0, 10);
        const msg = (c.commit.message || "").split("\n")[0]!.slice(0, 100);
        return `${when}  ${who.padEnd(18)}  ${msg}`;
      });
      const dates = commits
        .map((c) => c.commit.author?.date)
        .filter(Boolean)
        .sort();
      const spanDays =
        dates.length >= 2
          ? Math.round(
              (new Date(dates[dates.length - 1]!).getTime() - new Date(dates[0]!).getTime()) / 86_400_000,
            )
          : 0;
      return ok(
        `${commits.length} commit(s) by ${authors.size} author(s) over ${spanDays} day(s):\n${lines.join("\n")}`,
        { count: commits.length, authors: authors.size, spanDays },
      );
    } catch (err) {
      return fail(`History unavailable: ${err instanceof Error ? err.message : String(err)}`);
    }
  },
};

export const readManifest: Tool<RepoToolContext> = {
  name: "read_manifest",
  description:
    "Read dependency manifests (package.json, requirements.txt, go.mod, Cargo.toml, pyproject.toml) to see what the project is actually built on.",
  cost: 1,
  params: [],
  async run(_args, ctx) {
    const names = [
      "package.json",
      "requirements.txt",
      "pyproject.toml",
      "go.mod",
      "Cargo.toml",
      "Gemfile",
      "pom.xml",
      "build.gradle",
      "composer.json",
    ];
    const found = visibleFiles(ctx).filter((f) => names.includes(f.path.split("/").pop() || ""));
    if (found.length === 0) return ok("No dependency manifest found anywhere in the tree.");
    const out: string[] = [];
    for (const f of found.slice(0, 4)) {
      try {
        const text = await readBlob(ctx, f.path);
        out.push(`--- ${f.path} ---\n${text.slice(0, 3000)}`);
      } catch {
        /* skip unreadable manifest */
      }
    }
    return ok(out.join("\n\n"), found.map((f) => f.path));
  },
};

export const REPO_TOOLS: Tool<RepoToolContext>[] = [
  listFiles,
  readFile,
  searchCode,
  readHistory,
  readManifest,
];

/** Builds the tool context. The tree is fetched once; everything else is lazy. */
export async function createRepoContext(params: {
  octokit: Octokit;
  owner: string;
  repo: string;
  ref: string;
}): Promise<RepoToolContext> {
  const ctx: RepoToolContext = {
    ...params,
    tree: [],
    blobs: new Map(),
    ledger: new Map(),
    reads: 0,
  };
  try {
    const t = await ctx.octokit.git.getTree({
      owner: params.owner,
      repo: params.repo,
      tree_sha: params.ref,
      recursive: "true",
    });
    ctx.reads++;
    ctx.tree = (t.data.tree || []).map((n) => ({
      path: n.path || "",
      type: n.type || "",
      size: n.size || 0,
    }));
  } catch (err) {
    logger.warn(
      { owner: params.owner, repo: params.repo, err: (err as Error).message },
      "repo tree fetch failed — agent will operate on an empty tree",
    );
  }
  return ctx;
}

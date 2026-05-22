import { Octokit } from "@octokit/rest";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export type RepoSnapshot = {
  owner: string;
  repo: string;
  description: string;
  language: string;
  stars: number;
  defaultBranch: string;
  commitCount: number;
  uniqueAuthors: number;
  createdAt: string;
  updatedAt: string;
  readme: string;
  fileTree: string;
  codeExcerpts: string;
};

function parseRepoUrl(url: string): { owner: string; repo: string } {
  const m = url.match(/github\.com[:/]([^/]+)\/([^/\s.]+)(?:\.git)?\/?$/i);
  if (!m) throw new Error(`Not a GitHub repo URL: ${url}`);
  return { owner: m[1]!, repo: m[2]! };
}

const CODE_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java",
  ".kt", ".rb", ".php", ".cs", ".swift", ".cpp", ".c", ".h",
];

const IGNORE_PATHS = [
  /node_modules\//,
  /\.next\//,
  /dist\//,
  /build\//,
  /\.git\//,
  /__pycache__\//,
  /\.venv\//,
  /vendor\//,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

export async function fetchRepoSnapshot(
  repoUrl: string,
  userAccessToken?: string,
): Promise<RepoSnapshot> {
  const { owner, repo } = parseRepoUrl(repoUrl);
  const auth = userAccessToken || env.GITHUB_TOKEN_FOR_PUBLIC_READS || undefined;
  const octokit = new Octokit({ auth });

  const repoInfo = await octokit.repos.get({ owner, repo });
  const defaultBranch = repoInfo.data.default_branch;

  // README
  let readme = "";
  try {
    const r = await octokit.repos.getReadme({ owner, repo });
    readme = Buffer.from(r.data.content, r.data.encoding as BufferEncoding).toString("utf-8");
  } catch {
    readme = "(no README found)";
  }

  // Commits — first page, count + unique authors as a heuristic
  let commitCount = 0;
  const authors = new Set<string>();
  try {
    const commits = await octokit.repos.listCommits({ owner, repo, per_page: 100 });
    commitCount = commits.data.length;
    for (const c of commits.data) {
      const login = c.author?.login || c.commit.author?.email || "";
      if (login) authors.add(login);
    }
  } catch (err) {
    logger.warn({ err, owner, repo }, "Could not list commits");
  }

  // File tree
  let tree: { path: string; type: string; size?: number }[] = [];
  try {
    const t = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: "true",
    });
    tree = (t.data.tree || []).map((n) => ({
      path: n.path || "",
      type: n.type || "",
      size: n.size,
    }));
  } catch (err) {
    logger.warn({ err }, "Could not fetch tree");
  }

  const interesting = tree.filter(
    (n) =>
      n.type === "blob" &&
      !IGNORE_PATHS.some((rx) => rx.test(n.path)) &&
      CODE_EXTENSIONS.some((ext) => n.path.endsWith(ext)) &&
      (n.size || 0) < 80_000,
  );

  // Sample up to 6 files — README-adjacent + the largest few code files
  const sampled = interesting.slice(0, 6);
  const codeExcerpts: string[] = [];
  for (const f of sampled) {
    try {
      const content = await octokit.repos.getContent({ owner, repo, path: f.path });
      if (!Array.isArray(content.data) && "content" in content.data && content.data.content) {
        const text = Buffer.from(content.data.content, "base64").toString("utf-8");
        codeExcerpts.push(`--- ${f.path} ---\n${text.slice(0, 2000)}`);
      }
    } catch {
      // skip
    }
  }

  return {
    owner,
    repo,
    description: repoInfo.data.description || "",
    language: repoInfo.data.language || "",
    stars: repoInfo.data.stargazers_count || 0,
    defaultBranch,
    commitCount,
    uniqueAuthors: authors.size,
    createdAt: repoInfo.data.created_at,
    updatedAt: repoInfo.data.updated_at,
    readme,
    fileTree: tree
      .filter((n) => !IGNORE_PATHS.some((rx) => rx.test(n.path)))
      .slice(0, 200)
      .map((n) => `${n.type === "tree" ? "[D] " : "    "}${n.path}`)
      .join("\n"),
    codeExcerpts: codeExcerpts.join("\n\n"),
  };
}

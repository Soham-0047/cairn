import { connectDB } from "../config/db.js";
import { Resource } from "../models/Resource.js";
import { getOrCreateSiteConfig, SiteConfig } from "../models/SiteConfig.js";
import { DEFAULT_CHAINS } from "../llm/router.js";
import { logger } from "../utils/logger.js";
import mongoose from "mongoose";

/**
 * Seed: hand-curated resource corpus + default SiteConfig.
 * Re-runnable; uses upsert by URL.
 */

const RESOURCES = [
  // Python
  { url: "https://www.youtube.com/watch?v=rfscVS0vtbw", title: "Python for Beginners — freeCodeCamp", type: "video", source: "youtube", durationMin: 270, topics: ["python", "fundamentals"], qualityScore: 0.92 },
  { url: "https://docs.python.org/3/tutorial/", title: "Official Python Tutorial", type: "doc", source: "python.org", durationMin: 300, topics: ["python", "fundamentals"], qualityScore: 0.85 },
  { url: "https://realpython.com/python-basics/", title: "Python Basics — Real Python", type: "article", source: "realpython", durationMin: 60, topics: ["python", "fundamentals"], qualityScore: 0.9 },

  // ML fundamentals
  { url: "https://www.youtube.com/watch?v=ukzFI9rgwfU", title: "Machine Learning Course — StatQuest", type: "video", source: "youtube", durationMin: 360, topics: ["ml", "machine-learning", "fundamentals"], qualityScore: 0.95 },
  { url: "https://www.coursera.org/learn/machine-learning", title: "Andrew Ng's ML Specialization (audit free)", type: "course", source: "coursera", durationMin: 1800, topics: ["ml", "machine-learning"], qualityScore: 0.97 },
  { url: "https://scikit-learn.org/stable/tutorial/", title: "scikit-learn Tutorial", type: "doc", source: "scikit-learn", durationMin: 240, topics: ["ml", "scikit-learn", "python"], qualityScore: 0.88 },

  // Deep learning + Neural nets
  { url: "https://www.youtube.com/watch?v=aircAruvnKk", title: "But what is a neural network? — 3Blue1Brown", type: "video", source: "youtube", durationMin: 19, topics: ["deep-learning", "neural-networks"], qualityScore: 0.98 },
  { url: "https://www.youtube.com/playlist?list=PLPTV0NXA_ZSj6tNyn_UadmUeU3Q3oR-hu", title: "Neural Networks: Zero to Hero — Karpathy", type: "video", source: "youtube", durationMin: 600, topics: ["deep-learning", "neural-networks", "pytorch"], qualityScore: 0.99 },
  { url: "https://pytorch.org/tutorials/", title: "PyTorch Tutorials", type: "doc", source: "pytorch.org", durationMin: 360, topics: ["pytorch", "deep-learning"], qualityScore: 0.9 },

  // LLM / GenAI
  { url: "https://www.deeplearning.ai/short-courses/", title: "DeepLearning.AI Short Courses", type: "course", source: "deeplearning.ai", durationMin: 90, topics: ["llm", "genai", "prompt-engineering"], qualityScore: 0.94 },
  { url: "https://www.promptingguide.ai/", title: "Prompt Engineering Guide", type: "article", source: "promptingguide", durationMin: 120, topics: ["llm", "prompt-engineering", "genai"], qualityScore: 0.9 },
  { url: "https://huggingface.co/learn/nlp-course", title: "HuggingFace NLP Course", type: "course", source: "huggingface", durationMin: 600, topics: ["nlp", "llm", "transformers"], qualityScore: 0.93 },
  { url: "https://www.youtube.com/watch?v=zjkBMFhNj_g", title: "Intro to LLMs — Andrej Karpathy", type: "video", source: "youtube", durationMin: 60, topics: ["llm", "genai"], qualityScore: 0.98 },

  // Backend / System design
  { url: "https://github.com/donnemartin/system-design-primer", title: "System Design Primer", type: "article", source: "github", durationMin: 600, topics: ["system-design", "backend"], qualityScore: 0.95 },
  { url: "https://www.youtube.com/watch?v=Wm6CUkswsNw", title: "System Design Concepts Course — freeCodeCamp", type: "video", source: "youtube", durationMin: 240, topics: ["system-design", "backend"], qualityScore: 0.9 },
  { url: "https://fastapi.tiangolo.com/tutorial/", title: "FastAPI Tutorial", type: "doc", source: "fastapi", durationMin: 180, topics: ["fastapi", "backend", "python", "api"], qualityScore: 0.92 },
  { url: "https://expressjs.com/en/starter/installing.html", title: "Express.js Guide", type: "doc", source: "expressjs", durationMin: 120, topics: ["express", "backend", "node", "javascript"], qualityScore: 0.85 },

  // Frontend
  { url: "https://react.dev/learn", title: "React Official Tutorial", type: "doc", source: "react.dev", durationMin: 240, topics: ["react", "frontend", "javascript"], qualityScore: 0.95 },
  { url: "https://nextjs.org/learn", title: "Next.js Learn", type: "course", source: "nextjs", durationMin: 300, topics: ["nextjs", "react", "frontend"], qualityScore: 0.93 },
  { url: "https://tailwindcss.com/docs/installation", title: "Tailwind CSS Docs", type: "doc", source: "tailwindcss", durationMin: 60, topics: ["tailwind", "css", "frontend"], qualityScore: 0.88 },

  // Databases
  { url: "https://www.mongodb.com/docs/manual/tutorial/", title: "MongoDB Tutorial", type: "doc", source: "mongodb", durationMin: 180, topics: ["mongodb", "database", "backend"], qualityScore: 0.85 },
  { url: "https://www.postgresqltutorial.com/", title: "PostgreSQL Tutorial", type: "doc", source: "postgresql", durationMin: 240, topics: ["postgres", "sql", "database"], qualityScore: 0.87 },

  // Interview prep
  { url: "https://neetcode.io/practice", title: "NeetCode 150 — Coding Interview Prep", type: "course", source: "neetcode", durationMin: 3600, topics: ["interview", "algorithms", "data-structures"], qualityScore: 0.96 },
  { url: "https://leetcode.com/explore/", title: "LeetCode Explore", type: "course", source: "leetcode", durationMin: 1800, topics: ["interview", "algorithms"], qualityScore: 0.85 },
  { url: "https://github.com/jwasham/coding-interview-university", title: "Coding Interview University", type: "article", source: "github", durationMin: 1800, topics: ["interview", "computer-science"], qualityScore: 0.9 },

  // AI Engineering specific
  { url: "https://github.com/openai/openai-cookbook", title: "OpenAI Cookbook", type: "article", source: "github", durationMin: 240, topics: ["llm", "openai", "genai", "ai-engineering"], qualityScore: 0.91 },
  { url: "https://www.youtube.com/watch?v=l8pRSuU81PU", title: "Let's reproduce GPT-2 — Karpathy", type: "video", source: "youtube", durationMin: 240, topics: ["llm", "deep-learning", "transformers"], qualityScore: 0.98 },
  { url: "https://lilianweng.github.io/posts/", title: "Lil'Log — Lilian Weng's blog", type: "article", source: "lilianweng", durationMin: 600, topics: ["llm", "ml", "research"], qualityScore: 0.95 },

  // Git / Tooling
  { url: "https://learngitbranching.js.org/", title: "Learn Git Branching", type: "course", source: "learngitbranching", durationMin: 120, topics: ["git", "tooling"], qualityScore: 0.92 },
  { url: "https://missing.csail.mit.edu/", title: "The Missing Semester — MIT", type: "course", source: "mit", durationMin: 660, topics: ["tooling", "shell", "git", "linux"], qualityScore: 0.96 },
];

async function main() {
  await connectDB();

  // Seed resources
  let upserted = 0;
  for (const r of RESOURCES) {
    await Resource.findOneAndUpdate(
      { url: r.url },
      { $set: { ...r, enabled: true } },
      { upsert: true },
    );
    upserted++;
  }
  logger.info({ upserted }, "Seeded resources");

  // Seed SiteConfig with default LLM chains as Map
  const cfg = await getOrCreateSiteConfig();
  const chainsMap = new Map(Object.entries(DEFAULT_CHAINS));
  await SiteConfig.updateOne(
    { key: "default" },
    {
      $set: {
        llmChains: chainsMap,
      },
    },
  );
  logger.info({ tasks: chainsMap.size }, "Seeded LLM chain defaults");

  await mongoose.disconnect();
  logger.info("Seed complete");
  process.exit(0);
}

main().catch((err) => {
  logger.fatal({ err }, "Seed failed");
  process.exit(1);
});

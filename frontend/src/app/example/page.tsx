import { PortfolioView, type PortfolioData } from "@/components/ui/PortfolioView";

const EXAMPLE: PortfolioData = {
  profile: {
    handle: "mira-k",
    name: "Mira Khatri",
    targetRole: "AI Engineer — career-switching from frontend",
    location: "Bangalore",
    githubUsername: "mirak",
  },
  activePath: {
    targetRole: "AI Engineer",
    summary: "From Python basics to deploying a multimodal RAG agent with verified evals.",
    phaseCount: 3,
    completedMilestones: 12,
    totalMilestones: 12,
    generatedBy: { provider: "google", model: "gemma-4-27b" },
  },
  projects: [
    {
      id: "p1",
      title: "Codex Studio",
      repoUrl: "https://github.com/mirak/codex-studio",
      score: 0.92,
      strengths: ["Clean agent loop", "Streaming with async generators", "Solid tests on core paths"],
      skills: ["Agents", "RAG", "Streaming"],
      models: [
        { stage: "code", provider: "google", model: "gemma-4-27b" },
        { stage: "visual", provider: "google", model: "gemma-4-12b" },
      ],
      evaluatedAt: "2026-04-10T10:00:00.000Z",
    },
    {
      id: "p2",
      title: "NoteShelf",
      repoUrl: "https://github.com/mirak/noteshelf",
      score: 0.88,
      strengths: ["Type-safe tRPC layer", "Composed query hooks", "Postgres migrations clean"],
      skills: ["Next.js", "tRPC", "Postgres"],
      models: [{ stage: "code", provider: "google", model: "gemma-4-27b" }],
      evaluatedAt: "2026-03-22T10:00:00.000Z",
    },
    {
      id: "p3",
      title: "Echo Buddy",
      repoUrl: "https://github.com/mirak/echo-buddy",
      score: 0.81,
      strengths: ["Sub-500ms voice round-trips", "Clean tool-call shape"],
      skills: ["Whisper", "ElevenLabs", "Realtime"],
      models: [{ stage: "code", provider: "google", model: "gemma-4-27b" }],
      evaluatedAt: "2026-03-08T10:00:00.000Z",
    },
    {
      id: "p4",
      title: "PaperCanvas",
      repoUrl: "https://github.com/mirak/papercanvas",
      score: 0.95,
      strengths: ["Custom GLSL noise shader", "Hardware-accelerated render path"],
      skills: ["Three.js", "GLSL", "Shaders"],
      models: [{ stage: "code", provider: "google", model: "gemma-4-27b" }],
      evaluatedAt: "2026-04-01T10:00:00.000Z",
    },
    {
      id: "p5",
      title: "EvalKit",
      repoUrl: "https://github.com/mirak/evalkit",
      score: 0.84,
      strengths: ["Reproducible eval harness", "Three datasets bundled"],
      skills: ["Python", "Datasets"],
      models: [{ stage: "code", provider: "google", model: "gemma-4-27b" }],
      evaluatedAt: "2026-02-28T10:00:00.000Z",
    },
    {
      id: "p6",
      title: "Mini-GPT",
      repoUrl: "https://github.com/mirak/mini-gpt",
      score: 0.79,
      strengths: ["Hand-rolled attention", "1M params, trains in 4 minutes"],
      skills: ["PyTorch", "Attention"],
      models: [{ stage: "code", provider: "google", model: "gemma-4-27b" }],
      evaluatedAt: "2026-02-12T10:00:00.000Z",
    },
  ],
  credentials: [
    { id: "c1", type: "project", title: "Codex Studio", skills: ["Agents", "RAG"], issuedAt: "2026-04-10T10:00:00.000Z", signature: "e3b0c4..." },
    { id: "c2", type: "project", title: "NoteShelf", skills: ["Next.js", "tRPC"], issuedAt: "2026-03-22T10:00:00.000Z", signature: "a1b2c3..." },
    { id: "c3", type: "project", title: "Echo Buddy", skills: ["Whisper"], issuedAt: "2026-03-08T10:00:00.000Z", signature: "d4e5f6..." },
    { id: "c4", type: "project", title: "PaperCanvas", skills: ["Three.js"], issuedAt: "2026-04-01T10:00:00.000Z", signature: "g7h8i9..." },
    { id: "c5", type: "project", title: "EvalKit", skills: ["Python"], issuedAt: "2026-02-28T10:00:00.000Z", signature: "j0k1l2..." },
    { id: "c6", type: "project", title: "Mini-GPT", skills: ["PyTorch"], issuedAt: "2026-02-12T10:00:00.000Z", signature: "m3n4o5..." },
  ],
};

export default function ExamplePage() {
  return <PortfolioView data={EXAMPLE} example />;
}

/**
 * Agent runtime types.
 *
 * The runtime is deliberately provider-agnostic and does NOT use native
 * function/tool calling. Reason: the model chain in llm/router.ts spans
 * Google (Gemma + Gemini), OpenRouter, Groq and Cerebras, and native tool
 * calling is either unsupported (Gemma via the Gemini REST API) or subtly
 * incompatible across those providers. A chain link that cannot express a
 * tool call would silently produce prose instead of an action.
 *
 * So tools are expressed as a JSON action protocol in the prompt. Every model
 * in the chain can emit JSON, which means a tool-using agent survives failover
 * to any provider — the property the whole system is built around.
 */

/** JSON-schema-ish description of one tool argument. */
export type ToolParam = {
  name: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  description: string;
};

export type ToolResult = {
  /** Rendered back into the transcript for the model to read. */
  content: string;
  /** Machine-readable payload retained on the run for verification/citation. */
  data?: unknown;
  /** True when the call failed; the model sees the error and can adapt. */
  isError?: boolean;
};

export type Tool<Ctx = unknown> = {
  name: string;
  description: string;
  params: ToolParam[];
  /**
   * Cost in "budget units". The runtime stops the agent when the budget is
   * exhausted, which bounds both latency and API quota per run. Expensive
   * tools (a network read) cost more than cheap ones (an in-memory filter).
   */
  cost?: number;
  run(args: Record<string, unknown>, ctx: Ctx): Promise<ToolResult>;
};

export type AgentAction =
  | { kind: "tool"; tool: string; args: Record<string, unknown>; thought: string }
  | { kind: "final"; result: unknown; thought: string };

export type AgentStep = {
  index: number;
  thought: string;
  /** Present unless this step produced the final answer. */
  tool?: string;
  args?: Record<string, unknown>;
  /** Truncated for storage; the full payload lives in `observations`. */
  observation?: string;
  isError?: boolean;
  latencyMs: number;
  provider?: string;
  model?: string;
  budgetSpent: number;
};

export type AgentRun<T = unknown> = {
  agent: string;
  steps: AgentStep[];
  result: T | null;
  /** Every tool result keyed by `${step}:${tool}` — the evidence ledger. */
  observations: Record<string, unknown>;
  budgetUsed: number;
  budgetLimit: number;
  stoppedBecause: "final" | "budget" | "max_steps" | "error";
  error?: string;
  totalLatencyMs: number;
};

export type AgentProgress = (step: AgentStep) => void;

import { logger } from "../utils/logger.js";
import { loadProviders } from "./providers/registry.js";
import {
  LLMRequest,
  LLMResponse,
  Provider,
  ProviderError,
  RateLimitError,
} from "./types.js";

/**
 * Logical tasks. Each one resolves to an ordered chain of (provider, modelId)
 * pairs. The chain is editable at runtime via the admin panel; the constants
 * below are the seed defaults.
 *
 * Adding a new task: append to TaskType, add a default chain in DEFAULT_CHAINS.
 * Adding a new provider: edit providers/registry.ts only.
 */
export type TaskType =
  | "parse_goal"
  | "generate_path"
  | "evaluate_project"
  | "evaluate_project_visual"
  | "generate_quiz"
  | "coach_nudge"
  | "originality_check"
  | "embed_text";

export type ChainEntry = { provider: string; model: string };

// All chains follow the free-tier quotas documented in
// reference_rate-limit.txt. Order:
//   1) Gemma 4 31B / 26B   — 15 RPM, unlimited TPM, 1.5K RPD (richest quota)
//   2) Gemini 3.1 Flash Lite — 15 RPM, 250K TPM, 500 RPD
//   3) Gemini 2.5 Flash Lite — 10 RPM, 250K TPM, 20 RPD
//   4) Gemini 2.5/3/3.5 Flash — 5 RPM, 250K TPM, 20 RPD
//   5) OpenRouter free-tier fallbacks
// Pro variants (gemini-2.5-pro, gemini-3.1-pro) are 0/0/0 on the free tier
// and are NOT included anywhere — including them just burns a chain link.
export const DEFAULT_CHAINS: Record<TaskType, ChainEntry[]> = {
  // Small/fast goal extraction. Gemini 3.1 Flash Lite first (highest RPM with
  // structured-output support), then Gemma 4 (cheapest by quota), then other
  // Flash variants, then OpenRouter as fallback.
  parse_goal: [
    { provider: "google", model: "gemini-3.1-flash-lite" },
    { provider: "google", model: "gemma-4-26b-a4b-it" },
    { provider: "google", model: "gemma-4-31b-it" },
    { provider: "google", model: "gemini-2.5-flash-lite" },
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free" },
    { provider: "openrouter", model: "deepseek/deepseek-r1:free" },
    { provider: "groq", model: "gemma2-9b-it" },
  ],
  // Heavy reasoning + long structured output. Gemma 4 31B leads because its
  // unlimited-TPM, 1.5K RPD quota is the only one comfortable with the large
  // path-generation prompt; fall back to 26B (same quota), then Flash variants
  // for JSON-mode reliability, then OpenRouter fallbacks.
  generate_path: [
    { provider: "google", model: "gemma-4-31b-it" },
    { provider: "google", model: "gemma-4-26b-a4b-it" },
    { provider: "google", model: "gemini-3.1-flash-lite" },
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "google", model: "gemini-2.5-flash-lite" },
    { provider: "google", model: "gemini-3.5-flash" },
    { provider: "openrouter", model: "deepseek/deepseek-r1:free" },
    { provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct:free" },
    { provider: "openrouter", model: "qwen/qwen-2.5-72b-instruct:free" },
  ],
  evaluate_project: [
    { provider: "google", model: "gemma-4-31b-it" },
    { provider: "google", model: "gemma-4-26b-a4b-it" },
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "google", model: "gemini-3.1-flash-lite" },
    { provider: "openrouter", model: "deepseek/deepseek-r1:free" },
  ],
  evaluate_project_visual: [
    { provider: "google", model: "gemma-4-26b-a4b-it" },
    { provider: "google", model: "gemma-4-31b-it" },
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "google", model: "gemini-3.1-flash-lite" },
  ],
  generate_quiz: [
    { provider: "google", model: "gemma-4-26b-a4b-it" },
    { provider: "google", model: "gemini-3.1-flash-lite" },
    { provider: "google", model: "gemini-2.5-flash" },
    { provider: "groq", model: "llama-3.3-70b-versatile" },
  ],
  coach_nudge: [
    { provider: "google", model: "gemma-4-26b-a4b-it" },
    { provider: "google", model: "gemini-3.1-flash-lite" },
    { provider: "google", model: "gemini-2.5-flash-lite" },
    { provider: "groq", model: "gemma2-9b-it" },
    { provider: "cerebras", model: "llama3.1-8b" },
  ],
  originality_check: [
    { provider: "google", model: "gemma-4-26b-a4b-it" },
    { provider: "google", model: "gemini-3.1-flash-lite" },
    { provider: "google", model: "gemini-2.5-flash" },
  ],
  embed_text: [
    // Placeholder — embeddings handled separately if HF is wired in.
    { provider: "google", model: "gemini-3.1-flash-lite" },
  ],
};

type ThrottleEntry = { until: number; reason: string };

/**
 * In-memory throttle tracking. Sufficient for single-instance hackathon
 * deployment. Replace with Redis/Mongo for multi-instance scale.
 */
class ThrottleTracker {
  private byProvider = new Map<string, ThrottleEntry>();

  isThrottled(provider: string): boolean {
    const e = this.byProvider.get(provider);
    if (!e) return false;
    if (Date.now() > e.until) {
      this.byProvider.delete(provider);
      return false;
    }
    return true;
  }

  mark(provider: string, retryAfterSec: number, reason: string): void {
    this.byProvider.set(provider, {
      until: Date.now() + retryAfterSec * 1000,
      reason,
    });
  }

  snapshot(): Array<{ provider: string; remainingMs: number; reason: string }> {
    const now = Date.now();
    return Array.from(this.byProvider.entries())
      .filter(([, e]) => e.until > now)
      .map(([provider, e]) => ({
        provider,
        remainingMs: e.until - now,
        reason: e.reason,
      }));
  }

  clear(provider?: string): number {
    if (provider) {
      return this.byProvider.delete(provider) ? 1 : 0;
    }
    const n = this.byProvider.size;
    this.byProvider.clear();
    return n;
  }
}

export type CallTrace = {
  task: TaskType;
  attempts: Array<{
    provider: string;
    model: string;
    status: "skipped" | "throttled" | "error" | "success";
    error?: string;
    latencyMs?: number;
  }>;
  finalProvider?: string;
  finalModel?: string;
};

/**
 * Thrown when every link in a task's chain has failed. Carries the trace so
 * the caller (e.g. the /api/paths route) can surface attempt-by-attempt
 * detail to the admin instead of just the last error.
 */
export class LLMChainError extends Error {
  constructor(
    message: string,
    public readonly trace: CallTrace,
  ) {
    super(message);
    this.name = "LLMChainError";
  }
}

export class LLMRouter {
  private providers: Map<string, Provider>;
  private throttle = new ThrottleTracker();
  // Active chains — start from defaults, mutate via admin panel.
  private chains: Record<TaskType, ChainEntry[]> = structuredClone(DEFAULT_CHAINS);

  constructor(providers: Provider[]) {
    this.providers = new Map(providers.map((p) => [p.name, p]));
  }

  /** Returns the active chain for a task — exposed for admin panel. */
  getChain(task: TaskType): ChainEntry[] {
    return [...this.chains[task]];
  }

  /** Replace a task's chain — used by admin panel. Validates entries exist. */
  setChain(task: TaskType, chain: ChainEntry[]): void {
    for (const e of chain) {
      const p = this.providers.get(e.provider);
      if (!p) throw new Error(`Unknown provider: ${e.provider}`);
      if (!p.models().find((m) => m.modelId === e.model)) {
        throw new Error(`Provider ${e.provider} does not offer model ${e.model}`);
      }
    }
    this.chains[task] = [...chain];
  }

  getAllChains(): Record<TaskType, ChainEntry[]> {
    return structuredClone(this.chains);
  }

  setAllChains(chains: Record<TaskType, ChainEntry[]>): void {
    for (const [task, chain] of Object.entries(chains) as [TaskType, ChainEntry[]][]) {
      this.setChain(task, chain);
    }
  }

  getProviderStatus(): Array<{
    name: string;
    enabled: boolean;
    throttled: boolean;
    models: { modelId: string; displayName: string }[];
  }> {
    return Array.from(this.providers.values()).map((p) => ({
      name: p.name,
      enabled: p.enabled,
      throttled: this.throttle.isThrottled(p.name),
      models: p.models().map((m) => ({ modelId: m.modelId, displayName: m.displayName })),
    }));
  }

  getThrottleSnapshot() {
    return this.throttle.snapshot();
  }

  /** Clear router-level throttle for one provider, or all if omitted. */
  clearThrottle(provider?: string): number {
    return this.throttle.clear(provider);
  }

  /**
   * Walk the chain for a task until something works. Records a trace for
   * observability — useful for the "which model ran this?" admin view.
   */
  async call(
    task: TaskType,
    req: LLMRequest,
  ): Promise<{ response: LLMResponse; trace: CallTrace }> {
    const chain = this.chains[task];
    if (!chain || chain.length === 0) {
      throw new Error(`No chain configured for task: ${task}`);
    }

    const trace: CallTrace = { task, attempts: [] };

    let lastErr: Error | null = null;
    for (const entry of chain) {
      const provider = this.providers.get(entry.provider);
      if (!provider || !provider.enabled) {
        trace.attempts.push({
          provider: entry.provider,
          model: entry.model,
          status: "skipped",
          error: provider ? "API key missing" : "provider not registered",
        });
        continue;
      }
      if (this.throttle.isThrottled(entry.provider)) {
        trace.attempts.push({
          provider: entry.provider,
          model: entry.model,
          status: "throttled",
        });
        continue;
      }

      try {
        const response = await provider.invoke({ ...req, task }, entry.model);
        // Optional post-call validator — lets callers reject empty/malformed
        // payloads that come back with a 200, so the chain falls through to
        // the next link instead of returning junk to the user.
        if (req.validate) {
          const reason = req.validate(response.content);
          if (reason) {
            trace.attempts.push({
              provider: entry.provider,
              model: entry.model,
              status: "error",
              error: `validation: ${reason}`.slice(0, 300),
              latencyMs: response.latencyMs,
            });
            lastErr = new Error(`Validation failed for ${entry.provider}/${entry.model}: ${reason}`);
            // Surface the raw payload (truncated) so we can see what the model
            // *did* return instead of just "no phases". This is the single
            // most useful diagnostic when the chain keeps failing validation.
            const rawSample = typeof response.raw === "string" ? response.raw.slice(0, 600) : null;
            logger.warn(
              { task, provider: entry.provider, model: entry.model, reason, rawSample },
              "LLM output rejected by validator; trying next",
            );
            continue;
          }
        }
        trace.attempts.push({
          provider: entry.provider,
          model: entry.model,
          status: "success",
          latencyMs: response.latencyMs,
        });
        trace.finalProvider = entry.provider;
        trace.finalModel = entry.model;
        logger.info(
          {
            task,
            provider: entry.provider,
            model: entry.model,
            latencyMs: response.latencyMs,
            attempts: trace.attempts.length,
          },
          "LLM call success",
        );
        return { response, trace };
      } catch (err) {
        if (err instanceof RateLimitError) {
          // Don't throttle the whole provider on a rate limit — Google/OpenRouter
          // quotas are per-model, so other entries in the chain can often still
          // succeed even when this one 429s. Just move on to the next link.
        } else if (err instanceof ProviderError && err.status === 401) {
          // Bad key — throttle for a long time to avoid spamming.
          this.throttle.mark(entry.provider, 3600, "auth failure");
        }
        const msg = err instanceof Error ? err.message : String(err);
        trace.attempts.push({
          provider: entry.provider,
          model: entry.model,
          status: "error",
          error: msg.slice(0, 300),
        });
        lastErr = err instanceof Error ? err : new Error(msg);
        logger.warn({ task, provider: entry.provider, model: entry.model, err: msg }, "LLM provider failed; trying next");
      }
    }

    logger.error({ task, trace }, "All providers in chain failed");
    const summary = lastErr?.message
      || trace.attempts
        .map((a) => `${a.provider}/${a.model}: ${a.status}${a.error ? ` (${a.error})` : ""}`)
        .join("; ")
      || "no providers configured";
    throw new LLMChainError(
      `All providers failed for task "${task}": ${summary}`,
      trace,
    );
  }
}

// Singleton — bootstrapped at app startup.
let _router: LLMRouter | null = null;

export function getRouter(): LLMRouter {
  if (!_router) {
    _router = new LLMRouter(loadProviders());
  }
  return _router;
}

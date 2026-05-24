/**
 * Provider-agnostic LLM types. All providers implement Provider<T>.
 */

export type Role = "system" | "user" | "assistant";

export type TextPart = { type: "text"; text: string };
export type ImagePart = { type: "image"; url?: string; base64?: string; mimeType?: string };
export type Part = TextPart | ImagePart;

export type Message = {
  role: Role;
  content: string | Part[];
};

export type LLMRequest = {
  messages: Message[];
  /** Optional JSON schema for structured output. */
  jsonSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
  /** Caller-provided tag for routing/telemetry. */
  task?: string;
  /**
   * Optional post-call validator. Runs after a provider returns a 2xx response
   * and the content has been (optionally) JSON-parsed. Return null/undefined
   * when the payload is acceptable, or a short error string to reject the
   * response and let the router fall through to the next chain link. Lets us
   * treat "model returned 200 but the JSON is empty/missing fields" as a
   * failure worth retrying rather than silently persisting garbage.
   */
  validate?: (content: unknown) => string | null | undefined;
};

export type LLMUsage = {
  inputTokens?: number;
  outputTokens?: number;
};

export type LLMResponse<T = string> = {
  /** When jsonSchema is provided, this is the parsed object; otherwise the raw text. */
  content: T;
  raw: string;
  provider: string;
  model: string;
  usage?: LLMUsage;
  latencyMs: number;
};

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly status?: number,
    public readonly retryable: boolean = false,
    public readonly retryAfterSec?: number,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export class RateLimitError extends ProviderError {
  constructor(provider: string, retryAfterSec = 60, status = 429) {
    super(`Rate limited: ${provider}`, provider, status, true, retryAfterSec);
    this.name = "RateLimitError";
  }
}

/**
 * Capability advertised by a provider's model entry. The router uses these to
 * pick providers per task without hardcoding model strings in business logic.
 */
export type Capability =
  | "text"           // basic text generation
  | "json"           // structured JSON output
  | "vision"         // multimodal image input
  | "video"          // multimodal video input
  | "long-context"   // >100K context window
  | "reasoning"      // chain-of-thought / advanced reasoning
  | "fast";          // optimized for low latency

export type ProviderModelSpec = {
  /** Provider-specific model id, e.g. "google/gemma-3-27b-it". */
  modelId: string;
  /** Friendly name for UI/telemetry, e.g. "Gemma 4 27B". */
  displayName: string;
  capabilities: Capability[];
  /** Approximate context window. */
  contextWindow?: number;
};

export interface Provider {
  readonly name: string;
  readonly enabled: boolean;
  invoke(req: LLMRequest, modelId: string): Promise<LLMResponse>;
  /** Models offered by this provider. */
  models(): ProviderModelSpec[];
}

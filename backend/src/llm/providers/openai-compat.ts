import {
  Provider,
  ProviderError,
  ProviderModelSpec,
  RateLimitError,
  LLMRequest,
  LLMResponse,
  Message,
  Part,
} from "../types.js";
import { getCredentialStore } from "../credentialStore.js";

/**
 * Generic OpenAI-Chat-Compatible provider. Reused for OpenRouter, Groq,
 * Cerebras, Together AI, OpenAI, and anything else that speaks
 * /v1/chat/completions.
 *
 * Multi-key: like GoogleProvider, this asks the credential store for all
 * enabled keys for `this.name` and rotates through them on 401/429.
 *
 * baseURL: comes from per-credential metadata if provided (`metadata.baseURL`),
 * else falls back to the constructor default. That lets the admin point a
 * single "openai" service entry at a custom proxy without redeploying.
 */
export class OpenAICompatProvider implements Provider {
  constructor(
    public readonly name: string,
    private readonly defaultBaseURL: string,
    private readonly modelSpecs: ProviderModelSpec[],
    private readonly extraHeaders: Record<string, string> = {},
  ) {}

  get enabled(): boolean {
    return getCredentialStore().hasUsable(this.name);
  }

  models(): ProviderModelSpec[] {
    return this.modelSpecs;
  }

  async invoke(req: LLMRequest, modelId: string): Promise<LLMResponse> {
    const store = getCredentialStore();
    const candidates = store.candidatesFor(this.name);
    if (candidates.length === 0) {
      throw new ProviderError(`No usable credentials for ${this.name}`, this.name);
    }

    const body = {
      model: modelId,
      messages: req.messages.map((m) => this.normalizeMessage(m)),
      temperature: req.temperature ?? 0.7,
      max_tokens: req.maxTokens ?? 4096,
      ...(req.jsonSchema ? { response_format: { type: "json_object" } } : {}),
    };
    const bodyStr = JSON.stringify(body);
    let lastErr: Error | null = null;

    for (const cred of candidates) {
      const baseURL = (cred.metadata?.baseURL as string) || this.defaultBaseURL;
      const start = Date.now();
      try {
        const res = await fetch(`${baseURL.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${cred.key}`,
            ...this.extraHeaders,
            ...((cred.metadata?.headers as Record<string, string>) || {}),
          },
          body: bodyStr,
        });

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("retry-after") || "60", 10);
          store.throttle(cred.id, retryAfter, "rate limit");
          await store.markFailure(cred.id, `429 (label=${cred.label})`);
          lastErr = new RateLimitError(this.name, retryAfter);
          continue;
        }
        if (res.status === 401 || res.status === 403) {
          const text = await res.text();
          store.throttle(cred.id, 3600, "auth failure");
          await store.markFailure(cred.id, `${res.status} (label=${cred.label})`);
          lastErr = new ProviderError(
            `${this.name} auth failure on key "${cred.label}": ${text.slice(0, 200)}`,
            this.name,
            res.status,
          );
          continue;
        }
        if (!res.ok) {
          const text = await res.text();
          await store.markFailure(cred.id, `${res.status}: ${text.slice(0, 100)}`);
          throw new ProviderError(
            `${this.name} ${modelId} ${res.status}: ${text.slice(0, 500)}`,
            this.name,
            res.status,
            res.status >= 500,
          );
        }

        const data = (await res.json()) as OpenAIResponse;
        const text = data.choices?.[0]?.message?.content || "";
        const latencyMs = Date.now() - start;

        let content: unknown = text;
        if (req.jsonSchema) content = this.parseJSON(text);

        await store.markSuccess(cred.id);

        return {
          content: content as string,
          raw: text,
          provider: this.name,
          model: modelId,
          latencyMs,
          usage: {
            inputTokens: data.usage?.prompt_tokens,
            outputTokens: data.usage?.completion_tokens,
          },
        };
      } catch (err) {
        if (err instanceof RateLimitError || err instanceof ProviderError) {
          lastErr = err;
          continue;
        }
        await store.markFailure(cred.id, (err as Error).message || "unknown");
        lastErr = err as Error;
        continue;
      }
    }

    throw lastErr || new ProviderError(`All ${this.name} credentials failed`, this.name);
  }

  private normalizeMessage(m: Message): { role: string; content: unknown } {
    if (typeof m.content === "string") return { role: m.role, content: m.content };
    return {
      role: m.role,
      content: m.content.map((p) => this.partToOpenAI(p)),
    };
  }

  private partToOpenAI(p: Part): unknown {
    if (p.type === "text") return { type: "text", text: p.text };
    if (p.base64) {
      return {
        type: "image_url",
        image_url: { url: `data:${p.mimeType || "image/jpeg"};base64,${p.base64}` },
      };
    }
    return { type: "image_url", image_url: { url: p.url || "" } };
  }

  private parseJSON(text: string): unknown {
    try {
      return JSON.parse(text);
    } catch {
      const start = text.indexOf("{");
      const end = text.lastIndexOf("}");
      if (start !== -1 && end > start) {
        try {
          return JSON.parse(text.slice(start, end + 1));
        } catch {
          // fall through
        }
      }
      throw new ProviderError(
        `Failed to parse JSON from ${this.name}: ${text.slice(0, 200)}`,
        this.name,
      );
    }
  }
}

type OpenAIResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

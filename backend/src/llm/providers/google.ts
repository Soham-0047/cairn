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
 * Google AI Studio provider — covers both Gemma 4 (open) and Gemini (closed).
 * Same REST endpoint, model id determines which runs.
 *
 * Multi-key: the provider asks the credential store for all enabled keys
 * registered against service "google" and tries them in priority order. A 401
 * or 429 marks just that key as bad/throttled, so a single revoked key does
 * not knock the entire provider out of rotation.
 *
 * Docs: https://ai.google.dev/api/generate-content
 */
export class GoogleProvider implements Provider {
  readonly name = "google";

  get enabled(): boolean {
    return getCredentialStore().hasUsable(this.name);
  }

  models(): ProviderModelSpec[] {
    return [
      // Gemma 4 family — open models served via Gemini API (Apache 2.0).
      // See https://www.philschmid.de/gemma-4-gemini-api
      {
        modelId: "gemma-4-31b-it",
        displayName: "Gemma 4 31B",
        capabilities: ["text", "vision", "video", "json", "reasoning", "long-context"],
        contextWindow: 256_000,
      },
      {
        modelId: "gemma-4-26b-a4b-it",
        displayName: "Gemma 4 26B MoE (A4B)",
        capabilities: ["text", "vision", "video", "json", "reasoning", "long-context", "fast"],
        contextWindow: 256_000,
      },
      // Gemma 3 family — still available, used as fallback if Gemma 4 isn't
      // enabled for the key/region yet.
      {
        modelId: "gemma-3-1b-it",
        displayName: "Gemma 3 1B",
        capabilities: ["text", "fast"],
        contextWindow: 32_000,
      },
      {
        modelId: "gemma-3-4b-it",
        displayName: "Gemma 3 4B",
        capabilities: ["text", "vision", "fast"],
        contextWindow: 128_000,
      },
      {
        modelId: "gemma-3-12b-it",
        displayName: "Gemma 3 12B",
        capabilities: ["text", "vision", "reasoning"],
        contextWindow: 128_000,
      },
      {
        modelId: "gemma-3-27b-it",
        displayName: "Gemma 3 27B",
        capabilities: ["text", "vision", "reasoning", "long-context"],
        contextWindow: 128_000,
      },
      // Gemma 4 — Apache-licensed, served via the Gemini API. Free-tier limits
      // (per the project's reference_rate-limit.txt): 15 RPM, unlimited TPM,
      // 1.5K RPD. By far the most generous free-tier quota in the catalog, so
      // these lead the routing chains.
      {
        modelId: "gemma-4-31b-it",
        displayName: "Gemma 4 31B",
        capabilities: ["text", "vision", "json", "reasoning", "long-context"],
        contextWindow: 128_000,
      },
      {
        modelId: "gemma-4-26b-a4b-it",
        displayName: "Gemma 4 26B (A4B MoE)",
        capabilities: ["text", "vision", "json", "reasoning", "long-context", "fast"],
        contextWindow: 128_000,
      },
      // Gemini Flash family (free tier RPM in parens):
      //   gemini-2.5-flash       — 5 RPM, 250K TPM, 20 RPD
      //   gemini-2.5-flash-lite  — 10 RPM, 250K TPM, 20 RPD
      //   gemini-3.1-flash-lite  — 15 RPM, 250K TPM, 500 RPD (highest RPM)
      //   gemini-3-flash         — 5 RPM, 250K TPM, 20 RPD
      //   gemini-3.5-flash       — 5 RPM, 250K TPM, 20 RPD
      // Pro variants are 0/0/0 on free tier — explicitly excluded.
      {
        modelId: "gemini-3.1-flash-lite",
        displayName: "Gemini 3.1 Flash Lite",
        capabilities: ["text", "json", "vision", "fast"],
        contextWindow: 1_000_000,
      },
      {
        modelId: "gemini-2.5-flash-lite",
        displayName: "Gemini 2.5 Flash Lite",
        capabilities: ["text", "json", "vision", "fast"],
        contextWindow: 1_000_000,
      },
      {
        modelId: "gemini-2.5-flash",
        displayName: "Gemini 2.5 Flash",
        capabilities: ["text", "json", "vision", "fast"],
        contextWindow: 1_000_000,
      },
      {
        modelId: "gemini-3-flash",
        displayName: "Gemini 3 Flash",
        capabilities: ["text", "json", "vision", "fast"],
        contextWindow: 1_000_000,
      },
      {
        modelId: "gemini-3.5-flash",
        displayName: "Gemini 3.5 Flash",
        capabilities: ["text", "json", "vision", "fast"],
        contextWindow: 1_000_000,
      },
    ];
  }

  async invoke(req: LLMRequest, modelId: string): Promise<LLMResponse> {
    const store = getCredentialStore();
    const candidates = store.candidatesFor(this.name);
    if (candidates.length === 0) {
      throw new ProviderError(`No usable credentials for ${this.name}`, this.name);
    }

    const body = this.buildBody(req, modelId);
    let lastErr: Error | null = null;

    for (const cred of candidates) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(cred.key)}`;
      const start = Date.now();
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (res.status === 429) {
          // Google's free-tier RPM quotas are per-model, not per-key. If one
          // model 429s, *other* models on the same key are usually still
          // good — so we do NOT throttle the credential globally here.
          // We mark the failure for telemetry and bubble a RateLimitError;
          // the router's chain will move to the next model entry and try
          // again with the same key on a different model.
          const retryAfter = parseInt(res.headers.get("retry-after") || "30", 10);
          await store.markFailure(cred.id, `429 ${modelId} (label=${cred.label})`);
          lastErr = new RateLimitError(this.name, Math.min(retryAfter, 30));
          continue; // try next key
        }
        if (res.status === 401 || res.status === 403) {
          const text = await res.text();
          store.throttle(cred.id, 3600, "auth failure");
          await store.markFailure(cred.id, `${res.status} (label=${cred.label})`);
          lastErr = new ProviderError(
            `Google auth failure on key "${cred.label}": ${text.slice(0, 200)}`,
            this.name,
            res.status,
          );
          continue;
        }
        if (!res.ok) {
          const text = await res.text();
          await store.markFailure(cred.id, `${res.status}: ${text.slice(0, 100)}`);
          throw new ProviderError(
            `Google ${modelId} ${res.status}: ${text.slice(0, 500)}`,
            this.name,
            res.status,
            res.status >= 500,
          );
        }

        const data = (await res.json()) as GoogleResponse;
        const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        const latencyMs = Date.now() - start;

        let parsed: unknown = text;
        if (req.jsonSchema) parsed = this.extractJSON(text);

        await store.markSuccess(cred.id);

        return {
          content: parsed as string,
          raw: text,
          provider: this.name,
          model: modelId,
          latencyMs,
          usage: {
            inputTokens: data.usageMetadata?.promptTokenCount,
            outputTokens: data.usageMetadata?.candidatesTokenCount,
          },
        };
      } catch (err) {
        if (err instanceof RateLimitError) {
          lastErr = err;
          continue; // try next key
        }
        if (err instanceof ProviderError) {
          // FIX 1: Non-retryable errors (e.g. 400 Bad Request) should bubble
          // immediately — there is no point trying other keys for a request
          // that is malformed or otherwise categorically rejected.
          if (!err.retryable) throw err;
          lastErr = err;
          continue; // retryable 5xx — try next key
        }
        // Network / unexpected errors: mark the credential and try the next key.
        await store.markFailure(cred.id, (err as Error).message || "unknown");
        lastErr = err as Error;
        continue;
      }
    }

    throw lastErr || new ProviderError(`All ${this.name} credentials failed`, this.name);
  }

  private buildBody(req: LLMRequest, modelId: string): GoogleRequest {
    const systemMsg = req.messages.find((m) => m.role === "system");
    const others = req.messages.filter((m) => m.role !== "system");

    // Gemini 2.5+/3.x models use "thinking" tokens that come out of the same
    // maxOutputTokens budget. For our structured-output tasks the thinking is
    // wasted spend — and on Flash Lite with a small budget it consumes the
    // entire allotment and returns a single "{". Disable it explicitly.
    const supportsThinking = /gemini-(2\.5|3(?:\.|$))/.test(modelId);

    return {
      contents: others.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: this.partsFor(m),
      })),
      systemInstruction: systemMsg
        ? { role: "user", parts: this.partsFor(systemMsg) }
        : undefined,
      generationConfig: {
        temperature: req.temperature ?? 0.7,
        maxOutputTokens: req.maxTokens ?? 4096,
        ...(supportsThinking ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
        // Only enable JSON mode if the caller passed a *meaningful* schema.
        // Passing `{type: "object"}` with no required properties lets the
        // model return `{}` and satisfy the constraint — that's why every
        // attempt came back with "no phases". Without a real schema we just
        // request the JSON MIME type and let the prompt define the shape.
        ...(req.jsonSchema
          ? hasMeaningfulSchema(req.jsonSchema)
            ? { responseMimeType: "application/json", responseSchema: req.jsonSchema }
            : { responseMimeType: "application/json" }
          : {}),
      },
    };
  }

  private partsFor(m: Message): GooglePart[] {
    if (typeof m.content === "string") return [{ text: m.content }];
    return m.content.map((p) => this.partFor(p));
  }

  private partFor(p: Part): GooglePart {
    if (p.type === "text") return { text: p.text };
    if (p.base64) {
      return {
        inlineData: {
          mimeType: p.mimeType || "image/jpeg",
          data: p.base64,
        },
      };
    }
    // FIX 2: URL-only media parts should use fileData so the API can fetch
    // them, not degrade silently to a text placeholder.
    if (p.url) {
      return {
        fileData: {
          mimeType: p.mimeType || "image/jpeg",
          fileUri: p.url,
        },
      };
    }
    return { text: "[image: missing url and base64]" };
  }

  private extractJSON(text: string): unknown {
    const trimmed = text.trim();
    try {
      return JSON.parse(trimmed);
    } catch {
      // FIX 3: Also handle top-level JSON arrays ([…]), not just objects ({…}).
      const firstBrace = trimmed.indexOf("{");
      const firstBracket = trimmed.indexOf("[");
      const isObject = firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket);

      if (isObject) {
        const end = trimmed.lastIndexOf("}");
        if (end > firstBrace) {
          try {
            return JSON.parse(trimmed.slice(firstBrace, end + 1));
          } catch {
            // fall through
          }
        }
      } else if (firstBracket !== -1) {
        const end = trimmed.lastIndexOf("]");
        if (end > firstBracket) {
          try {
            return JSON.parse(trimmed.slice(firstBracket, end + 1));
          } catch {
            // fall through
          }
        }
      }

      throw new ProviderError(
        `Failed to parse JSON from Google response: ${trimmed.slice(0, 200)}`,
        this.name,
      );
    }
  }
}

/** A schema is "meaningful" if it constrains shape beyond `{type: "object"}`. */
function hasMeaningfulSchema(schema: Record<string, unknown>): boolean {
  if (!schema || typeof schema !== "object") return false;
  if (schema.properties && typeof schema.properties === "object") return true;
  if (Array.isArray(schema.required) && schema.required.length > 0) return true;
  if (Array.isArray(schema.items)) return true;
  if (schema.items && typeof schema.items === "object") return true;
  return false;
}

type GoogleRequest = {
  contents: { role: "user" | "model"; parts: GooglePart[] }[];
  systemInstruction?: { role: "user"; parts: GooglePart[] };
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseSchema?: Record<string, unknown>;
    thinkingConfig?: { thinkingBudget?: number };
  };
};

type GooglePart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }
  | { fileData: { mimeType: string; fileUri: string } }; // FIX 2: added missing union member

type GoogleResponse = {
  candidates?: {
    content?: { parts?: { text?: string }[] };
  }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
};
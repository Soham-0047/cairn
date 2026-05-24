import { env } from "../../config/env.js";
import { GoogleProvider } from "./google.js";
import { OpenAICompatProvider } from "./openai-compat.js";
import { getCredentialStore } from "../credentialStore.js";
import { Provider, ProviderModelSpec } from "../types.js";
import { logger } from "../../utils/logger.js";

/**
 * Provider catalog. Each entry knows its default endpoint + the models it
 * offers. Actual API keys live in the credential vault (admin panel), so this
 * file is purely about wiring providers to their HTTP shape and model lists.
 *
 * To swap providers post-hackathon (e.g. when participating in a Llama or
 * Qwen challenge), edit this file only — business logic doesn't care which
 * provider answers, just which `task` it's calling.
 */

const openRouterModels: ProviderModelSpec[] = [
  {
    modelId: "google/gemma-3-27b-it:free",
    displayName: "Gemma 4 27B (OpenRouter free)",
    capabilities: ["text", "vision", "reasoning", "long-context"],
    contextWindow: 128_000,
  },
  {
    modelId: "google/gemma-3-12b-it:free",
    displayName: "Gemma 4 12B (OpenRouter free)",
    capabilities: ["text", "vision", "reasoning"],
    contextWindow: 128_000,
  },
  {
    modelId: "google/gemma-3-4b-it:free",
    displayName: "Gemma 4 4B (OpenRouter free)",
    capabilities: ["text", "vision", "fast"],
    contextWindow: 128_000,
  },
  {
    modelId: "meta-llama/llama-3.3-70b-instruct:free",
    displayName: "Llama 3.3 70B Instruct (OpenRouter free)",
    capabilities: ["text", "reasoning", "long-context"],
    contextWindow: 128_000,
  },
  {
    modelId: "deepseek/deepseek-r1:free",
    displayName: "DeepSeek R1 (OpenRouter free)",
    capabilities: ["text", "reasoning", "long-context"],
    contextWindow: 128_000,
  },
  {
    modelId: "qwen/qwen-2.5-72b-instruct:free",
    displayName: "Qwen 2.5 72B Instruct (OpenRouter free)",
    capabilities: ["text", "reasoning", "long-context"],
    contextWindow: 128_000,
  },
];

const groqModels: ProviderModelSpec[] = [
  {
    modelId: "gemma2-9b-it",
    displayName: "Gemma 9B (Groq fast)",
    capabilities: ["text", "fast"],
    contextWindow: 8_192,
  },
  {
    modelId: "llama-3.3-70b-versatile",
    displayName: "Llama 3.3 70B (Groq fast)",
    capabilities: ["text", "reasoning", "fast"],
    contextWindow: 128_000,
  },
];

const cerebrasModels: ProviderModelSpec[] = [
  {
    modelId: "llama3.1-8b",
    displayName: "Llama 3.1 8B (Cerebras fast)",
    capabilities: ["text", "fast"],
    contextWindow: 8_192,
  },
  {
    modelId: "llama-3.3-70b",
    displayName: "Llama 3.3 70B (Cerebras fast)",
    capabilities: ["text", "reasoning", "fast"],
    contextWindow: 128_000,
  },
];

const togetherModels: ProviderModelSpec[] = [
  {
    modelId: "google/gemma-2-27b-it",
    displayName: "Gemma 2 27B (Together)",
    capabilities: ["text", "reasoning"],
    contextWindow: 8_192,
  },
  {
    modelId: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    displayName: "Llama 3.3 70B (Together free)",
    capabilities: ["text", "reasoning"],
    contextWindow: 128_000,
  },
];

export function loadProviders(): Provider[] {
  return [
    new GoogleProvider(),
    new OpenAICompatProvider("openrouter", "https://openrouter.ai/api/v1", openRouterModels, {
      "HTTP-Referer": env.FRONTEND_URL,
      "X-Title": "Cairn",
    }),
    new OpenAICompatProvider("groq", "https://api.groq.com/openai/v1", groqModels),
    new OpenAICompatProvider("cerebras", "https://api.cerebras.ai/v1", cerebrasModels),
    new OpenAICompatProvider("together", "https://api.together.xyz/v1", togetherModels),
  ];
}

/** Service → display metadata for the admin credentials page. */
export const SERVICE_CATALOG: Array<{
  service: string;
  kind: "llm" | "image" | "content" | "embedding" | "oauth" | "storage" | "other";
  displayName: string;
  baseURL?: string;
  docsUrl: string;
}> = [
  { service: "google", kind: "llm", displayName: "Google AI Studio (Gemma / Gemini)", docsUrl: "https://aistudio.google.com/app/apikey" },
  { service: "openrouter", kind: "llm", displayName: "OpenRouter", baseURL: "https://openrouter.ai/api/v1", docsUrl: "https://openrouter.ai/keys" },
  { service: "groq", kind: "llm", displayName: "Groq", baseURL: "https://api.groq.com/openai/v1", docsUrl: "https://console.groq.com/keys" },
  { service: "cerebras", kind: "llm", displayName: "Cerebras", baseURL: "https://api.cerebras.ai/v1", docsUrl: "https://cloud.cerebras.ai" },
  { service: "together", kind: "llm", displayName: "Together AI", baseURL: "https://api.together.xyz/v1", docsUrl: "https://api.together.xyz/settings/api-keys" },
  // Examples of services that can be added via admin UI without code changes:
  { service: "openai", kind: "llm", displayName: "OpenAI", baseURL: "https://api.openai.com/v1", docsUrl: "https://platform.openai.com/api-keys" },
  { service: "anthropic", kind: "llm", displayName: "Anthropic", docsUrl: "https://console.anthropic.com/settings/keys" },
  { service: "unsplash", kind: "image", displayName: "Unsplash (images)", docsUrl: "https://unsplash.com/developers" },
  { service: "pexels", kind: "image", displayName: "Pexels (images)", docsUrl: "https://www.pexels.com/api/" },
  { service: "github", kind: "oauth", displayName: "GitHub (PAT / OAuth)", docsUrl: "https://github.com/settings/tokens" },
];

/**
 * On boot, migrate keys from the legacy env vars into the credential vault.
 * Idempotent — re-running just refreshes the encrypted blob.
 */
export async function seedEnvCredentials(): Promise<void> {
  const store = getCredentialStore();
  const pairs: Array<{ service: string; key: string; kind: "llm" }> = [
    { service: "google", key: env.GOOGLE_AI_API_KEY, kind: "llm" },
    { service: "openrouter", key: env.OPENROUTER_API_KEY, kind: "llm" },
    { service: "groq", key: env.GROQ_API_KEY, kind: "llm" },
    { service: "cerebras", key: env.CEREBRAS_API_KEY, kind: "llm" },
    { service: "together", key: env.TOGETHER_API_KEY, kind: "llm" },
  ];
  for (const p of pairs) {
    if (!p.key) continue;
    try {
      await store.seedFromEnv({
        service: p.service,
        kind: p.kind,
        label: "Seeded from .env",
        apiKey: p.key,
      });
    } catch (err) {
      logger.warn({ service: p.service, err: (err as Error).message }, "Env seed failed");
    }
  }
}

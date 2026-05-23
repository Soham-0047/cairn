// Service catalog — list of known APIs the admin UI can offer as templates.
// Add new entries here and they appear in the "Add credential" dropdown.

export type ServiceMeta = {
  service: string;
  kind: "llm" | "image" | "content" | "embedding" | "oauth" | "storage" | "other";
  displayName: string;
  baseURL?: string;
  docsUrl?: string;
};

export const SERVICE_CATALOG: ServiceMeta[] = [
  { service: "google", kind: "llm", displayName: "Google AI (Gemini)", docsUrl: "https://aistudio.google.com/app/apikey" },
  { service: "openai", kind: "llm", displayName: "OpenAI", baseURL: "https://api.openai.com/v1", docsUrl: "https://platform.openai.com/api-keys" },
  { service: "anthropic", kind: "llm", displayName: "Anthropic", baseURL: "https://api.anthropic.com/v1", docsUrl: "https://console.anthropic.com/settings/keys" },
  { service: "openrouter", kind: "llm", displayName: "OpenRouter", baseURL: "https://openrouter.ai/api/v1", docsUrl: "https://openrouter.ai/keys" },
  { service: "groq", kind: "llm", displayName: "Groq", baseURL: "https://api.groq.com/openai/v1", docsUrl: "https://console.groq.com/keys" },
  { service: "cerebras", kind: "llm", displayName: "Cerebras", baseURL: "https://api.cerebras.ai/v1", docsUrl: "https://cloud.cerebras.ai/" },
  { service: "together", kind: "llm", displayName: "Together AI", baseURL: "https://api.together.xyz/v1", docsUrl: "https://api.together.xyz/settings/api-keys" },

  { service: "unsplash", kind: "image", displayName: "Unsplash", docsUrl: "https://unsplash.com/oauth/applications" },
  { service: "pexels", kind: "image", displayName: "Pexels", docsUrl: "https://www.pexels.com/api/" },

  { service: "exa", kind: "content", displayName: "Exa.ai (web search)", docsUrl: "https://dashboard.exa.ai/" },
  { service: "tavily", kind: "content", displayName: "Tavily (web search)", docsUrl: "https://tavily.com/" },

  { service: "github", kind: "oauth", displayName: "GitHub", docsUrl: "https://github.com/settings/developers" },
  { service: "resend", kind: "other", displayName: "Resend (email)", docsUrl: "https://resend.com/api-keys" },
];

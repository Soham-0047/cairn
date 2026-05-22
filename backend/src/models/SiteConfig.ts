import { Schema, model, InferSchemaType, Types } from "mongoose";

/**
 * Single-document config blob. The admin panel mutates this; the frontend
 * fetches it at request time. Switch every text, logo, color, and AI provider
 * mapping from here without redeploying.
 *
 * Designed for portability across hackathons — when this product participates
 * in a different challenge (Llama, Qwen, Mistral), seed a different config
 * with different brand + chains.
 */

const chainEntrySchema = new Schema(
  { provider: String, model: String },
  { _id: false },
);

const siteConfigSchema = new Schema(
  {
    /** Singleton key — always "default". */
    key: { type: String, default: "default", unique: true, index: true },

    brand: {
      name: { type: String, default: "Cairn" },
      tagline: { type: String, default: "Your AI learning + career engine" },
      logoUrl: { type: String, default: "/logo.svg" },
      faviconUrl: { type: String, default: "/favicon.ico" },
      primaryColor: { type: String, default: "#0f766e" }, // teal-700
      accentColor: { type: String, default: "#f59e0b" },  // amber-500
    },

    /** Hero/landing copy. */
    copy: {
      heroTitle: { type: String, default: "Your AI-built path from where you are to where you want to be." },
      heroSubtitle: {
        type: String,
        default:
          "Cairn turns the internet's chaos of free tutorials into a 90-day path that adapts to your starting point, verifies your projects, and builds a recruiter-ready portfolio.",
      },
      heroCtaPrimary: { type: String, default: "Start your path" },
      heroCtaSecondary: { type: String, default: "See an example portfolio" },
      footerNote: { type: String, default: "Built for the Gemma 4 Challenge — May 2026." },
      poweredByLabel: { type: String, default: "Powered by Gemma 4" },
    },

    /** Free-form UI strings keyed by slug. The admin panel edits these. */
    strings: { type: Map, of: String, default: () => new Map<string, string>() },

    /** Feature flags. */
    features: {
      multimodalEval: { type: Boolean, default: true },
      adaptiveQuiz: { type: Boolean, default: true },
      coachNudges: { type: Boolean, default: false },
      jobFeed: { type: Boolean, default: false },
      showAttribution: { type: Boolean, default: true },
    },

    /**
     * Guest mode — lets visitors try the product without GitHub OAuth. Crucial
     * for hackathon demo: judges click "Try as guest" and get the full flow.
     * Limits are admin-controlled to prevent abuse.
     */
    guestMode: {
      enabled: { type: Boolean, default: true },
      maxPathsPerGuest: { type: Number, default: 1 },
      maxEvalsPerGuest: { type: Number, default: 2 },
      maxEvalsPerDayGlobal: { type: Number, default: 200 },
      maxGuestsPerDayGlobal: { type: Number, default: 500 },
      /** Hours until a guest account auto-expires (cleanup-time). */
      sessionHours: { type: Number, default: 24 },
      /** Disable screenshot uploads for guests (cost control). */
      allowScreenshots: { type: Boolean, default: true },
      bannerText: {
        type: String,
        default: "You're trying Cairn as a guest. Sign in with GitHub to save your progress and earn verified credentials.",
      },
    },

    /** Per-task LLM chain. Admin can reorder providers/models without redeploying. */
    llmChains: {
      type: Map,
      of: [chainEntrySchema],
      default: () => new Map(),
    },

    /** Tokens-per-month soft ceilings for cost-control. */
    monthlyTokenCeilings: {
      type: Map,
      of: Number,
      default: () => new Map<string, number>(),
    },

    /** SEO / OG. */
    seo: {
      title: { type: String, default: "Cairn — AI-personalized learning paths" },
      description: { type: String, default: "Personalized 90-day learning paths verified by AI. Built for aspiring developers." },
      ogImageUrl: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export type SiteConfigDoc = InferSchemaType<typeof siteConfigSchema> & { _id: Types.ObjectId };

export const SiteConfig = model("SiteConfig", siteConfigSchema);

export type GuestModeConfig = {
  enabled: boolean;
  maxPathsPerGuest: number;
  maxEvalsPerGuest: number;
  maxEvalsPerDayGlobal: number;
  maxGuestsPerDayGlobal: number;
  sessionHours: number;
  allowScreenshots: boolean;
  bannerText: string;
};

const GUEST_DEFAULTS: GuestModeConfig = {
  enabled: true,
  maxPathsPerGuest: 1,
  maxEvalsPerGuest: 2,
  maxEvalsPerDayGlobal: 200,
  maxGuestsPerDayGlobal: 500,
  sessionHours: 24,
  allowScreenshots: true,
  bannerText:
    "You're trying Cairn as a guest. Sign in with GitHub to save your progress and earn verified credentials.",
};

/** Ensure a singleton exists; returns it with guest-mode defaults guaranteed. */
export async function getOrCreateSiteConfig(): Promise<SiteConfigDoc & { guestMode: GuestModeConfig }> {
  const existing = await SiteConfig.findOne({ key: "default" });
  const doc = existing ?? (await SiteConfig.create({ key: "default" }));
  const obj = doc.toObject() as SiteConfigDoc & { guestMode?: Partial<GuestModeConfig> };
  return {
    ...obj,
    guestMode: { ...GUEST_DEFAULTS, ...(obj.guestMode || {}) },
  };
}

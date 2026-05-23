import { Schema, model, InferSchemaType, Types } from "mongoose";

// Per-product site config. The admin service supports MANY consumer products
// — one config singleton per `key`. Consumer projects pass ?key=<their-id> to
// /public/config, or use the default singleton.

const chainEntrySchema = new Schema(
  { provider: String, model: String },
  { _id: false },
);

const siteConfigSchema = new Schema(
  {
    key: { type: String, default: "default", unique: true, index: true },

    brand: {
      name: { type: String, default: "App" },
      tagline: { type: String, default: "" },
      logoUrl: { type: String, default: "" },
      faviconUrl: { type: String, default: "" },
      primaryColor: { type: String, default: "#0f766e" },
      accentColor: { type: String, default: "#f59e0b" },
    },

    copy: {
      heroTitle: { type: String, default: "" },
      heroSubtitle: { type: String, default: "" },
      heroCtaPrimary: { type: String, default: "" },
      heroCtaSecondary: { type: String, default: "" },
      footerNote: { type: String, default: "" },
      poweredByLabel: { type: String, default: "" },
    },

    strings: { type: Map, of: String, default: () => new Map<string, string>() },

    features: { type: Schema.Types.Mixed, default: {} },

    guestMode: {
      enabled: { type: Boolean, default: true },
      maxPathsPerGuest: { type: Number, default: 1 },
      maxEvalsPerGuest: { type: Number, default: 2 },
      maxEvalsPerDayGlobal: { type: Number, default: 200 },
      maxGuestsPerDayGlobal: { type: Number, default: 500 },
      sessionHours: { type: Number, default: 24 },
      allowScreenshots: { type: Boolean, default: true },
      bannerText: { type: String, default: "" },
    },

    llmChains: { type: Map, of: [chainEntrySchema], default: () => new Map() },
    monthlyTokenCeilings: { type: Map, of: Number, default: () => new Map<string, number>() },

    seo: {
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      ogImageUrl: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export type SiteConfigDoc = InferSchemaType<typeof siteConfigSchema> & { _id: Types.ObjectId };

export const SiteConfig = model("SiteConfig", siteConfigSchema);

export async function getOrCreateSiteConfig(key = "default"): Promise<SiteConfigDoc> {
  const existing = await SiteConfig.findOne({ key });
  if (existing) return existing.toObject() as SiteConfigDoc;
  const fresh = await SiteConfig.create({ key });
  return fresh.toObject() as SiteConfigDoc;
}

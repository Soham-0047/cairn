import { Router } from "express";
import { z } from "zod";
import { SiteConfig, getOrCreateSiteConfig } from "../../models/SiteConfig.js";

const router = Router();

router.get("/", async (_req, res) => {
  const cfg = await getOrCreateSiteConfig();
  res.json(cfg);
});

const brandSchema = z.object({
  name: z.string().optional(),
  tagline: z.string().optional(),
  logoUrl: z.string().optional(),
  faviconUrl: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  accentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
});
const copySchema = z.object({
  heroTitle: z.string().optional(),
  heroSubtitle: z.string().optional(),
  heroCtaPrimary: z.string().optional(),
  heroCtaSecondary: z.string().optional(),
  footerNote: z.string().optional(),
  poweredByLabel: z.string().optional(),
});
const seoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ogImageUrl: z.string().optional(),
});
const featuresSchema = z.object({
  multimodalEval: z.boolean().optional(),
  adaptiveQuiz: z.boolean().optional(),
  coachNudges: z.boolean().optional(),
  jobFeed: z.boolean().optional(),
  showAttribution: z.boolean().optional(),
});

const guestModeSchema = z.object({
  enabled: z.boolean().optional(),
  maxPathsPerGuest: z.number().int().min(0).max(50).optional(),
  maxEvalsPerGuest: z.number().int().min(0).max(50).optional(),
  maxEvalsPerDayGlobal: z.number().int().min(0).max(10_000).optional(),
  maxGuestsPerDayGlobal: z.number().int().min(0).max(10_000).optional(),
  sessionHours: z.number().int().min(1).max(720).optional(),
  allowScreenshots: z.boolean().optional(),
  bannerText: z.string().max(300).optional(),
});

const patchSchema = z.object({
  brand: brandSchema.optional(),
  copy: copySchema.optional(),
  seo: seoSchema.optional(),
  features: featuresSchema.optional(),
  strings: z.record(z.string()).optional(),
  guestMode: guestModeSchema.optional(),
});

/**
 * PATCH /admin/config — partial update. Pass only the fields you want to change.
 * Supports nested updates via dot-notation construction below.
 */
router.patch("/", async (req, res) => {
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const data = parse.data;

  const set: Record<string, unknown> = {};
  if (data.brand) {
    for (const [k, v] of Object.entries(data.brand)) {
      if (v !== undefined) set[`brand.${k}`] = v;
    }
  }
  if (data.copy) {
    for (const [k, v] of Object.entries(data.copy)) {
      if (v !== undefined) set[`copy.${k}`] = v;
    }
  }
  if (data.seo) {
    for (const [k, v] of Object.entries(data.seo)) {
      if (v !== undefined) set[`seo.${k}`] = v;
    }
  }
  if (data.features) {
    for (const [k, v] of Object.entries(data.features)) {
      if (v !== undefined) set[`features.${k}`] = v;
    }
  }
  if (data.strings) {
    for (const [k, v] of Object.entries(data.strings)) {
      set[`strings.${k}`] = v;
    }
  }
  if (data.guestMode) {
    for (const [k, v] of Object.entries(data.guestMode)) {
      if (v !== undefined) set[`guestMode.${k}`] = v;
    }
  }

  const updated = await SiteConfig.findOneAndUpdate(
    { key: "default" },
    { $set: set },
    { new: true, upsert: true },
  );
  res.json(updated);
});

router.post("/reset", async (_req, res) => {
  await SiteConfig.deleteOne({ key: "default" });
  const fresh = await getOrCreateSiteConfig();
  res.json(fresh);
});

export default router;

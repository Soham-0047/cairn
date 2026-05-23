import { Router } from "express";
import { z } from "zod";
import { SiteConfig, getOrCreateSiteConfig } from "../../models/SiteConfig.js";

const router = Router();

// All config endpoints accept an optional ?key=<product-id> so this single
// admin service can host configs for multiple consumer products. No key →
// "default" singleton.

router.get("/", async (req, res) => {
  const key = (req.query.key as string | undefined) || "default";
  const cfg = await getOrCreateSiteConfig(key);
  res.json(cfg);
});

router.get("/keys", async (_req, res) => {
  const docs = await SiteConfig.find({}, { key: 1, "brand.name": 1, updatedAt: 1 }).lean();
  res.json({ keys: docs });
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
  features: z.record(z.unknown()).optional(),
  strings: z.record(z.string()).optional(),
  guestMode: guestModeSchema.optional(),
});

router.patch("/", async (req, res) => {
  const parse = patchSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const data = parse.data;
  const key = (req.query.key as string | undefined) || "default";

  const set: Record<string, unknown> = {};
  for (const group of ["brand", "copy", "seo", "features", "guestMode"] as const) {
    const value = data[group];
    if (!value) continue;
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) set[`${group}.${k}`] = v;
    }
  }
  if (data.strings) {
    for (const [k, v] of Object.entries(data.strings)) set[`strings.${k}`] = v;
  }

  const updated = await SiteConfig.findOneAndUpdate(
    { key },
    { $set: set },
    { new: true, upsert: true },
  );
  res.json(updated);
});

router.post("/reset", async (req, res) => {
  const key = (req.query.key as string | undefined) || "default";
  await SiteConfig.deleteOne({ key });
  const fresh = await getOrCreateSiteConfig(key);
  res.json(fresh);
});

export default router;

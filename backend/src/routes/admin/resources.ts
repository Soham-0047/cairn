import { Router } from "express";
import { z } from "zod";
import { Resource } from "../../models/Resource.js";

const router = Router();

router.get("/", async (req, res) => {
  const q = (req.query.q as string | undefined)?.trim();
  const filter = q
    ? { $or: [{ title: new RegExp(q, "i") }, { topics: new RegExp(q, "i") }] }
    : {};
  const items = await Resource.find(filter).sort({ qualityScore: -1 }).limit(200).lean();
  res.json(items);
});

const upsertSchema = z.object({
  url: z.string().url(),
  title: z.string().min(2),
  type: z.enum(["video", "article", "course", "book", "doc"]),
  source: z.string().optional(),
  durationMin: z.number().int().min(0).optional(),
  topics: z.array(z.string()).min(1),
  qualityScore: z.number().min(0).max(1).optional(),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
});

router.post("/", async (req, res) => {
  const parse = upsertSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  const doc = await Resource.findOneAndUpdate(
    { url: parse.data.url },
    { $set: parse.data },
    { new: true, upsert: true },
  );
  res.json(doc);
});

router.delete("/:id", async (req, res) => {
  await Resource.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

const bulkSchema = z.object({ items: z.array(upsertSchema) });
router.post("/bulk", async (req, res) => {
  const parse = bulkSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  let upserted = 0;
  for (const item of parse.data.items) {
    await Resource.findOneAndUpdate({ url: item.url }, { $set: item }, { upsert: true });
    upserted++;
  }
  res.json({ upserted });
});

export default router;

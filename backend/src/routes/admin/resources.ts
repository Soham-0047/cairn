import { Router } from "express";
import { z } from "zod";
import { Resource } from "../../models/Resource.js";

const router = Router();

// Escape user-supplied input before stuffing into a RegExp so admin search
// can't be tripped into ReDoS via a crafted query like `(a+)+$`.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

router.get("/", async (req, res) => {
  const raw = (req.query.q as string | undefined)?.trim();
  const q = raw ? raw.slice(0, 200) : "";
  const filter = q
    ? (() => {
        const pattern = new RegExp(escapeRegex(q), "i");
        return { $or: [{ title: pattern }, { topics: pattern }] };
      })()
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

const bulkSchema = z.object({ items: z.array(upsertSchema).max(500) });
router.post("/bulk", async (req, res) => {
  const parse = bulkSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ error: parse.error.flatten() });
  if (parse.data.items.length === 0) return res.json({ upserted: 0 });
  // Single round-trip bulkWrite is dramatically faster than N sequential
  // findOneAndUpdate calls and lets the driver keep partial progress on
  // failure (ordered: false) instead of stopping at the first bad item.
  const ops = parse.data.items.map((item) => ({
    updateOne: {
      filter: { url: item.url },
      update: { $set: item },
      upsert: true,
    },
  }));
  const result = await Resource.bulkWrite(ops, { ordered: false });
  const upserted = (result.upsertedCount || 0) + (result.modifiedCount || 0);
  res.json({ upserted });
});

export default router;

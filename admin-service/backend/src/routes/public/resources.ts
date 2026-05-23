import { Router } from "express";
import { Resource } from "../../models/Resource.js";

const router = Router();

router.get("/", async (req, res) => {
  const topic = (req.query.topic as string | undefined)?.trim();
  const q = (req.query.q as string | undefined)?.trim();
  const filter: Record<string, unknown> = { enabled: true };
  if (topic) filter.topics = topic;
  if (q) {
    Object.assign(filter, {
      $or: [{ title: new RegExp(q, "i") }, { topics: new RegExp(q, "i") }],
    });
  }
  const items = await Resource.find(filter).sort({ qualityScore: -1 }).limit(200).lean();
  res.json({ items });
});

export default router;

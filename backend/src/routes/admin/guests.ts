import { Router } from "express";
import { User } from "../../models/User.js";
import { Path } from "../../models/Path.js";
import { Evaluation } from "../../models/Evaluation.js";

const router = Router();

router.get("/", async (_req, res) => {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const sinceHour = new Date(Date.now() - 3600 * 1000);

  const [totalGuests, last24h, lastHour, expired, evals24h] = await Promise.all([
    User.countDocuments({ isGuest: true }),
    User.countDocuments({ isGuest: true, createdAt: { $gte: since24h } }),
    User.countDocuments({ isGuest: true, createdAt: { $gte: sinceHour } }),
    User.countDocuments({ isGuest: true, guestExpiresAt: { $lt: new Date() } }),
    Evaluation.countDocuments({ createdAt: { $gte: since24h } }),
  ]);

  const recent = await User.find({ isGuest: true })
    .sort({ createdAt: -1 })
    .limit(20)
    .select("handle createdAt guestExpiresAt")
    .lean();

  res.json({
    counts: { totalGuests, last24h, lastHour, expired, evals24h },
    recent,
  });
});

router.post("/cleanup", async (_req, res) => {
  // Delete expired guests + their paths/evals
  const expired = await User.find({ isGuest: true, guestExpiresAt: { $lt: new Date() } })
    .select("_id")
    .lean();
  const ids = expired.map((u) => u._id);
  if (ids.length === 0) return res.json({ deleted: 0 });

  await Promise.all([
    Path.deleteMany({ userId: { $in: ids } }),
    Evaluation.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
  res.json({ deleted: ids.length });
});

router.post("/purge-all", async (_req, res) => {
  // Nuclear option: delete every guest. Useful after a demo session.
  const guests = await User.find({ isGuest: true }).select("_id").lean();
  const ids = guests.map((u) => u._id);
  await Promise.all([
    Path.deleteMany({ userId: { $in: ids } }),
    Evaluation.deleteMany({ userId: { $in: ids } }),
    User.deleteMany({ _id: { $in: ids } }),
  ]);
  res.json({ deleted: ids.length });
});

export default router;

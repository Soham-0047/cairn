import { Router } from "express";
import { ApiCredential } from "../../models/ApiCredential.js";
import { decryptSecret } from "../../utils/crypto.js";
import { logger } from "../../utils/logger.js";

const router = Router();

// GET /public/credentials?service=google   → just one service
// GET /public/credentials                  → all services, grouped
//
// Returns DECRYPTED plaintext keys. Service-token-gated upstream. The consumer
// project caches these in memory; this endpoint is hit on boot + every TTL.

router.get("/", async (req, res) => {
  const serviceFilter = (req.query.service as string | undefined)?.toLowerCase();
  const filter: Record<string, unknown> = { enabled: true };
  if (serviceFilter) filter.service = serviceFilter;

  const docs = await ApiCredential.find(filter)
    .sort({ priority: 1, createdAt: 1 })
    .lean();

  const out: Record<string, Array<{
    id: string;
    label: string;
    key: string;
    metadata: Record<string, unknown>;
    priority: number;
  }>> = {};

  for (const d of docs) {
    let key: string;
    try {
      key = decryptSecret(d.secret as { ciphertext: string; iv: string; authTag: string });
    } catch (err) {
      logger.warn(
        { id: String(d._id), service: d.service },
        "Skipping undecryptable credential (likely encrypted under a previous SECRET_KEY)",
      );
      continue;
    }
    const arr = out[d.service] || [];
    arr.push({
      id: String(d._id),
      label: d.label,
      key,
      metadata: (d.metadata as Record<string, unknown>) || {},
      priority: d.priority ?? 100,
    });
    out[d.service] = arr;
  }

  res.json({
    services: out,
    fetchedAt: new Date().toISOString(),
  });
});

// Lightweight telemetry: consumer reports back whether a key worked. Lets the
// admin UI show success/failure counts without the consumer needing DB access.
router.post("/:id/report", async (req, res) => {
  const ok = req.body?.ok === true;
  const reason = typeof req.body?.reason === "string" ? req.body.reason.slice(0, 300) : "";
  const update = ok
    ? { $inc: { successCount: 1 }, $set: { lastUsedAt: new Date() } }
    : {
        $inc: { failureCount: 1 },
        $set: { lastFailureAt: new Date(), lastFailureReason: reason },
      };
  await ApiCredential.updateOne({ _id: req.params.id }, update).catch(() => {});
  res.json({ ok: true });
});

export default router;

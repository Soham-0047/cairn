import { Router } from "express";
import multer from "multer";
import { requireUser, type AuthedRequest } from "../middleware/auth.js";
import { transcribeAudio } from "../services/transcription.service.js";
import { logger } from "../utils/logger.js";

const ACCEPTED_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/ogg",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

/**
 * POST /api/transcribe
 * Accepts a single audio file (multipart/form-data, field "file") and returns
 * `{ text }`. Auth-gated like the rest of the user APIs.
 */
router.post("/transcribe", requireUser, upload.single("file"), async (req: AuthedRequest, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ error: "Missing file" });

  // Browsers append codec info to the mime ("audio/webm;codecs=opus") — strip
  // before the whitelist check.
  const baseMime = (file.mimetype || "").split(";")[0]?.trim().toLowerCase() || "";
  if (!ACCEPTED_MIMES.has(baseMime)) {
    return res.status(400).json({ error: `Unsupported audio type: ${file.mimetype}` });
  }

  try {
    const text = await transcribeAudio(file.buffer, baseMime);
    res.json({ text });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Transcription failed";
    logger.error({ err: msg }, "Transcription route failed");
    res.status(502).json({ error: "Transcription failed", message: msg });
  }
});

export default router;

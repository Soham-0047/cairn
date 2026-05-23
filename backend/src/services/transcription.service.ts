import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const GROQ_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODEL = "whisper-large-v3";

/**
 * Transcribe a short audio clip using Groq's Whisper deployment. Returns the
 * plain-text transcript. Throws when the key is missing or the API call fails
 * so the route can return a useful 502.
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string,
): Promise<string> {
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }
  const start = Date.now();

  // Whisper file extensions Groq accepts. Map browser MediaRecorder mime types
  // to a filename — the API uses the extension to pick the decoder.
  const ext = (() => {
    if (mimeType.includes("webm")) return "webm";
    if (mimeType.includes("ogg")) return "ogg";
    if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
    if (mimeType.includes("wav")) return "wav";
    return "webm";
  })();

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
    `clip.${ext}`,
  );
  form.append("model", MODEL);
  form.append("response_format", "text");

  const resp = await fetch(GROQ_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: form,
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    logger.warn(
      {
        provider: "groq",
        model: MODEL,
        status: resp.status,
        latencyMs: Date.now() - start,
        body: body.slice(0, 200),
      },
      "Groq transcription failed",
    );
    throw new Error(`Groq ${resp.status}: ${body.slice(0, 200)}`);
  }

  const text = (await resp.text()).trim();
  logger.info(
    {
      provider: "groq",
      model: MODEL,
      audioBytes: audioBuffer.length,
      mimeType,
      latencyMs: Date.now() - start,
      chars: text.length,
    },
    "Transcription succeeded",
  );
  return text;
}

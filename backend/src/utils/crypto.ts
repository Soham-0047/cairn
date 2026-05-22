import crypto from "node:crypto";
import { env } from "../config/env.js";

/**
 * AES-256-GCM at-rest encryption for secrets (API keys, OAuth tokens, etc.).
 * Designed for the admin credential vault — see models/ApiCredential.ts.
 *
 * The key is derived from JWT_SECRET so we don't add a new env var. Rotate by
 * adding a new JWT_SECRET and migrating; ciphertexts encrypted under the old
 * secret won't decrypt, which is what you want for a key rotation.
 */

const ALGO = "aes-256-gcm";

function derivedKey(): Buffer {
  return crypto.createHash("sha256").update(env.JWT_SECRET).digest();
}

export type EncryptedSecret = {
  ciphertext: string; // base64
  iv: string; // base64
  authTag: string; // base64
};

export function encryptSecret(plaintext: string): EncryptedSecret {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, derivedKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ciphertext: enc.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
  };
}

export function decryptSecret(secret: EncryptedSecret): string {
  const decipher = crypto.createDecipheriv(
    ALGO,
    derivedKey(),
    Buffer.from(secret.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
  const dec = Buffer.concat([
    decipher.update(Buffer.from(secret.ciphertext, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

/** Mask a secret for display — keep first 4 and last 4 chars. */
export function maskSecret(s: string): string {
  if (s.length <= 10) return "•".repeat(s.length);
  return `${s.slice(0, 4)}${"•".repeat(Math.min(20, s.length - 8))}${s.slice(-4)}`;
}

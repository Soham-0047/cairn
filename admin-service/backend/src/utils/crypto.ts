import crypto from "node:crypto";
import { env } from "../config/env.js";

// AES-256-GCM at-rest encryption for API key material. Key is derived from
// SECRET_KEY via SHA-256 so we don't have to handle 32-byte input directly.
// Rotating SECRET_KEY invalidates all stored ciphertexts — which is the
// intended escape hatch if the key is ever leaked.

const ALGO = "aes-256-gcm";

function derivedKey(): Buffer {
  return crypto.createHash("sha256").update(env.SECRET_KEY).digest();
}

export type EncryptedSecret = {
  ciphertext: string;
  iv: string;
  authTag: string;
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

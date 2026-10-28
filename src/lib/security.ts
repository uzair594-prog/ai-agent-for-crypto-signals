import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

function encryptionKey(): Buffer {
  const encoded = process.env.TOKEN_ENCRYPTION_KEY;
  if (!encoded) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must be 32 bytes encoded as base64");
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

export function decryptSecret(value: string): string {
  const [ivText, tagText, dataText] = value.split(".");
  if (!ivText || !tagText || !dataText) throw new Error("Malformed encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivText, "base64url"));
  decipher.setAuthTag(Buffer.from(tagText, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function constantTimeHexEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

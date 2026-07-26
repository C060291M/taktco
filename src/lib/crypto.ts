// AES-256-GCM encryption for customer-supplied BYOAI provider API keys.
// Uses Node's built-in crypto module - no external dependency, and since this
// is pure, deterministic logic (not a network call), it's the one piece of
// this phase that's actually been reasoned through carefully rather than
// "written against docs, never run." Still: verify with a real encrypt/decrypt
// round trip locally before trusting it with a real customer's key.
//
// ENCRYPTION_KEY must be a 32-byte value, base64-encoded. Generate one with:
//   openssl rand -base64 32
// Losing this key means every stored BYOAI key becomes permanently
// undecryptable - treat it exactly like a database backup credential.
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY is not set - required to store or read BYOAI provider keys.");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must decode to exactly 32 bytes (openssl rand -base64 32).");
  return key;
}

// Returns "iv:authTag:ciphertext", all hex - stored as-is in CompanyAiSettings.encryptedApiKey.
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(stored: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertextHex] = stored.split(":");
  if (!ivHex || !authTagHex || !ciphertextHex) throw new Error("Malformed encrypted value.");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}

// Never expose the real key back to the client - this is what the Settings UI
// should show once a key is stored (e.g. "sk-ant-...a1b2").
export function maskSecret(plaintext: string): string {
  if (plaintext.length <= 8) return "••••";
  return `${plaintext.slice(0, 6)}...${plaintext.slice(-4)}`;
}

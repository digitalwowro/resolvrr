import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const algorithm = "aes-256-gcm";
const version = "v1";

function keyFromMaterial(keyMaterial: string): Buffer {
  const decoded = Buffer.from(keyMaterial, "base64");
  if (decoded.length === 32) {
    return decoded;
  }

  const utf8 = Buffer.from(keyMaterial, "utf8");
  if (utf8.length === 32) {
    return utf8;
  }

  throw new Error("APP_ENCRYPTION_KEY must decode to 32 bytes");
}

// Provider credentials and sensitive cached bodies must stay server-side and encrypted at rest.
export function encryptSecret(plaintext: string, keyMaterial: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(algorithm, keyFromMaterial(keyMaterial), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    version,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(envelope: string, keyMaterial: string): string {
  const [storedVersion, ivText, tagText, ciphertextText] = envelope.split(":");

  if (storedVersion !== version || !ivText || !tagText || !ciphertextText) {
    throw new Error("Unsupported encrypted secret envelope");
  }

  const decipher = createDecipheriv(
    algorithm,
    keyFromMaterial(keyMaterial),
    Buffer.from(ivText, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagText, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * AES-GCM encrypt/decrypt using Web Crypto (SubtleCrypto) with PBKDF2 key derivation.
 * Works in modern Node and browsers.
 */
import { Buffer } from "buffer";

// --- Helper to get a SubtleCrypto-enabled crypto impl ---
const getCrypto = () => {
  if (typeof globalThis !== "undefined" && (globalThis as any).crypto?.subtle) {
    return (globalThis as any).crypto as Crypto;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require("crypto");
    if (nodeCrypto?.webcrypto?.subtle) return nodeCrypto.webcrypto as Crypto;
  } catch {
    /* ignore */
  }
  throw new Error("Crypto module with SubtleCrypto is not available in this environment");
};

const crypto = getCrypto();

// --- Configuration ---
const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // bytes
const SALT_LENGTH = 16; // bytes
const TAG_LENGTH = 128; // bits
const PBKDF2_ITERATIONS = 100_000;
const KEY_DERIVATION_ALGORITHM = "PBKDF2";

/**
 * Derives a cryptographic key from a secret string using PBKDF2.
 * Accepts salt as Uint8Array but converts to an exact ArrayBuffer for TS compatibility.
 */
async function deriveKey(secret: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ["deriveKey"]
  );

  // Ensure BufferSource is an exact ArrayBuffer (not a view with offsets)
  const saltBuffer: ArrayBuffer = saltBytes.slice(0).buffer;

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: saltBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    secretKey,
    { name: ALGORITHM, length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypts a plaintext string using AES-GCM.
 * Output: Base64 of salt || iv || ciphertext(+tag).
 */
export async function encrypt(plaintext: string): Promise<string> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET environment variable is not set.");

  const saltBytes = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(secret, saltBytes);

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
    key,
    new TextEncoder().encode(plaintext)
  );

  const ciphertext = new Uint8Array(encryptedBuffer);

  const combined = new Uint8Array(saltBytes.length + iv.length + ciphertext.length);
  combined.set(saltBytes, 0);
  combined.set(iv, SALT_LENGTH);
  combined.set(ciphertext, SALT_LENGTH + IV_LENGTH);

  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypts a Base64 string produced by `encrypt`.
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) throw new Error("ENCRYPTION_SECRET environment variable is not set.");

  const combined = Buffer.from(encryptedBase64, "base64");
  if (combined.length < SALT_LENGTH + IV_LENGTH + 1) {
    throw new Error("Invalid encrypted payload.");
  }

  const saltBytes = new Uint8Array(combined.subarray(0, SALT_LENGTH)); // view over salt
  const iv = new Uint8Array(combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH));
  const ciphertext = new Uint8Array(combined.subarray(SALT_LENGTH + IV_LENGTH));

  const key = await deriveKey(secret, saltBytes);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv, tagLength: TAG_LENGTH },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error("Failed to decrypt data. The data may be corrupt or the key is incorrect.");
  }
}

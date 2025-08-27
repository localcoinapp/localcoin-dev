// This file is reserved for cryptographic functions, such as encrypting and decrypting sensitive data.
// It uses the Web Crypto API (SubtleCrypto), which is available in modern Node.js and browsers.

// --- Helper function to get the crypto implementation ---
const getCrypto = () => {
  // For server-side (Node.js >= 19)
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  // For browser or older Node.js with polyfill
  // In a pure browser environment, `window.crypto` would be the primary source.
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  // Fallback for environments where crypto is not globally available
  try {
    const crypto = require('crypto');
    return crypto.webcrypto;
  } catch (e) {
    throw new Error('Crypto module not available in this environment');
  }
};

const crypto = getCrypto();

// --- Configuration ---
const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // bytes
const SALT_LENGTH = 16; // bytes
const TAG_LENGTH = 128; // bits
const PBKDF2_ITERATIONS = 100000;
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';

/**
 * Derives a cryptographic key from a secret string using PBKDF2.
 * @param secret The master secret (from environment variable).
 * @param salt A random salt for the key derivation.
 * @returns A CryptoKey suitable for AES-GCM.
 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const secretKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: KEY_DERIVATION_ALGORITHM },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    secretKey,
    { name: ALGORITHM, length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a plaintext string using AES-GCM.
 * The output format is "salt:iv:ciphertext:tag" encoded in Base64.
 * @param plaintext The string to encrypt.
 * @returns The Base64 encoded encrypted string.
 */
export async function encrypt(plaintext: string): Promise<string> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is not set.');
  }

  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await deriveKey(secret, salt);

  const encryptedData = await crypto.subtle.encrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: TAG_LENGTH,
    },
    key,
    new TextEncoder().encode(plaintext)
  );

  const ciphertext = new Uint8Array(encryptedData);
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.length);

  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(ciphertext, salt.length + iv.length);

  // Convert to Base64 to safely store and transmit
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypts a Base64 encoded string that was encrypted with the `encrypt` function.
 * @param encryptedBase64 The encrypted string in "salt:iv:ciphertext:tag" format (Base64 encoded).
 * @returns The original plaintext string.
 */
export async function decrypt(encryptedBase64: string): Promise<string> {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET environment variable is not set.');
  }

  const combined = Buffer.from(encryptedBase64, 'base64');
  
  const salt = combined.slice(0, SALT_LENGTH);
  const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertext = combined.slice(SALT_LENGTH + IV_LENGTH);

  const key = await deriveKey(secret, salt);

  try {
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
        tagLength: TAG_LENGTH,
      },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decryptedData);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error('Failed to decrypt data. The data may be corrupt or the key incorrect.');
  }
}

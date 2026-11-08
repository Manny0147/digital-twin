/**
 * Client-side capable encryption helpers for high-sensitivity memories.
 * AES-256-GCM. Passphrase never leaves the client for encryption/decryption.
 */
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const buffer = new ArrayBuffer(bytes.byteLength);
  const copy = new Uint8Array(buffer);
  copy.set(bytes);
  return copy;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: copyBytes(salt),
      iterations: 100_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptContent(plaintext: string, passphrase: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return "__enc__" + btoa(String.fromCharCode(...combined));
}

export async function decryptContent(ciphertext: string, passphrase: string): Promise<string> {
  if (!ciphertext.startsWith("__enc__")) return ciphertext;
  const raw = Uint8Array.from(atob(ciphertext.slice(7)), (c) => c.charCodeAt(0));
  const salt = raw.slice(0, 16);
  const iv = raw.slice(16, 28);
  const data = raw.slice(28);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return decoder.decode(plain);
}

export function isEncrypted(content: string): boolean {
  return content.startsWith("__enc__");
}

/** Aliases used by memories.ts and vault-import.ts */
export const encryptText = encryptContent;
export const decryptText = decryptContent;
export function isEncryptedPayload(content: string): boolean {
  return isEncrypted(content);
}
export type EncryptedPayload = string;

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export const localSessionLifetimeSeconds = 60 * 60 * 24 * 30;
export const tokenHash = token => createHash('sha256').update(token).digest('hex');

export function encryptAuthorization(authorization, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(authorization, 'utf8'), cipher.final()]);
  return { iv: iv.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url') };
}

export function decryptAuthorization(encrypted, key) {
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encrypted.iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted.ciphertext, 'base64url')), decipher.final()]).toString('utf8');
}

export function sessionRecord(token, authorization, key, now = Date.now()) {
  return { tokenHash: tokenHash(token), expiresAt: now + localSessionLifetimeSeconds * 1000, authorization: encryptAuthorization(authorization, key) };
}

// Accepts a 32-byte AES key as raw bytes, 64 hex characters, or base64.
export function parseSessionKey(raw) {
  const bytes = Buffer.from(raw);
  const text = bytes.toString('utf8').trim();
  if (/^[0-9a-fA-F]{64}$/.test(text)) return Buffer.from(text, 'hex');
  const decoded = /^[A-Za-z0-9+/_-]+={0,2}$/.test(text) ? Buffer.from(text, 'base64') : Buffer.alloc(0);
  if (decoded.length === 32) return decoded;
  return bytes.length === 32 ? bytes : null;
}

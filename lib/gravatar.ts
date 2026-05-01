import * as Crypto from 'expo-crypto';

/**
 * Compute the Gravatar URL for an email. Uses `d=404` so the URL fails fast
 * when no Gravatar exists, letting the caller fall back via `onError`.
 *
 * Per Gravatar's spec the email must be lower-cased and trimmed before hashing
 * with MD5.
 */
export async function gravatarUrlForEmail(email: string, size = 256): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.MD5, normalized);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

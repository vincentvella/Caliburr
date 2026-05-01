import { md5 } from 'js-md5';

/**
 * Compute the Gravatar URL for an email. Uses `d=404` so the URL fails fast
 * when no Gravatar exists, letting the caller fall back via `onError`.
 *
 * Uses js-md5 (pure JS) so the same code path works on both native and web.
 * Web's SubtleCrypto doesn't support MD5, and Gravatar requires it.
 */
export function gravatarUrlForEmail(email: string, size = 256): string {
  const normalized = email.trim().toLowerCase();
  const hash = md5(normalized);
  return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}

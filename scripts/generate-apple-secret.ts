// Generates the Apple "Client Secret" JWT that Supabase needs to do server-side
// OAuth with Apple. Apple keys expire every 6 months — re-run this and paste the
// output back into Supabase → Auth → Providers → Apple → Secret Key (for OAuth).
//
// Usage:
//   bun run scripts/generate-apple-secret.ts \
//     --team-id ABCDE12345 \
//     --key-id   ABCDE12345 \
//     --services-id coffee.caliburr.app.signin \
//     --p8 ~/Downloads/AuthKey_ABCDE12345.p8
//
// Or set env vars: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICES_ID, APPLE_P8_PATH
//
// Uses Bun's built-in jsrsasign-free JWT signing (Web Crypto API), no deps.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const teamId = arg('team-id') ?? process.env.APPLE_TEAM_ID;
const keyId = arg('key-id') ?? process.env.APPLE_KEY_ID;
const servicesId = arg('services-id') ?? process.env.APPLE_SERVICES_ID;
const p8Path = arg('p8') ?? process.env.APPLE_P8_PATH;

if (!teamId || !keyId || !servicesId || !p8Path) {
  console.error(
    'Missing required args. See top of file. Need: --team-id, --key-id, --services-id, --p8',
  );
  process.exit(1);
}

const p8 = readFileSync(resolve(p8Path.replace(/^~/, process.env.HOME ?? '')), 'utf8');

// Strip PEM headers and base64-decode to DER
const pemBody = p8
  .replace(/-----BEGIN PRIVATE KEY-----/, '')
  .replace(/-----END PRIVATE KEY-----/, '')
  .replace(/\s+/g, '');
const der = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

const key = await crypto.subtle.importKey(
  'pkcs8',
  der,
  { name: 'ECDSA', namedCurve: 'P-256' },
  false,
  ['sign'],
);

const now = Math.floor(Date.now() / 1000);
const sixMonths = 60 * 60 * 24 * 30 * 6; // Apple max

const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + sixMonths,
  aud: 'https://appleid.apple.com',
  sub: servicesId,
};

const b64url = (s: string) =>
  btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const headerB64 = b64url(JSON.stringify(header));
const payloadB64 = b64url(JSON.stringify(payload));
const signingInput = `${headerB64}.${payloadB64}`;

const sig = await crypto.subtle.sign(
  { name: 'ECDSA', hash: 'SHA-256' },
  key,
  new TextEncoder().encode(signingInput),
);

const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  .replace(/\+/g, '-')
  .replace(/\//g, '_')
  .replace(/=+$/, '');

console.log(`${signingInput}.${sigB64}`);
console.error(
  `\n✓ JWT generated. Expires: ${new Date((now + sixMonths) * 1000).toISOString()}`,
);
console.error('  Paste the line above into Supabase → Apple provider → Secret Key (for OAuth).');

// Values in the admin email come from user-submitted edit payloads, so every
// interpolated value has to be escaped. Before this existed the function
// interpolated them raw, which let anyone who could reach the endpoint inject
// arbitrary HTML — phishing links, tracking pixels — into the admin inbox.
//
// Kept in its own module so it is unit-testable without booting the function
// (see html.test.ts).

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

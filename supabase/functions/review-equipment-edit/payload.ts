// Edits are user-submitted JSONB with no shape validation at the DB layer — the
// RLS insert policy only checks `auth.uid() = proposed_by`, not the payload
// contents. The approve path applies them with the service-role client, which
// bypasses RLS, so an un-allowlisted key would be written verbatim. Only these
// columns are ever applied; anything else (verified, created_by, …) is dropped.
//
// Kept in its own module so the filtering is unit-testable without booting the
// function (see payload.test.ts).

export const GRINDER_EDIT_FIELDS = [
  'brand',
  'model',
  'burr_type',
  'adjustment_type',
  'steps_per_unit',
  'range_min',
  'range_max',
  'image_url',
] as const;

export const MACHINE_EDIT_FIELDS = ['brand', 'model', 'machine_type', 'image_url'] as const;

export function pickAllowed(
  raw: unknown,
  allowed: readonly string[],
): { payload: Record<string, unknown>; dropped: string[] } {
  const source = (raw ?? {}) as Record<string, unknown>;
  const payload: Record<string, unknown> = {};
  const dropped: string[] = [];

  for (const key of Object.keys(source)) {
    if (allowed.includes(key)) {
      payload[key] = source[key];
    } else {
      dropped.push(key);
    }
  }

  // An edit that changes the image queues it for a separate approval pass.
  if ('image_url' in payload) {
    payload.image_status = payload.image_url ? 'pending' : null;
  }

  return { payload, dropped };
}

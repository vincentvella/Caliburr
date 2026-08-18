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
  currentImageUrl: string | null = null,
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

  // The equipment modals send image_url on every submit, prefilled from the
  // current row, so its presence alone says nothing about whether it changed.
  // Only re-queue the image for approval when the URL actually differs —
  // otherwise approving an unrelated edit (a brand typo, say) would knock an
  // already-approved image back to 'pending' and hide it from the app. This
  // mirrors the guard the client's direct-edit path already applies.
  if ('image_url' in payload) {
    const next = (payload.image_url as string | null) ?? null;
    if (next !== (currentImageUrl ?? null)) {
      payload.image_status = next ? 'pending' : null;
    }
  }

  return { payload, dropped };
}

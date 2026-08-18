// Run with: deno test supabase/functions/review-equipment-edit/payload.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { GRINDER_EDIT_FIELDS, MACHINE_EDIT_FIELDS, pickAllowed } from './payload.ts';

Deno.test('keeps allowlisted grinder fields', () => {
  const { payload, dropped } = pickAllowed(
    { brand: 'Comandante', model: 'C40 MK4', range_min: 0, range_max: 40 },
    GRINDER_EDIT_FIELDS,
  );

  assertEquals(payload, { brand: 'Comandante', model: 'C40 MK4', range_min: 0, range_max: 40 });
  assertEquals(dropped, []);
});

Deno.test('drops an injected verified flag — VEL-85', () => {
  const { payload, dropped } = pickAllowed(
    { brand: 'Comandante', model: 'C40 MK4', verified: true },
    GRINDER_EDIT_FIELDS,
  );

  assertEquals(payload, { brand: 'Comandante', model: 'C40 MK4' });
  assertEquals(dropped, ['verified']);
  assertEquals('verified' in payload, false);
});

Deno.test('drops every other non-column key it is handed', () => {
  const { payload, dropped } = pickAllowed(
    { model: 'Zero', created_by: 'attacker-uuid', id: 'other-grinder', image_status: 'approved' },
    GRINDER_EDIT_FIELDS,
  );

  assertEquals(payload, { model: 'Zero' });
  assertEquals(dropped.sort(), ['created_by', 'id', 'image_status']);
});

Deno.test('machine allowlist rejects grinder-only fields', () => {
  const { payload, dropped } = pickAllowed(
    { brand: 'Gaggia', machine_type: 'espresso', burr_type: 'conical', verified: true },
    MACHINE_EDIT_FIELDS,
  );

  assertEquals(payload, { brand: 'Gaggia', machine_type: 'espresso' });
  assertEquals(dropped.sort(), ['burr_type', 'verified']);
});

Deno.test('a changed image_url queues the new image for approval', () => {
  const { payload } = pickAllowed(
    { image_url: 'https://example.com/new.webp' },
    GRINDER_EDIT_FIELDS,
    'https://example.com/old.webp',
  );
  assertEquals(payload.image_status, 'pending');
});

Deno.test('an unchanged image_url leaves image_status alone', () => {
  // The modals resubmit image_url on every edit, prefilled from the current
  // row, so its presence says nothing about whether it changed. Approving a
  // brand typo must not knock an already-approved image back to 'pending'.
  const { payload } = pickAllowed(
    { brand: 'Comandante', image_url: 'https://example.com/same.webp' },
    GRINDER_EDIT_FIELDS,
    'https://example.com/same.webp',
  );
  assertEquals('image_status' in payload, false);
  assertEquals(payload.brand, 'Comandante');
});

Deno.test('clearing an existing image_url clears image_status', () => {
  const { payload } = pickAllowed(
    { image_url: null },
    GRINDER_EDIT_FIELDS,
    'https://example.com/old.webp',
  );
  assertEquals(payload.image_status, null);
});

Deno.test('no image before or after leaves image_status alone', () => {
  const { payload } = pickAllowed({ image_url: null }, GRINDER_EDIT_FIELDS, null);
  assertEquals('image_status' in payload, false);
});

Deno.test('image_status cannot be forced past the allowlist', () => {
  // image_status is derived, never accepted from the payload.
  const { payload, dropped } = pickAllowed(
    { image_url: 'https://example.com/x.webp', image_status: 'approved' },
    GRINDER_EDIT_FIELDS,
    null,
  );

  assertEquals(payload.image_status, 'pending');
  assertEquals(dropped, ['image_status']);
});

Deno.test('handles null and empty payloads without throwing', () => {
  assertEquals(pickAllowed(null, GRINDER_EDIT_FIELDS), { payload: {}, dropped: [] });
  assertEquals(pickAllowed({}, GRINDER_EDIT_FIELDS), { payload: {}, dropped: [] });
});

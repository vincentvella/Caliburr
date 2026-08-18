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

Deno.test('image_url queues the image for approval', () => {
  const { payload } = pickAllowed({ image_url: 'https://example.com/x.webp' }, GRINDER_EDIT_FIELDS);
  assertEquals(payload.image_status, 'pending');
});

Deno.test('clearing image_url clears image_status rather than queueing it', () => {
  const { payload } = pickAllowed({ image_url: null }, GRINDER_EDIT_FIELDS);
  assertEquals(payload.image_status, null);
});

Deno.test('image_status cannot be forced past the allowlist', () => {
  // image_status is derived, never accepted from the payload.
  const { payload, dropped } = pickAllowed(
    { image_url: 'https://example.com/x.webp', image_status: 'approved' },
    GRINDER_EDIT_FIELDS,
  );

  assertEquals(payload.image_status, 'pending');
  assertEquals(dropped, ['image_status']);
});

Deno.test('handles null and empty payloads without throwing', () => {
  assertEquals(pickAllowed(null, GRINDER_EDIT_FIELDS), { payload: {}, dropped: [] });
  assertEquals(pickAllowed({}, GRINDER_EDIT_FIELDS), { payload: {}, dropped: [] });
});

// Run with: deno test supabase/functions/notify-equipment-edit/html.test.ts
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { escapeHtml } from './html.ts';

Deno.test('leaves ordinary equipment names alone', () => {
  assertEquals(escapeHtml('Comandante C40 MK4'), 'Comandante C40 MK4');
});

Deno.test('neutralises an injected anchor tag — VEL-86', () => {
  assertEquals(
    escapeHtml('<a href="https://evil.example">Click here</a>'),
    '&lt;a href=&quot;https://evil.example&quot;&gt;Click here&lt;/a&gt;',
  );
});

Deno.test('neutralises an injected tracking pixel', () => {
  assertEquals(
    escapeHtml('<img src="https://evil.example/p.gif">'),
    '&lt;img src=&quot;https://evil.example/p.gif&quot;&gt;',
  );
});

Deno.test('escapes every entity, including quotes', () => {
  assertEquals(escapeHtml(`& < > " '`), '&amp; &lt; &gt; &quot; &#39;');
});

Deno.test('escapes ampersands first so entities are not double-broken', () => {
  // A naive ordering turns < into &lt; and then the & into &amp;lt;
  assertEquals(escapeHtml('<'), '&lt;');
  assertEquals(escapeHtml('&lt;'), '&amp;lt;');
});

Deno.test('handles non-string values without throwing', () => {
  assertEquals(escapeHtml(null), '');
  assertEquals(escapeHtml(undefined), '');
  assertEquals(escapeHtml(42), '42');
  assertEquals(escapeHtml(true), 'true');
});

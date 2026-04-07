# Caliburr

Crowdsourced coffee dial-in app — grinder + bean + brew method recipe database.

## Stack

- **Expo Router** (web + mobile from one codebase)
- **NativeWind v4** (Tailwind CSS for React Native)
- **Supabase** (Postgres + auth + realtime)
- **TanStack Form v1** (`useForm`, `useStore` — `useStore` is a standalone import, not a form method)
- **TypeScript**
- **bun** — always use `bun`/`bunx`, never `npm`/`npx`

## Project Structure

```
app/
  _layout.tsx           — root layout (imports global.css + url-polyfill)
  (tabs)/               — main tab navigation
  (auth)/               — sign in / sign up
  (admin)/              — moderation + analytics (role-gated, web + mobile)
  recipe/new.tsx        — new recipe form
lib/
  supabase.ts           — Supabase client
  types.ts              — shared TypeScript types + label maps
components/
  GrindTape.tsx         — horizontal ruler grind setting selector
  equipment/
    GrinderModal.tsx    — add/edit/review/view grinder modal
    MachineModal.tsx    — add/review/view machine modal
supabase/migrations/    — all schema changes live here
```

## Design System

Coffee-themed Tailwind color palette. Use these instead of generic grays/blacks:

| Token          | Use                                      |
| -------------- | ---------------------------------------- |
| `latte`        | Light mode base, cream backgrounds       |
| `oat`          | Softest backgrounds, cards in light mode |
| `french-press` | Mid-dark surfaces                        |
| `ristretto`    | Dark mode base (primary dark background) |
| `cold-brew`    | Cool dark alternative surfaces           |
| `harvest`      | Warm amber — primary accent, CTAs        |
| `crema`        | Golden — highlights, ratings, stars      |
| `bloom`        | Earthy green — roast/origin tags         |

Default to dark mode using `ristretto` backgrounds with `latte` text.

Always add `style={{ lineHeight: undefined }}` to `TextInput` to prevent iOS text clipping.

## Data Model

### Equipment

- `grinders` — brand, model, burr_type, adjustment_type (`stepped` | `stepless` | `micro_stepped`), steps_per_unit, range_min, range_max, verified, created_by
- `brew_machines` — brand, model, machine_type (`espresso` | `super_automatic` | `drip` | `pod`), verified, created_by
- `user_grinders` — user_id, grinder_id, is_default
- `user_brew_machines` — user_id, brew_machine_id, is_default

### Community Verification

- `grinder_verifications` / `machine_verifications` — (equipment_id, user_id) unique pairs
- 5 unique user confirmations trigger a DB function that flips `verified = true`
- The user who created an entry (`created_by`) cannot verify their own entry
- Verified equipment is **read-only** in the UI — users see a details card, not an edit form

### Default equipment

- `is_default` on `user_grinders` and `user_brew_machines` — one per user each
- Starred in the profile screen; auto pre-selected in the new recipe form

### Recipes

- `recipes` — grinder_id, bean_id (optional), brew_machine_id (optional), brew_method, grind_setting (text), dose_g, yield_g, brew_time_s, water_temp_c, ratio, roast_date, roast_level, notes, user_id, upvotes
- `beans` — name, roaster, origin, process, roast_level (optional)

## Key Product Decisions

- **Grind setting** is always stored as free text — normalization across grinder models is not attempted.
- **GrindTape** renders a horizontal ruler for grind setting input. Three modes driven by `adjustment_type`:
  - `stepped` — integer snapping, uses `range_min`/`range_max`
  - `micro_stepped` — N sub-steps per unit (`steps_per_unit`), uses range
  - `stepless` — smooth 0.1-precision, uses range
  - No `snapToInterval` — snapping is done manually after momentum ends so the tape coasts freely
  - Tape freezes updates while text input is focused; syncs on blur
- **Bean is optional** on a recipe — grinder + brew method baselines are valid entries.
- **Aggregation** uses median + IQR (not mean) for grind settings. Outliers flagged at 2 std deviations.
- **Admin interface** is role-gated in Expo Router, not a separate app — works on mobile and web.
- **Equipment modals** follow a search → review → add flow. Unverified items show a 5-step progress bar; verified items are read-only.

## Code Conventions

### useEffect — no inline callbacks

Never write an inline arrow or anonymous function directly inside `useEffect`. Always extract a named function and pass it as a reference. This is enforced by ESLint (`local/no-inline-use-effect`).

```tsx
// ✗ forbidden
useEffect(() => {
  fetchData();
}, [id]);

// ✓ correct
useEffect(fetchData, [id]);

async function fetchData() { ... }

// ✓ also correct — custom hook
function useFetchData(id: string) {
  useEffect(load, [id]);
  async function load() { ... }
}
```

## Environment

Copy `.env.local` and fill in:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Commands

```bash
bun start                          # start dev server
bun run ios                        # run on iOS simulator
bun run android                    # run on Android emulator
bun run web                        # run in browser
bun run tsc                        # type check
bunx supabase db push              # push migrations to remote Supabase
```

## Deployment

EAS Workflows run automatically on push to `main` (release) and on pull requests (preview).
Workflow files live in `.eas/workflows/`.

| Workflow      | Trigger      | Jobs                                                             |
| ------------- | ------------ | ---------------------------------------------------------------- |
| `release.yml` | push → main  | iOS build + App Store submit (sequential); web deploy (parallel) |
| `preview.yml` | pull request | iOS simulator build + web preview URL (parallel)                 |

**Before first release** — set `ascAppId` in `eas.json`:

1. Create the app in [App Store Connect](https://appstoreconnect.apple.com)
2. Apps → Caliburr → App Information → **Apple ID** (numeric, e.g. `6745678901`)
3. Paste into `eas.json` → `submit.production.ios.ascAppId`

**Manual workflow trigger:**

```bash
bunx eas-cli@latest workflow:run release.yml    # trigger release manually
bunx eas-cli@latest workflow:run preview.yml    # trigger preview manually
```

**Manual one-off commands:**

```bash
bunx eas-cli@latest build -p ios --profile production          # iOS build only
bunx eas-cli@latest build -p ios --profile production --submit # build + submit
bunx expo export --platform web && bunx eas-cli@latest deploy --prod  # web deploy only
```

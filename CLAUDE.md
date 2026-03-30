# Caliburr

Crowdsourced coffee dial-in app — grinder + bean + brew method recipe database.

## Stack

- **Expo Router** (web + mobile from one codebase)
- **NativeWind v4** (Tailwind CSS for React Native)
- **Supabase** (Postgres + auth + realtime)
- **TypeScript**
- **bun** — always use `bun`/`bunx`, never `npm`/`npx`

## Project Structure

```
app/
  _layout.tsx           — root layout (imports global.css + url-polyfill)
  (tabs)/               — main tab navigation
  (auth)/               — sign in / sign up
  (admin)/              — moderation + analytics (role-gated, web + mobile)
lib/
  supabase.ts           — Supabase client
components/             — shared UI components
```

## Design System

Coffee-themed Tailwind color palette. Use these instead of generic grays/blacks:

| Token | Use |
|---|---|
| `latte` | Light mode base, cream backgrounds |
| `oat` | Softest backgrounds, cards in light mode |
| `french-press` | Mid-dark surfaces |
| `ristretto` | Dark mode base (primary dark background) |
| `cold-brew` | Cool dark alternative surfaces |
| `harvest` | Warm amber — primary accent, CTAs |
| `crema` | Golden — highlights, ratings, stars |
| `bloom` | Earthy green — roast/origin tags |

Default to dark mode using `ristretto` backgrounds with `latte` text.

## Data Model

- `grinders` — brand, model, burr_type, adjustment_type (stepped/stepless), `verified` bool
- `beans` — name, roaster, origin, process, roast_level (optional)
- `brew_methods` — enum: espresso, pour_over, aeropress, french_press, chemex, moka_pot, etc.
- `recipes` — grinder_id, bean_id (optional), brew_method, grind_setting (text), dose_g, yield_g, brew_time_s, water_temp_c, ratio, roast_date, roast_level, notes, user_id, upvotes

## Key Product Decisions

- **Grinder verification** is consensus-based (N unique recipe submissions) OR admin action — not blocking. Unverified grinders show a badge but are fully usable.
- **Grind setting** is always stored as free text — normalization across grinder models is not attempted.
- **Bean is optional** on a recipe — grinder + brew method baselines are valid entries.
- **Aggregation** uses median + IQR (not mean) for grind settings. Outliers flagged at 2 std deviations.
- **Admin interface** is role-gated in Expo Router, not a separate app — works on mobile and web.

## Environment

Copy `.env.local` and fill in:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

## Commands

```bash
bun start          # start dev server
bun run ios        # run on iOS simulator
bun run android    # run on Android emulator
bun run web        # run in browser
bun run tsc        # type check
```

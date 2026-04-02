# Caliburr Roadmap

## 🔴 Blockers — must fix before shipping

- [x] **Password reset flow** — forgot-password screen + reset-password screen; `PASSWORD_RECOVERY` event routes through `_layout.tsx`; sign-in has "Forgot password?" link.
- [x] **Equipment removal confirmation** — `removeGrinder` and `removeMachine` in Profile now show `Alert.alert` with destructive confirm before deleting.
- [x] **Error handling on destructive operations** — `removeGrinder`, `removeMachine`, and recipe delete now check the Supabase error and show an alert on failure without mutating local state.
- [x] **Upvote rollback** — both `index.tsx` and `recipe/[id].tsx` now roll back the optimistic update if the insert/delete fails.

## 🟠 Stability — fix before any public launch

- [ ] **Numeric field validation** — `dose_g`, `yield_g`, `ratio`, `brew_time_s`, `water_temp_c` in both new and edit recipe forms have no `onSubmit` validator. Invalid input (empty string that becomes `NaN` via `parseFloat`) can be saved to the database.
- [ ] **Deep link error handling** — `exchangeCodeForSession` in `_layout.tsx` has no error handling. A failed email verification link gives the user zero feedback.
- [ ] **Sign out error handling** — if `supabase.auth.signOut()` fails, the button stays disabled and the user is stuck.
- [ ] **Session expiry mid-use** — the root layout watches `onAuthStateChange` but individual screens don't handle 401 errors from Supabase mid-operation. Operations silently fail with no redirect or message.
- [ ] **`useFocusEffect` stability** — both `index.tsx` and `recipes.tsx` pass an unwrapped callback. React Compiler may memoize it correctly, but wrapping in `useCallback` is the documented contract for this hook.

## 🟡 UX gaps — needed for a complete product

- [ ] **Roast date validation** — `DateInput` formats the string but doesn't verify the date is real (e.g. `2026-02-30` passes through to the DB).
- [ ] **Explore search at scale** — currently fetches 50 recipes then filters client-side. Works now but breaks as data grows. Needs server-side `ilike` filtering or Postgres full-text search.
- [ ] **Recipe sharing** — no way to share a recipe link externally.
- [ ] **Copy-to-clipboard on recipe detail** — useful for sharing parameters with non-app users.

## 🟢 Features — post-launch

- [ ] **Admin interface** (`app/(admin)/`) — moderation dashboard for flagging/removing bad equipment entries and recipes. Role-gated, works on mobile and web. Required before user-generated content can grow unchecked.
- [ ] **Image uploads** — equipment modals currently only accept an external URL. Should support camera/gallery picker with Supabase Storage upload.
- [ ] **Grind setting aggregation** — median + IQR across all recipes for a given grinder + brew method combination. Outlier flagging at 2 std deviations. Mentioned in product decisions but no query or UI exists.
- [ ] **Trending / ranking** — weekly top recipes, most upvoted by brew method or grinder.
- [ ] **Push notifications** — notify users when their recipe is upvoted or their submitted equipment gets verified.
- [ ] **Draft saving** — auto-save new recipe form to AsyncStorage so work isn't lost if the user navigates away or the app crashes.
- [ ] **Offline support** — local cache with sync-on-reconnect. Low priority until core product is stable.

## ✅ Done

- Auth (sign in, sign up, email verification)
- Explore feed with search, brew method filters, My Gear toggle, upvotes
- My Recipes with delete
- Profile gear management — grinders + machines with defaults, verification flow (5-user threshold triggers DB function)
- New recipe form — GrindTape, brew timer, auto-calculated ratio
- Edit recipe form with history snapshots and diffs
- Recipe detail view
- Bean search + create modal
- Equipment modals — search → review → verify → add flow for grinders and machines
- GrindTape — stepped, micro-stepped, stepless modes with manual text override
- `roast_date` field on new and edit forms with native date picker (iOS/Android) and masked input fallback (web)
- Zero TypeScript errors, zero ESLint warnings

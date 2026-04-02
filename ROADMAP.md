# Caliburr Roadmap

## 🔴 Blockers — must fix before shipping

- [x] **Password reset flow** — forgot-password screen + reset-password screen; `PASSWORD_RECOVERY` event routes through `_layout.tsx`; sign-in has "Forgot password?" link.
- [x] **Equipment removal confirmation** — `removeGrinder` and `removeMachine` in Profile now show `Alert.alert` with destructive confirm before deleting.
- [x] **Error handling on destructive operations** — `removeGrinder`, `removeMachine`, and recipe delete now check the Supabase error and show an alert on failure without mutating local state.
- [x] **Upvote rollback** — both `index.tsx` and `recipe/[id].tsx` now roll back the optimistic update if the insert/delete fails.

## 🟠 Stability — fix before any public launch

- [x] **Numeric field validation** — `onSubmit` validators added to `dose_g`, `yield_g`, `ratio`, `water_temp_c`, `brew_time_s` in both new and edit forms. Errors render inline below each field.
- [x] **Deep link error handling** — `exchangeCodeForSession` result now checked; failure logged with `console.warn`.
- [x] **Sign out error handling** — error now checked; resets `signingOut` and shows an alert on failure.
- [x] **Session expiry mid-use** — handled by existing `onAuthStateChange` → `SIGNED_OUT` → `useAuthGate` redirect. No code change needed.
- [x] **`useFocusEffect` stability** — both `index.tsx` and `recipes.tsx` now wrap the callback in `useCallback` with correct deps. `fetchRecipes` in `recipes.tsx` also wrapped in `useCallback([])` to provide a stable reference.

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

# Caliburr Roadmap

## 🔴 Blockers — must fix before shipping

- [ ] **Privacy policy** — Apple requires a privacy policy URL in App Store Connect and a link accessible within the app. No screen or link exists.
- [x] **Onboarding** — 3-step flow (Welcome → Add grinder → Done); triggered on first sign-in via `onboarding_completed` user metadata; existing users with gear are fast-pathed through; `_layout.tsx` routes new users to `/onboarding` instead of `/(tabs)`.
- [x] **Liked recipes & clone** — users have no way to browse recipes they've upvoted, and no way to clone a recipe as a starting point for their own.

- [x] **Password reset flow** — forgot-password screen + reset-password screen; `PASSWORD_RECOVERY` event routes through `_layout.tsx`; sign-in has "Forgot password?" link.
- [x] **Equipment removal confirmation** — `removeGrinder` and `removeMachine` in Profile now show `Alert.alert` with destructive confirm before deleting.
- [x] **Error handling on destructive operations** — `removeGrinder`, `removeMachine`, and recipe delete now check the Supabase error and show an alert on failure without mutating local state.
- [x] **Upvote rollback** — both `index.tsx` and `recipe/[id].tsx` now roll back the optimistic update if the insert/delete fails.
- [x] **App assets** — custom `icon.png`, `splash-icon.png`, `adaptive-icon.png`, `favicon.png`, and `splash.png` are in place; `app.json` fully configured with bundle IDs and EAS project ID.
- [x] **Account deletion** — "Delete Account" button in Profile calls `supabase/functions/delete-account` Edge Function; JWT verified server-side so only the authenticated user can delete their own account; recipes are anonymised (`user_id → NULL`) rather than deleted so community data is preserved; all personal data (gear, upvotes, verifications) is removed via FK cascades.

## 🟠 Stability — fix before any public launch

- [x] **Numeric field validation** — `onSubmit` validators added to `dose_g`, `yield_g`, `ratio`, `water_temp_c`, `brew_time_s` in both new and edit forms. Errors render inline below each field.
- [x] **Deep link error handling** — `exchangeCodeForSession` result now checked; failure logged with `console.warn`.
- [x] **Sign out error handling** — error now checked; resets `signingOut` and shows an alert on failure.
- [x] **Session expiry mid-use** — handled by existing `onAuthStateChange` → `SIGNED_OUT` → `useAuthGate` redirect. No code change needed.
- [x] **`useFocusEffect` stability** — both `index.tsx` and `recipes.tsx` now wrap the callback in `useCallback` with correct deps. `fetchRecipes` in `recipes.tsx` also wrapped in `useCallback([])` to provide a stable reference.
- [x] **Recipe card delete tap propagation** — `RecipeCard` in `recipes.tsx` restructured so the navigation area and action buttons (Edit, ×) are siblings, not nested touchables; `hitSlop` added to action buttons.
- [x] **React error boundary** — `components/ErrorBoundary.tsx` class component wraps the root `Stack`; shows "Something went wrong" with a Try again button on unhandled render errors.
- [x] **Accessibility labels** — `accessibilityLabel` + `accessibilityRole` added to upvote buttons, filter chips, My Gear toggle, Edit/Delete buttons in recipe cards.

## 🟡 UX gaps — needed for a complete product

- [x] **Roast date validation** — `onSubmit` validator in both new and edit forms checks `YYYY-MM-DD` format and rejects impossible dates like `2026-02-30`.
- [x] **Explore search at scale** — server-side `ilike` lookups for grinder/bean/machine IDs + `OR` filter on recipes; client-side filtering removed.
- [x] **Recipe sharing** — Share button in recipe detail header uses `Share.share()` with formatted recipe text.
- [x] **Copy-to-clipboard on recipe detail** — "Copy params" button copies grind + numeric parameters; shows "Copied!" feedback for 2s.
- [x] **Explore feed pagination** — `FlatList` uses `.range()` with `onEndReached` to load 50 more recipes at a time; spinner shown while loading next page.
- [x] **My Recipes edit shortcut** — `RecipeCard` in My Recipes now has an Edit button in the action row that navigates directly to the edit screen.
- [x] **Profile account info** — email displayed in profile header; inline Change Password form added (new + confirm fields, calls `supabase.auth.updateUser`).

## 🟢 Features — post-launch

- [x] **Admin interface** — hub with equipment edit review, support queue, and feature request triage. Role-gated via `is_admin` user metadata.
- [x] **Recipe moderation** — browse newest-first with notes search, delete any recipe with confirmation.
- [x] **Equipment verification override** — manually verify or un-verify equipment; un-verify clears all votes so community can re-verify from scratch.
- [x] **Backer management** — list active backers, grant by email, revoke with confirmation. `admin-backer` edge function uses service role.
- [x] **Admin stats dashboard** — recipe/grinder/machine/backer totals, new recipes this week, top grinders and beans, breakdown by brew method.
- [ ] **User management** — view a user's recipes and activity, ability to ban.
- [ ] **Content reporting** — user-facing report button on recipes/equipment + admin moderation queue (requires new table).
- [ ] **Bean moderation** — beans are added freely with no verification or review flow.
- [ ] **RevenueCat webhook** — wire up `revenuecat-webhook` edge function to write `profiles.backer_tier` on subscription events so backer status persists across reinstalls and devices without relying on the SDK check.
- [ ] **Image uploads** — equipment modals currently only accept an external URL. Should support camera/gallery picker with Supabase Storage upload.
- [ ] **Grind setting aggregation** — median + IQR across all recipes for a given grinder + brew method combination. Outlier flagging at 2 std deviations. Mentioned in product decisions but no query or UI exists.
- [ ] **Trending / ranking** — weekly top recipes, most upvoted by brew method or grinder.
- [ ] **Push notifications** — notify users when their recipe is upvoted or their submitted equipment gets verified.
- [ ] **Draft saving** — auto-save new recipe form to AsyncStorage so work isn't lost if the user navigates away or the app crashes.
- [ ] **Offline support** — local cache with sync-on-reconnect. Low priority until core product is stable.

## ✅ Done

- Backer IAP — RevenueCat monthly + annual subscriptions, backer badge, BackerContext for zero-overhead status checks
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

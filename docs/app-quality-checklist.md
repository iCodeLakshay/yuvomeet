# App quality checklist (mobile)

Audit of `apps/mobile` against the 101-item "vibe-coded application fixes" checklist, 2026-11-02.

Status key: **Fixed** = changed in this pass · **OK** = already satisfied, verified in code ·
**Device** = needs a manual run on Android hardware/emulator; cannot be verified from static checks ·
**Open** = known gap, not done.

Verification run: `pnpm typecheck` (0 errors), `pnpm lint` (0 problems), `pnpm test` (shared 14/14,
mobile 9/9, secret scan), `expo export --platform android` (Hermes bundle builds).

## What changed in this pass

| Area | Change |
| --- | --- |
| Crash recovery | `ErrorBoundary` exported from `app/_layout.tsx` and `app/(app)/_layout.tsx` (`CrashScreen`): render errors show a retry screen and go to Sentry instead of killing the app. |
| Offline | `src/lib/connectivity.ts`: React Query `onlineManager` driven by `expo-network` (queries/mutations pause offline, resume on reconnect); `focusManager` refetches stale data when the app returns to the foreground. `OfflineBanner` tells the user they are viewing saved data. **Requires a dev-client rebuild** (`pnpm android`); older builds fall back safely. |
| Double submit | `Button` locks synchronously on press; async handlers stay locked until their promise settles. `loading` alone only disabled after a re-render. |
| Stuck UI | Trusted contact save had no try/finally (spinner stuck on a secure-store failure); now handles errors and blocks double taps. |
| Stale time | `useNow()` hook replaces `Date.now()` during render in plan creation, cancel (late-cancel warning) and notifications ("Today" grouping); values now update while a screen stays open. |
| OTP lock | The "Number locked" state now lifts itself when the lock expires; verify/resend guard against a missing `phone` param (deep link). |
| React correctness | Removed setState-in-effect (trusted contact), ref writes during render (TimePicker, welcome carousel), unstable memo deps (chat, notifications). |
| Tooling | ESLint ignores generated `.expo/`, `android/`, `ios/`; `no-console` enforced. `pnpm lint` added at root and to CI. Mobile unit tests (`node --test`, no new deps) wired into `pnpm test`. |

## A. Codebase audit & architecture

| # | Status | Note |
| --- | --- | --- |
| 1 | Fixed | Full audit: typecheck, lint, tests, dependency and pattern scans. |
| 2 | Fixed | Findings above; no duplicated feature implementations found. |
| 3–5 | OK | Already `app/` (routes) · `src/features/*` (api + feature UI) · `src/lib` (infra) · `src/ui` (kit). Not reorganised (item 20). |
| 6–7 | OK | No duplicate components or dead functions found beyond one unused import (removed). |
| 8 | OK | All deps referenced. Six without direct imports are required peers: `@expo/metro-runtime`, `react-native-screens` (expo-router), `react-native-worklets` (Reanimated 4), `react-native-nitro-modules` (MMKV 4), `expo-dev-client` (start script), `expo-application` (PostHog). Added `expo-network`. |
| 9–10 | OK | No mock/placeholder implementations. `mocked` in check-in is Android's GPS-spoof flag sent for anti-fraud. |
| 11 | Fixed | No `console.*` in app code; now enforced by lint. |
| 12 | OK | Consistent: PascalCase components, `useX` hooks, `qk` query keys. |
| 13–15 | OK | All TypeScript, `strict` + `noUncheckedIndexedAccess`, zero `any`. |
| 16–17 | OK | Tokens in `src/ui/theme.ts` (colors, space, radii, type, touch); `StyleSheet.create` throughout. |
| 18 | OK | `src/lib/env.ts` from `EXPO_PUBLIC_*`. See note on `.env` below. |
| 19 | OK | React Query + `qk` for server state, `unwrap`/`toAppError` for errors, typed routes. |
| 20 | OK | Working code left alone; changes are targeted fixes. |

## B. UI & screen-level

| # | Status | Note |
| --- | --- | --- |
| 21–30 | Device | Token-driven styling makes drift unlikely, but visual review needs a device pass per screen. |
| 31–32 | OK | `Screen` applies safe-area insets top and bottom (edge-to-edge is the RN 0.86 default; no opt-out configured). Cutouts: verify on a punch-hole device. |
| 33 | Device | |
| 34 | OK | `Text` scales up to 1.3× system font size (deliberate cap). Raising it needs a layout pass on device. |
| 35–36 | OK | `KeyboardAvoidingView` padding in `Screen` (correct for edge-to-edge, where `adjustResize` no longer resizes). Sheets are native form sheets. |
| 37 | OK | |
| 38–40 | Device | Expo Router protected stacks drive restart/auth routing; hardware back needs a manual run. |

## C. Functional & interaction

| # | Status | Note |
| --- | --- | --- |
| 41–43 | Device | |
| 44–45 | OK | Shared `checkText`, `toE164India`, etc. with user-facing messages. |
| 46 | OK | `EmptyState`, `Notice`, `loading` buttons, pull-to-refresh in `Screen`. |
| 47 | Fixed | `Button` press lock; explicit guards in OTP, cancel, trusted contact. |
| 48 | OK | `toAppError` maps all backend errors to safe user text. |
| 49 | Fixed | Trusted-contact spinner; every other busy flag already used try/finally. |
| 50 | OK | |
| 51–52 | OK | Filters/prefs persisted via MMKV and query cache. |
| 53 | OK | Enforced server-side (RLS + RPC checks), see `mobile-security-checklist.md`. |
| 54 | OK | `Pressable` scale + optional haptic on every press. |
| 55–57 | Fixed | Time-in-render and ref-in-render bugs fixed; effects clean up timers/listeners. |
| 58 | Fixed | Route `ErrorBoundary`s. |
| 59 | OK | |
| 60 | Device | |

## D. API & data

| # | Status | Note |
| --- | --- | --- |
| 61–63 | OK | `supabase` client, `callFunction`, `unwrap`, `toAppError`; 30 s timeouts in `lib/fetch.ts`. |
| 64–65 | OK | Generated DB types + `noUncheckedIndexedAccess`. |
| 66 | OK | Feed and chat use `useInfiniteQuery` with page limits; notifications capped at 100. |
| 67 | OK | `Screen onRefresh`. |
| 68–69 | OK | React Query dedupes and caches (`staleTime` 30 s). |
| 70–72 | Fixed | `onlineManager` + `OfflineBanner`; network errors retry twice; queries resume on reconnect. |
| 73 | OK | Persisted cache is hydrated then refetched when stale. |
| 74 | OK | Revoked session returns to sign-in (security pass). |
| 75 | OK | |

## E. UX & accessibility

| # | Status | Note |
| --- | --- | --- |
| 76–77 | OK | `IconButton` requires `label`; `Pressable` sets role/state; no unlabeled icon-only pressables found. |
| 78 | OK | Dark palette, light text on `#121318`. |
| 79 | OK | 44 dp + 6 dp hitSlop = 56 dp effective. |
| 80–83 | OK | Press feedback, `EmptyState`, Toast/Dialog hosts. |
| 84 | OK | Up to 1.3× (see 34). |
| 85–86 | OK | Reanimated defaults to the system reduce-motion setting; animations are transform-only. |
| 87 | OK | `autoComplete`/`keyboardType` on fields (added `tel` on trusted contact). |
| 88 | OK | Portrait locked. |

## F. Validation & testing

| # | Status | Note |
| --- | --- | --- |
| 89 | Fixed | 11 errors + 5 warnings → 0; lint in CI. |
| 90 | OK | 0 type errors. |
| 91 | OK | `expo export --platform android` builds; CI runs it. |
| 92 | Fixed | `src/__tests__/logic.test.ts`: scheduling rules and mention parsing. |
| 93–95 | Open | Component/E2E tests need jest-expo + RNTL and Maestro/Detox. Not added: installing new native test tooling is a separate decision. |
| 96–100 | Device | Auth, payments, back button, force-close and `adb logcat` need a device run. |
| 101 | OK | All existing checks still pass. |

## Follow-ups

- Rebuild the dev client (`pnpm android`) so `expo-network` is linked.
- Move `RAZORPAY_KEY_SECRET` out of `apps/mobile/.env`: the app never reads it (only `EXPO_PUBLIC_*` reach the bundle), but a payment secret does not belong in the app's environment file.
- Add jest-expo + React Native Testing Library and a Maestro flow for sign-in → join plan → chat (items 93–95).

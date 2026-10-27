# Yuvomeet Mobile — Expo & Android commands

Run these from **PowerShell**. Repo root: `d:\Projects\Yuvomeet`. App folder: `apps/mobile`.

This app uses **native modules** (MMKV, maps, secure store, etc.) — use a **development build** (`expo run:android` or EAS), not **Expo Go**.

**Important:** `expo` is installed only under `apps/mobile` (pnpm workspace). Do **not** run bare `npx expo …` from the repo root — `npx` may pull Expo 58 and fail with *“module `expo` is not installed”*. Always use `cd apps\mobile` + `pnpm exec expo …`, or `pnpm mobile:*` from the root.

---

## One-time setup

```powershell
cd d:\Projects\Yuvomeet
corepack enable
corepack prepare pnpm@9.15.9 --activate
pnpm install

copy apps\mobile\.env.example apps\mobile\.env
# Edit .env before release builds (Supabase, maps, etc.)
```

See [`.env.example`](./.env.example) for `EXPO_PUBLIC_*` and `GOOGLE_MAPS_ANDROID_API_KEY`.

---

## USB phone — check connection

On the phone: **Developer options → USB debugging** on; allow the PC when prompted.

```powershell
adb devices
# Should show something like:  ABC123XYZ    device
```

If `adb` is missing, add Android SDK `platform-tools` to PATH (often `%LOCALAPPDATA%\Android\Sdk\platform-tools`).

---

## Run on USB-connected Android (dev build)

Build, install, and launch on the plugged-in device:

```powershell
cd d:\Projects\Yuvomeet\apps\mobile
pnpm exec expo run:android --device
```

From repo root (USB device — run from `apps\mobile` for `--device`):

```powershell
cd d:\Projects\Yuvomeet\apps\mobile
pnpm exec expo run:android --device
# Or any connected device / emulator:
pnpm mobile:android
```

**Metro only** (after the dev client is already on the phone):

```powershell
cd d:\Projects\Yuvomeet
pnpm mobile:start
# In the terminal: press `a` for Android, or reload from the dev menu
```

**USB + Metro** (if the phone cannot reach your PC’s `localhost`):

```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8082 tcp:8082
```

---

## Emulator

Start an AVD in Android Studio, then:

```powershell
cd d:\Projects\Yuvomeet\apps\mobile
npx expo run:android
```

---

## Standalone APK (no dev server) — local Gradle

For a **release-style APK** on your machine (signing required for store distribution; release/debug APKs still install for testing).

```powershell
cd d:\Projects\Yuvomeet\apps\mobile

# Generate android/ (first time or after native config changes)
npx expo prebuild --platform android --clean

cd android
.\gradlew assembleRelease
```

**Typical output:** `apps\mobile\android\app\build\outputs\apk\release\app-release.apk`

**Faster test APK (debug):**

```powershell
.\gradlew assembleDebug
# android\app\build\outputs\apk\debug\app-debug.apk
```

**Install APK over USB:**

```powershell
adb install -r app\build\outputs\apk\release\app-release.apk
```

Set `EXPO_PUBLIC_*` in `apps\mobile\.env` **before** `prebuild` / Gradle so values are baked into the binary.

---

## Standalone APK — EAS (cloud)

Profiles are defined in [`eas.json`](./eas.json). Login and link once:

```powershell
cd d:\Projects\Yuvomeet\apps\mobile
npx eas-cli login
npx eas build:configure   # if the project is not linked yet
```

| Profile         | Artifact              | Command                                                      |
|----------------|-----------------------|--------------------------------------------------------------|
| **preview**    | Internal **APK**      | `npx eas build --profile preview --platform android`         |
| **development**| Dev client **APK**    | `npx eas build --profile development --platform android`     |
| **production** | **AAB** (Play Store)  | `npx eas build --profile production --platform android`      |

Download from the EAS dashboard or:

```powershell
npx eas build:list
```

Install on USB:

```powershell
adb install -r path\to\downloaded.apk
```

---

## Maintenance & debugging

```powershell
# Typecheck (monorepo)
cd d:\Projects\Yuvomeet
pnpm typecheck

# Shared tests + secret scan
pnpm test

# Database security suite (needs `supabase start`)
pnpm db:test

# Clear Metro cache
cd apps\mobile
npx expo start --dev-client --clear

# Regenerate native project after plugin or app.config changes
npx expo prebuild --platform android --clean

# Uninstall from device
adb uninstall app.yuvomeet

# Device logs while debugging
adb logcat *:S ReactNative:V ReactNativeJS:V
```

---

## Quick reference

| Goal                         | Command |
|-----------------------------|---------|
| Daily dev on USB            | `npx expo run:android --device` then `pnpm mobile:start` |
| Share APK without Metro     | `eas build --profile preview` or local `assembleRelease` |
| Play Store upload           | `eas build --profile production` → `.aab` |
| JS-only changes             | Keep Metro running; reload (no full native rebuild) |
| Native dep / config change  | `expo run:android` again or `prebuild --clean` |

---

## Root package scripts

| Script              | What it runs                          |
|---------------------|---------------------------------------|
| `pnpm mobile:start` | `expo start --dev-client` in mobile   |
| `pnpm mobile:android` | `expo run:android` in mobile        |

---

## Troubleshooting

### `ConfigError: … module expo is not installed`

You ran `npx expo` from `D:\Projects\Yuvomeet` (repo root). Fix:

```powershell
cd d:\Projects\Yuvomeet
pnpm install
cd apps\mobile
pnpm exec expo run:android --device
```

Use `pnpm exec expo` (or `pnpm start` / `pnpm android`) so the CLI matches **Expo SDK 57** in this app, not whatever `npx` downloads.

---

## Notes

- `pnpm start` in `apps/mobile` uses `--dev-client`. **Preview/production** APKs run standalone; **development** EAS APKs still need Metro (`pnpm mobile:start`) unless you add EAS Update later.
- The app always talks to Supabase. For local work run `supabase start` at the repo root and point `EXPO_PUBLIC_SUPABASE_URL` at it (`http://10.0.2.2:54321` from the emulator, your PC's LAN IP from a phone). Test numbers `+91 99999 00001` to `00003` take OTP `123456` (see `supabase/config.toml`).
- Locally, `kyc-start` applies a passing verification without HyperVerge, so you can test joining and hosting.
- Android package id: `app.yuvomeet` (see [`app.config.ts`](./app.config.ts)).

## Code layout

| Folder | What lives there |
| ------ | ---------------- |
| `app/` | Expo Router routes (see the route inventory in [docs/README.md](../../docs/README.md)) |
| `src/ui/` | Design system from Stitch: tokens (`theme.ts`) and every primitive. Screens never hard-code colours |
| `src/features/` | Data hooks and feature components per area (plans, chat, safety, profile, session…) |
| `src/lib/` | Supabase client, encrypted MMKV, query cache, media upload, telemetry (Sentry, PostHog) |
| `assets/` | Generated icon, adaptive icon, splash, notification icon, welcome hero |

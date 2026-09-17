# RommStream

A React Native TV app for Android TV and Apple TV (tvOS) that signs in to a
[RomM](https://github.com/rommapp/romm) server, browses your library by
platform, and launches the game in a WebView pointed at RomM's own web
player (EmulatorJS).

Built on [react-native-tvos](https://github.com/react-native-tvos/react-native-tvos)
via the `@react-native-tvos/template-tv` community template — this is a
TV-only app (no phone/tablet target).

## How it works

1. **Login** (`src/screens/LoginScreen.tsx`) — takes a server URL, username,
   and password, and exchanges them for an OAuth token via RomM's
   `POST /api/token` endpoint (`grant_type=password`). Tokens and credentials
   are stored in the OS keychain via `react-native-keychain`, never in plain
   AsyncStorage.
2. **Browse** (`PlatformListScreen` → `RomListScreen`) — uses the stored
   access token as a Bearer token against `GET /api/platforms` and
   `GET /api/roms?platform_ids=...` (note the plural — `platform_id` is
   silently ignored). `/api/roms` is limit/offset paginated with a default
   page of 50, so the client pages through the whole platform. A 401 triggers
   a one-time silent refresh via `POST /api/token` with
   `grant_type=refresh_token` (see `src/auth/AuthContext.tsx`).
3. **Play** (`PlayerScreen`) — RomM's web frontend (where EmulatorJS runs)
   authenticates via an `httpOnly` session cookie, not the OAuth token, and
   cookies are per-origin, so the login has to happen *inside* the WebView.
   The WebView first loads a cheap same-origin page (`GET /api/heartbeat`),
   then an injected script does `fetch('/api/login')` with HTTP Basic
   credentials — the same call RomM's own login page makes. RomM's CSRF
   middleware skips its check when an `Authorization` header is present, so
   no CSRF cookie handling is needed. On success the WebView is re-created
   pointing at the rom's page, already signed in.

   Why not a POST navigation? Android's `WebView.postUrl()` can't carry
   headers, and without `Authorization` the CSRF middleware returns 403.

## Paths verified against RomM's source (but still editable)

Both the login endpoint (`/api/login`) and the rom page route (`/rom/{id}`)
were checked against `rommapp/romm` `master` (`backend/endpoints/auth.py`,
`frontend/src/plugins/router.ts`). They're still editable under **Settings**
on the device in case a future RomM release moves them — no rebuild needed.

The play path defaults to `auto`, which mirrors RomM's own Play button
(`frontend/src/components/common/Game/PlayBtn.vue`): platforms with an
EmulatorJS core open `/rom/{id}/ejs`, Flash/browser games open
`/rom/{id}/ruffle`, Win3x/Win9x open `/rom/{id}/jsdos`, PICO-8 opens
`/rom/{id}/pico8`, and anything else falls back to the rom page `/rom/{id}`.
RomM's player routes land on a pre-play lobby (saves/states picker) whose
Play button only appears once the rom has loaded; the player screen injects
a small script that presses it (`.play-button` in the v1 UI,
`.r-v2-ejs__play` in v2) so the game starts without scrolling a web page with
a remote. The same script turns off EmulatorJS's on-screen touch gamepad via
its `virtual-gamepad` setting (Android TV reports a touchscreen, so
EmulatorJS would otherwise draw one), with a CSS rule as a fallback.

The EmulatorJS platform list is a snapshot of RomM's `_EJS_CORES_MAP` in
`src/settings/settingsStore.ts`; if a newly supported platform lands on the
rom page instead of the player, add its slug there. A fixed template such as
`/rom/{id}` can be set in Settings to override the auto behaviour.

## Prerequisites

- Node.js and npm
- For Android TV: Android SDK + NDK (the Gradle build will auto-download the
  NDK/build-tools it needs the first time), and either a physical Android TV
  device or an Android TV emulator (`sdkmanager` → `system-images;android-XX;google_atv;x86_64`).
- For Apple TV: **macOS with Xcode** and CocoaPods. This repo was scaffolded
  on Linux, so the tvOS side has been configured but not pod-installed or
  build-verified — that must happen on a Mac.

### Known environment gotchas already fixed in this repo

- **Gradle 9 / JDK toolchain crash**: the RN 0.83 gradle-plugin bundles
  `foojay-resolver-convention:0.5.0`, which references a Gradle enum member
  removed in Gradle 9.0, so any build fails with
  `JvmVendorSpec does not have member field ... IBM_SEMERU`. Fixed here by
  pinning the wrapper to Gradle 8.13 (`android/gradle/wrapper/gradle-wrapper.properties`).
- **react-native-screens codegen crash**: versions ≥4.26 use `React.ComponentRef`
  in their Fabric command specs, which this RN version's codegen parser
  rejects (`must be of type React.ElementRef<>`). Fixed here by pinning
  `react-native-screens` to `4.25.2` in `package.json`.
- **npm peer-dependency errors**: `react-native-tvos` publishes versions like
  `0.83.0-0`, which most RN ecosystem packages' `peerDependencies` ranges
  don't match under strict semver. `.npmrc` sets `legacy-peer-deps=true` so
  `npm install` doesn't fight you over this.
- Use JDK 17 to run Gradle: `JAVA_HOME=/path/to/java-17 ./gradlew ...` (this
  machine also has JDK 21 as the default `java`, which is incompatible).

## Running it

Start Metro:

```sh
npm start
```

### Android TV

```sh
npm run android
# or, once you have an emulator/device: npx react-native run-android
```

### Apple TV (macOS only)

```sh
bundle install
bundle exec pod install --project-directory=ios
npx react-native run-tvos --simulator "Apple TV"
```

## Project layout

```
src/
  api/            RomM REST client (login, refresh, platforms, roms)
  auth/           AuthContext (session state) + Keychain-backed secure storage
  components/     Shared TV-focusable UI pieces
  navigation/      React Navigation stack
  screens/        Login, Platforms, Roms, Player (WebView), Settings
  settings/       On-device settings (play path template) via AsyncStorage
  theme/          Shared color tokens
```

## Notes on HTTP-only RomM servers

Many self-hosted RomM instances run over plain HTTP on a LAN.

- **Android**: debug builds allow cleartext HTTP by default; **release**
  builds do not (`usesCleartextTraffic` in `AndroidManifest.xml`). If you
  ship a release build against a plain-HTTP server, add a
  [network security config](https://developer.android.com/training/articles/security-config)
  scoped to your server's host/IP.
- **tvOS**: `Info.plist` allows local-network HTTP (`NSAllowsLocalNetworking`)
  but not arbitrary HTTP over the internet. A remote, non-HTTPS RomM server
  will need an ATS exception added there.

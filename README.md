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
2. **Browse** (`MainScreen` with its Home / Platforms / Search tabs →
   `RomListScreen`) — the signed-in landing screen is a top bar over three
   tabs held as local state (switching tabs never adds navigation history).
   Platforms and the rom list use the stored access token as a Bearer token
   against `GET /api/platforms` and `GET /api/roms?platform_ids=...` (note
   the plural — `platform_id` is silently ignored). `/api/roms` is
   limit/offset paginated with a default page of 50, so the client pages
   through the whole platform. Search hits the same endpoint with
   `search_term=...`, debounced while typing. A 401 triggers a one-time
   silent refresh via `POST /api/token` with `grant_type=refresh_token`
   (see `src/auth/AuthContext.tsx`).
3. **Play** (`PlayerScreen`) — RomM's web frontend (where EmulatorJS runs)
   authenticates via an `httpOnly` session cookie, not the OAuth token, and
   cookies are per-origin, so the login has to happen _inside_ the WebView.
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

## Testing

### Unit, integration and component tests

Jest with [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
v14 (note its API is async: `await render(...)`, `await fireEvent.press(...)`).

```sh
npm test               # whole suite
npm run test:watch
npm run test:coverage  # coverage for src/
npm run typecheck      # tsc --noEmit
npm run lint
```

- Tests live next to the code in `src/**/__tests__/`. The pure modules
  (`api/rommClient`, `auth/secureStore`, `settings/settingsStore`, the SVG
  class inliner) have unit tests; `auth/__tests__/AuthContext.test.tsx` is an
  integration test that drives the real context, API client and secure store
  against a mocked `fetch` and keychain; every screen and component has an
  RNTL test.
- Native modules are mocked once in `jest.setup.js` (WebView, keychain,
  AsyncStorage, react-native-svg, safe-area-context) with just enough state
  to behave like the real thing. `jest.setupAfterEnv.js` resets that state and
  installs a `fetch` mock that fails loudly unless a test queues a response.
  Shared helpers (`mockFetchOnce`, `createAuthValue`, `createScreenProps`)
  are in `src/testUtils/`.
- Gotcha: RNTL's `act` returns React's bare thenable, so
  `await expect(act(...)).resolves` does not wait for it. Wrap it in
  `Promise.resolve(...)` first (see `actAsync` in the AuthContext test).

### End-to-end tests (Detox, Android TV)

`e2e/login.test.js` boots the app on an Android TV emulator, checks the login
form and drives a sign-in against an unreachable server. Detox does not
support tvOS.

Prerequisites: the Android SDK, JDK 17, and an Android TV AVD named
`Television_1080p` (Android Studio → Device Manager → TV, or `avdmanager`
with an `android-tv` system image; change `avdName` in `.detoxrc.js` if
yours differs).

```sh
export ANDROID_HOME=$HOME/Android/Sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64   # Gradle needs JDK 17
npm run e2e:build     # assembles the debug + androidTest APKs
npm start             # in another terminal: debug builds load JS from Metro
npm run e2e:test      # boots the AVD (or reuses a running one) and runs e2e/
```

If port 8081 is taken on your machine, set `RCT_METRO_PORT` (e.g. `8082`)
before both `npm run e2e:build` and `npm start -- --port 8082`: the build
bakes that port into the debug APK (Gradle property
`reactNativeDevServerPort`, see `android/app/build.gradle`) so the app on the
emulator finds Metro.

Typing into a field opens the TV's on-screen keyboard over the lower half of
the screen, so the e2e test closes it with `tapReturnKey()` after each field
before touching anything below it.

`npx detox test --configuration android.att.debug` runs the same suite on a
physical Android TV attached over `adb`. Running against a release build
would additionally need a network security config permitting cleartext to
`10.0.2.2` (Detox's test server), see the Detox docs.

### Git hooks

[lefthook](https://lefthook.dev) installs the hooks on `npm install`
(`lefthook.yml`):

- **pre-commit**: Prettier on the staged files (fixes are re-staged), then
  ESLint, `tsc --noEmit` and the Jest suites related to the staged files.
- **pre-push**: the full Jest suite.

Skip once with `LEFTHOOK=0 git commit ...`; put personal tweaks in the
git-ignored `lefthook-local.yml`. Detox never runs from a hook.

## Project layout

```
src/
  api/            RomM REST client (login, refresh, platforms, roms)
  auth/           AuthContext (session state) + Keychain-backed secure storage
  components/     Shared TV-focusable UI pieces (top bar, rom grid, icons)
  navigation/      React Navigation stack
  screens/        Login, Main (Home/Platforms/Search tabs), Roms, Player (WebView), Settings
  settings/       On-device settings (play path template) via AsyncStorage
  testUtils/      Helpers shared by the Jest tests
  theme/          Shared color tokens
e2e/              Detox end-to-end tests (Android TV)
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

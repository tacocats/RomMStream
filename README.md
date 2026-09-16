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
   `GET /api/roms?platform_id=...`. A 401 triggers a one-time silent refresh
   via `POST /api/token` with `grant_type=refresh_token` (see
   `src/auth/AuthContext.tsx`).
3. **Play** (`PlayerScreen`) — RomM's web frontend (where EmulatorJS runs)
   authenticates via an `httpOnly` session cookie, not the OAuth token. The
   WebView's *first* navigation is a real POST to `/api/auth/login` with the
   stored username/password, which sets that cookie inside the WebView's own
   cookie jar; once that finishes loading, the WebView navigates to the rom's
   page and the user is already signed in there too.

## ⚠️ One assumption you may need to fix

The path used to open a rom's web player (`DEFAULT_PLAY_PATH_TEMPLATE` in
`src/settings/settingsStore.ts`) is guessed as `/rom/{id}`, mirroring the
`GET /api/roms/{id}` REST route. RomM's frontend routes aren't part of its
stable API and have moved across versions. If picking a game opens the wrong
page:

1. Open your RomM server in a normal browser, navigate to a game, and check
   the URL bar.
2. On the device, open **Settings** from the platform list screen and update
   the "Web player path template" field (use `{id}` as the rom id
   placeholder), then hit **Save**. No rebuild needed — it's stored on-device.

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

// Debug builds load JS from Metro. RCT_METRO_PORT (honoured by `npm start`
// too) lets both sides agree on a port other than 8081.
const metroPort = process.env.RCT_METRO_PORT || '8081';

/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    // Debug builds load the JS bundle from Metro, so run `npm start` in
    // another terminal before `npm run e2e:test`. Detox reverses port 8081
    // into the emulator itself.
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: `cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug -PreactNativeDevServerPort=${metroPort}`,
    },
  },
  devices: {
    emulator: {
      type: 'android.emulator',
      device: {
        // Android TV AVD (create one via Android Studio's Device Manager or
        // `avdmanager` with a `google_atv` / `android-tv` system image).
        avdName: 'Television_1080p',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
  },
  configurations: {
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
  },
};

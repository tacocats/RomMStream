import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import {
  buildPlayPath,
  getInBrowserPlayEnabled,
  getLoginPath,
  getPlayPathTemplate,
} from '../settings/settingsStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

type Step = 'logging-in' | 'ready';

// Any cheap same-origin page will do as a place to run the login script from;
// RomM's frontend needs a session cookie, and cookies are per-origin, so the
// login request has to originate from inside the WebView itself.
const BOOTSTRAP_PATH = '/api/heartbeat';

// RomM's session-login endpoint takes HTTP Basic credentials, and its CSRF
// middleware skips the token check when an Authorization header is present,
// so a plain fetch from the page is enough — no CSRF cookie dance required.
// Android's WebView can't attach headers to a POST navigation, hence fetch.
function buildLoginScript(
  loginPath: string,
  username: string,
  password: string,
): string {
  return `
    (function () {
      var post = function (payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      };
      try {
        var creds = ${JSON.stringify(username)} + ':' + ${JSON.stringify(
    password,
  )};
        var basic = btoa(unescape(encodeURIComponent(creds)));
        fetch(${JSON.stringify(loginPath)}, {
          method: 'POST',
          credentials: 'include',
          headers: { Authorization: 'Basic ' + basic },
        })
          .then(function (res) { post({ type: 'login', ok: res.ok, status: res.status }); })
          .catch(function (err) { post({ type: 'login', ok: false, error: String(err) }); });
      } catch (err) {
        post({ type: 'login', ok: false, error: String(err) });
      }
    })();
    true;
  `;
}

// RomM's web player routes land on a pre-play lobby (saves/states picker)
// with a Play button that only appears once the rom has loaded: `.play-button`
// in the v1 UI (views/Player/EmulatorJS/Base.vue), `.r-v2-ejs__play` in the
// v2 UI. Its handler needs no user gesture, so press it for the user: a TV
// remote shouldn't have to scroll a web page to start the game. A button
// simply labelled "Play" is the last resort. On pages without one (the plain
// rom page fallback) this gives up after a while.
//
// EmulatorJS also draws an on-screen touch gamepad whenever the device
// reports a touchscreen (Android TV does), which is just clutter on a TV.
// It's switched off through EmulatorJS's own "virtual-gamepad" setting once
// the emulator object exists (EmulatorJS persists that in localStorage), with
// a CSS rule injected up front so it never flashes on screen before then.
const AUTO_PLAY_SCRIPT = `
  (function () {
    var style = document.createElement('style');
    style.textContent = '.ejs_virtualGamepad_parent { display: none !important; }';
    document.head.appendChild(style);

    var disableTouchGamepad = function () {
      var tries = 0;
      var timer = setInterval(function () {
        var ejs = window.EJS_emulator;
        if (ejs && typeof ejs.changeSettingOption === 'function') {
          clearInterval(timer);
          try { ejs.changeSettingOption('virtual-gamepad', 'disabled'); } catch (e) {}
        } else if (++tries > 300) {
          clearInterval(timer);
        }
      }, 200);
    };

    var findPlayButton = function () {
      var byClass = document.querySelector('button.play-button, button.r-v2-ejs__play');
      if (byClass) { return byClass; }
      var buttons = document.querySelectorAll('button');
      for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].textContent.trim().toLowerCase() === 'play') { return buttons[i]; }
      }
      return null;
    };
    var tries = 0;
    var timer = setInterval(function () {
      var btn = findPlayButton();
      if (btn) {
        clearInterval(timer);
        btn.click();
        disableTouchGamepad();
      } else if (++tries > 150) {
        clearInterval(timer);
      }
    }, 200);
  })();
  true;
`;

function describeLoginFailure(
  status: number | undefined,
  loginPath: string,
  error?: string,
): string {
  if (status === 401) {
    return 'RomM rejected the username/password. Sign out and sign in again.';
  }
  if (status === 404) {
    return `Login endpoint not found at ${loginPath}. Update "Login path" in Settings.`;
  }
  if (status !== undefined) {
    return `Sign-in request failed (HTTP ${status}) at ${loginPath}.`;
  }
  return `Sign-in request failed: ${error ?? 'unknown error'}`;
}

export function PlayerScreen({ route }: Props) {
  const { romId, platformSlug } = route.params;
  const { serverUrl, username, password } = useAuth();
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loginPath, setLoginPath] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('logging-in');
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getPlayPathTemplate(),
      getLoginPath(),
      getInBrowserPlayEnabled(),
    ]).then(([template, login, inBrowserPlayEnabled]) => {
      setPlayUrl(
        `${serverUrl}${buildPlayPath(
          template,
          { id: romId, platformSlug },
          inBrowserPlayEnabled,
        )}`,
      );
      setLoginPath(login);
    });
  }, [serverUrl, romId, platformSlug]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (step !== 'logging-in' || !loginPath) {
      return;
    }
    let payload: {
      type?: string;
      ok?: boolean;
      status?: number;
      error?: string;
    };
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (payload.type !== 'login') {
      return;
    }
    if (payload.ok) {
      setStep('ready');
    } else {
      setLoadError(
        describeLoginFailure(payload.status, loginPath, payload.error),
      );
    }
  };

  if (!playUrl || !loginPath) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator
          color={colors.accent}
          size="large"
          testID="player-loading"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {step === 'logging-in' && !loadError && (
        <View style={styles.overlay}>
          <ActivityIndicator color={colors.accent} size="large" />
          <Text style={styles.overlayText}>Signing in to {serverUrl}…</Text>
        </View>
      )}
      {loadError && (
        <View style={styles.overlay}>
          <Text style={styles.error} testID="player-error">
            {loadError}
          </Text>
        </View>
      )}
      {/* Keyed on step so the game page gets a fresh WebView that can't
          re-run the login script. The session cookie survives: the cookie
          store is shared across WebView instances on both platforms. */}
      <WebView
        key={step}
        testID="player-webview"
        style={styles.webview}
        source={{
          uri:
            step === 'logging-in' ? `${serverUrl}${BOOTSTRAP_PATH}` : playUrl,
        }}
        injectedJavaScript={
          step === 'logging-in'
            ? buildLoginScript(loginPath, username, password)
            : AUTO_PLAY_SCRIPT
        }
        onMessage={handleMessage}
        onError={syntheticEvent => {
          setLoadError(
            syntheticEvent.nativeEvent.description ||
              'Failed to load the web player',
          );
        }}
        webviewDebuggingEnabled={__DEV__}
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  webview: { flex: 1, backgroundColor: colors.background },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: 12,
  },
  overlayText: { color: colors.textMuted, fontSize: 16 },
  error: {
    color: colors.danger,
    fontSize: 16,
    paddingHorizontal: 32,
    textAlign: 'center',
  },
});

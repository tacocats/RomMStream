import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { WebViewHttpErrorEvent } from 'react-native-webview/lib/WebViewTypes';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { buildPlayPath, getLoginPath, getPlayPathTemplate } from '../settings/settingsStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

type Step = 'logging-in' | 'ready';

// The RomM web frontend authenticates via an httpOnly session cookie set by
// POSTing credentials to a login endpoint (see docs.romm.app auth reference).
// We do that POST as the WebView's own first navigation so the resulting
// Set-Cookie header lands in the WebView's cookie jar for the server's
// origin, then hand control to the normal RomM web player for the rom.
export function PlayerScreen({ route, navigation }: Props) {
  const { romId, romName } = route.params;
  const { serverUrl, username, password } = useAuth();
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [loginPath, setLoginPath] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('logging-in');
  const [loadError, setLoadError] = useState<string | null>(null);
  // WebView reports an HTTP error via a separate callback from the one that
  // tells us navigation finished, so stash the status code until then.
  const loginHttpStatus = useRef<number | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: romName });
  }, [navigation, romName]);

  useEffect(() => {
    Promise.all([getPlayPathTemplate(), getLoginPath()]).then(([template, login]) => {
      setPlayUrl(`${serverUrl}${buildPlayPath(template, romId)}`);
      setLoginPath(login);
    });
  }, [serverUrl, romId]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    if (step !== 'logging-in' || navState.loading) {
      return;
    }
    // The WebView fires one navigation-state event for its initial idle
    // state (about:blank, loading: false) before the login POST even
    // starts. Ignore it — otherwise we'd advance to the game page before
    // the sign-in request has run at all.
    if (navState.url === 'about:blank') {
      return;
    }
    if (loginHttpStatus.current && loginHttpStatus.current >= 400) {
      setLoadError(
        `Sign-in request failed (HTTP ${loginHttpStatus.current}) at ${loginPath}. ` +
          'If your RomM version uses a different login endpoint, update "Login path" in Settings.',
      );
      return;
    }
    setStep('ready');
  };

  const handleHttpError = (syntheticEvent: WebViewHttpErrorEvent) => {
    if (step === 'logging-in') {
      loginHttpStatus.current = syntheticEvent.nativeEvent.statusCode;
    }
  };

  if (!playUrl || !loginPath) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={colors.accent} size="large" />
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
          <Text style={styles.error}>{loadError}</Text>
        </View>
      )}
      <WebView
        style={styles.webview}
        source={
          step === 'logging-in'
            ? {
                uri: `${serverUrl}${loginPath}`,
                method: 'POST',
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
                // Android's WebView.postUrl() rejects headers on POST requests
                // (and already sends this exact content type by default), so
                // only pass it explicitly where it's actually supported.
                ...(Platform.OS !== 'android' && {
                  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }),
              }
            : { uri: playUrl }
        }
        onNavigationStateChange={handleNavigationStateChange}
        onHttpError={handleHttpError}
        onError={syntheticEvent => {
          setLoadError(syntheticEvent.nativeEvent.description || 'Failed to load the web player');
        }}
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
  error: { color: colors.danger, fontSize: 16, paddingHorizontal: 32, textAlign: 'center' },
});

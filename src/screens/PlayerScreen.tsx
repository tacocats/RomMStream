import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { useAuth } from '../auth/AuthContext';
import { RootStackParamList } from '../navigation/types';
import { buildPlayPath, getPlayPathTemplate } from '../settings/settingsStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Player'>;

// The RomM web frontend authenticates via an httpOnly session cookie set by
// POSTing credentials to this endpoint (see docs.romm.app auth reference).
// We do that POST as the WebView's own first navigation so the resulting
// Set-Cookie header lands in the WebView's cookie jar for the server's
// origin, then hand control to the normal RomM web player for the rom.
const LOGIN_PATH = '/api/auth/login';

export function PlayerScreen({ route, navigation }: Props) {
  const { romId, romName } = route.params;
  const { serverUrl, username, password } = useAuth();
  const [playUrl, setPlayUrl] = useState<string | null>(null);
  const [awaitingLoginRedirect, setAwaitingLoginRedirect] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: romName });
  }, [navigation, romName]);

  useEffect(() => {
    getPlayPathTemplate().then(template => {
      setPlayUrl(`${serverUrl}${buildPlayPath(template, romId)}`);
    });
  }, [serverUrl, romId]);

  const handleNavigationStateChange = (navState: WebViewNavigation) => {
    // Once the login POST has finished (redirected away from the login
    // endpoint, or simply finished loading), move on to the actual rom page.
    if (awaitingLoginRedirect && !navState.loading && playUrl) {
      setAwaitingLoginRedirect(false);
    }
  };

  if (!playUrl) {
    return (
      <View style={styles.centerFill}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {awaitingLoginRedirect && (
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
          awaitingLoginRedirect
            ? {
                uri: `${serverUrl}${LOGIN_PATH}`,
                method: 'POST',
                body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              }
            : { uri: playUrl }
        }
        onNavigationStateChange={handleNavigationStateChange}
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

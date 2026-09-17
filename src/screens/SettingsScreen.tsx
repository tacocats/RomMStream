import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FocusablePressable } from '../components/FocusablePressable';
import { RootStackParamList } from '../navigation/types';
import {
  DEFAULT_IN_BROWSER_PLAY_ENABLED,
  DEFAULT_LOGIN_PATH,
  getInBrowserPlayEnabled,
  getLoginPath,
  setInBrowserPlayEnabled,
  setLoginPath,
} from '../settings/settingsStore';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

interface ToggleProps {
  value: boolean;
  onValueChange: () => void;
  testID: string;
}

/** A remote-friendly on/off switch, built on FocusablePressable rather than
 * RN's Switch so it gets the app's usual TV focus treatment for free. */
function Toggle({ value, onValueChange, testID }: ToggleProps) {
  return (
    <FocusablePressable
      style={[styles.toggleTrack, value && styles.toggleTrackOn]}
      onPress={onValueChange}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      testID={testID}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobOn]} />
    </FocusablePressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const [inBrowserPlayEnabled, setInBrowserPlayEnabledInput] = useState(
    DEFAULT_IN_BROWSER_PLAY_ENABLED,
  );
  const [loginPath, setLoginPathInput] = useState(DEFAULT_LOGIN_PATH);

  useEffect(() => {
    getInBrowserPlayEnabled().then(setInBrowserPlayEnabledInput);
    getLoginPath().then(setLoginPathInput);
  }, []);

  const handleSave = async () => {
    await setInBrowserPlayEnabled(inBrowserPlayEnabled);
    await setLoginPath(loginPath.trim() || DEFAULT_LOGIN_PATH);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.toggleRow}>
        <View style={styles.toggleTextWrap}>
          <Text style={styles.label}>In-Browser Play</Text>
          <Text style={styles.help}>
            Enable in-browser retro emulators (EmulatorJS, js-dos, MS-DOS,
            PICO-8, Ruffle)
          </Text>
        </View>
        <Toggle
          value={inBrowserPlayEnabled}
          onValueChange={() => setInBrowserPlayEnabledInput(v => !v)}
          testID="settings-in-browser-play"
        />
      </View>

      <Text style={[styles.label, styles.secondField]}>Login path</Text>
      <Text style={styles.help}>
        Endpoint the web player signs in against (HTTP Basic) to pick up its
        session cookie. Only change this if the game screen reports the login
        endpoint was not found.
      </Text>
      <TextInput
        style={styles.input}
        value={loginPath}
        onChangeText={setLoginPathInput}
        autoCapitalize="none"
        autoCorrect={false}
        testID="settings-login-path"
      />

      <FocusablePressable
        style={styles.button}
        onPress={handleSave}
        testID="settings-save"
      >
        <Text style={styles.buttonText}>Save</Text>
      </FocusablePressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 32 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 24,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    maxWidth: 620,
    marginBottom: 12,
  },
  toggleTextWrap: { flex: 1 },
  label: { color: colors.textPrimary, fontSize: 16, marginBottom: 6 },
  secondField: { marginTop: 24 },
  help: {
    color: colors.textMuted,
    fontSize: 13,
    marginBottom: 12,
    maxWidth: 520,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 16,
    maxWidth: 520,
  },
  toggleTrack: {
    width: 52,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSolid,
    padding: 2,
    justifyContent: 'center',
  },
  toggleTrackOn: {
    backgroundColor: colors.accentSoft,
    borderColor: colors.accent,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.textMuted,
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    backgroundColor: colors.accent,
    alignSelf: 'flex-end',
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  buttonText: { color: colors.textPrimary, fontWeight: '600' },
});

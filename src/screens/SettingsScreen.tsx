import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FocusablePressable } from '../components/FocusablePressable';
import {
  DEFAULT_IN_BROWSER_PLAY_ENABLED,
  DEFAULT_LOGIN_PATH,
  DEFAULT_PLAY_PATH_TEMPLATE,
  getInBrowserPlayEnabled,
  getLoginPath,
  getPlayPathTemplate,
  setInBrowserPlayEnabled,
  setLoginPath,
  setPlayPathTemplate,
} from '../settings/settingsStore';
import { colors } from '../theme/colors';

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

export function SettingsScreen() {
  const [inBrowserPlayEnabled, setInBrowserPlayEnabledInput] = useState(
    DEFAULT_IN_BROWSER_PLAY_ENABLED,
  );
  const [playPathTemplate, setPlayPathTemplateInput] = useState(
    DEFAULT_PLAY_PATH_TEMPLATE,
  );
  const [loginPath, setLoginPathInput] = useState(DEFAULT_LOGIN_PATH);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getInBrowserPlayEnabled().then(setInBrowserPlayEnabledInput);
    getPlayPathTemplate().then(setPlayPathTemplateInput);
    getLoginPath().then(setLoginPathInput);
  }, []);

  const handleSave = async () => {
    await setInBrowserPlayEnabled(inBrowserPlayEnabled);
    await setPlayPathTemplate(
      playPathTemplate.trim() || DEFAULT_PLAY_PATH_TEMPLATE,
    );
    await setLoginPath(loginPath.trim() || DEFAULT_LOGIN_PATH);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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

      <Text style={[styles.label, styles.secondField]}>
        Web player path template
      </Text>
      <Text style={styles.help}>
        Page opened when you pick a game. `auto` picks the web player for the
        game's platform (EmulatorJS, Ruffle, js-dos, PICO-8) like RomM's own
        Play button, falling back to the rom page. Or set a fixed template with{' '}
        {'{id}'} as the rom id, e.g. `/rom/{'{id}'}`.
      </Text>
      <TextInput
        style={styles.input}
        value={playPathTemplate}
        onChangeText={setPlayPathTemplateInput}
        autoCapitalize="none"
        autoCorrect={false}
        testID="settings-play-path"
      />

      <FocusablePressable
        style={styles.button}
        onPress={handleSave}
        testID="settings-save"
      >
        <Text style={styles.buttonText}>{saved ? 'Saved' : 'Save'}</Text>
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

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FocusablePressable } from '../components/FocusablePressable';
import {
  DEFAULT_LOGIN_PATH,
  DEFAULT_PLAY_PATH_TEMPLATE,
  getLoginPath,
  getPlayPathTemplate,
  setLoginPath,
  setPlayPathTemplate,
} from '../settings/settingsStore';
import { colors } from '../theme/colors';

export function SettingsScreen() {
  const [playPathTemplate, setPlayPathTemplateInput] = useState(
    DEFAULT_PLAY_PATH_TEMPLATE,
  );
  const [loginPath, setLoginPathInput] = useState(DEFAULT_LOGIN_PATH);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPlayPathTemplate().then(setPlayPathTemplateInput);
    getLoginPath().then(setLoginPathInput);
  }, []);

  const handleSave = async () => {
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

      <Text style={styles.label}>Login path</Text>
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
    color: colors.text,
    marginBottom: 24,
  },
  label: { color: colors.text, fontSize: 16, marginBottom: 6 },
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
    color: colors.text,
    fontSize: 16,
    maxWidth: 520,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignSelf: 'flex-start',
  },
  buttonText: { color: colors.text, fontWeight: '600' },
});

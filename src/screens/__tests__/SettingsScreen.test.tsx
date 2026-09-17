import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import {
  getInBrowserPlayEnabled,
  getLoginPath,
  setInBrowserPlayEnabled,
  setLoginPath,
} from '../../settings/settingsStore';
import { createScreenProps } from '../../testUtils/navigation';
import { SettingsScreen } from '../SettingsScreen';

async function renderScreen() {
  const screenProps = createScreenProps('Settings', undefined);
  await render(<SettingsScreen {...screenProps.props} />);
  return screenProps;
}

describe('SettingsScreen', () => {
  it('starts from the defaults when nothing is stored', async () => {
    await renderScreen();

    expect(
      screen.getByTestId('settings-in-browser-play').props.accessibilityState
        .checked,
    ).toBe(true);
    expect(screen.getByTestId('settings-login-path')).toHaveDisplayValue(
      '/api/login',
    );
  });

  it('loads the stored values into the inputs', async () => {
    await setInBrowserPlayEnabled(false);
    await setLoginPath('/custom/login');

    await renderScreen();

    expect(await screen.findByDisplayValue('/custom/login')).toBeOnTheScreen();
    expect(
      screen.getByTestId('settings-in-browser-play').props.accessibilityState
        .checked,
    ).toBe(false);
  });

  it('saves the toggle and the trimmed login path', async () => {
    await renderScreen();

    await fireEvent.press(screen.getByTestId('settings-in-browser-play'));
    await fireEvent.changeText(
      screen.getByTestId('settings-login-path'),
      '  /custom/login  ',
    );
    await fireEvent.press(screen.getByTestId('settings-save'));

    await expect(getInBrowserPlayEnabled()).resolves.toBe(false);
    await expect(getLoginPath()).resolves.toBe('/custom/login');
  });

  it('falls back to the default login path when the field is emptied', async () => {
    await setLoginPath('/custom/login');
    await renderScreen();

    await fireEvent.changeText(
      screen.getByTestId('settings-login-path'),
      '   ',
    );
    await fireEvent.press(screen.getByTestId('settings-save'));

    await expect(getLoginPath()).resolves.toBe('/api/login');
  });

  it('goes back once the settings are saved', async () => {
    const { navigation } = await renderScreen();

    await fireEvent.press(screen.getByTestId('settings-save'));

    expect(navigation.goBack).toHaveBeenCalled();
  });
});

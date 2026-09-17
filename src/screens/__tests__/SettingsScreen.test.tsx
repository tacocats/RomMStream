import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import {
  getLoginPath,
  getPlayPathTemplate,
  setLoginPath,
  setPlayPathTemplate,
} from '../../settings/settingsStore';
import { SettingsScreen } from '../SettingsScreen';

afterEach(() => {
  jest.useRealTimers();
});

describe('SettingsScreen', () => {
  it('starts from the defaults when nothing is stored', async () => {
    await render(<SettingsScreen />);

    expect(screen.getByTestId('settings-login-path')).toHaveDisplayValue(
      '/api/login',
    );
    expect(screen.getByTestId('settings-play-path')).toHaveDisplayValue('auto');
  });

  it('loads the stored values into the inputs', async () => {
    await setLoginPath('/custom/login');
    await setPlayPathTemplate('/rom/{id}');

    await render(<SettingsScreen />);

    expect(await screen.findByDisplayValue('/custom/login')).toBeOnTheScreen();
    expect(screen.getByTestId('settings-play-path')).toHaveDisplayValue(
      '/rom/{id}',
    );
  });

  it('saves trimmed values and falls back to defaults for empty ones', async () => {
    jest.useFakeTimers();
    await render(<SettingsScreen />);

    await fireEvent.changeText(
      screen.getByTestId('settings-play-path'),
      '  /rom/{id}  ',
    );
    await fireEvent.changeText(
      screen.getByTestId('settings-login-path'),
      '   ',
    );
    await fireEvent.press(screen.getByTestId('settings-save'));

    expect(await screen.findByText('Saved')).toBeOnTheScreen();
    await expect(getPlayPathTemplate()).resolves.toBe('/rom/{id}');
    await expect(getLoginPath()).resolves.toBe('/api/login');

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(screen.getByText('Save')).toBeOnTheScreen();
    expect(screen.queryByText('Saved')).toBeNull();
  });
});

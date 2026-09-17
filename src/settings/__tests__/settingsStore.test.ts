import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_IN_BROWSER_PLAY_ENABLED,
  DEFAULT_LOGIN_PATH,
  getInBrowserPlayEnabled,
  getLoginPath,
  setInBrowserPlayEnabled,
  setLoginPath,
} from '../settingsStore';

describe('persisted settings', () => {
  it('defaults to /api/login and in-browser play on', async () => {
    expect(DEFAULT_LOGIN_PATH).toBe('/api/login');
    expect(DEFAULT_IN_BROWSER_PLAY_ENABLED).toBe(true);
    await expect(getLoginPath()).resolves.toBe('/api/login');
    await expect(getInBrowserPlayEnabled()).resolves.toBe(true);
  });

  it('round-trips in-browser play under a versioned key', async () => {
    await setInBrowserPlayEnabled(false);

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'rommstream.inBrowserPlayEnabled.v1',
      'false',
    );
    await expect(getInBrowserPlayEnabled()).resolves.toBe(false);

    await setInBrowserPlayEnabled(true);
    await expect(getInBrowserPlayEnabled()).resolves.toBe(true);
  });

  it('round-trips the login path under a versioned key', async () => {
    await setLoginPath('/custom/login');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'rommstream.loginPath.v2',
      '/custom/login',
    );
    await expect(getLoginPath()).resolves.toBe('/custom/login');
  });

  it('ignores values saved under an older key version', async () => {
    await AsyncStorage.setItem('rommstream.loginPath.v1', '/old/login');

    await expect(getLoginPath()).resolves.toBe('/api/login');
  });
});

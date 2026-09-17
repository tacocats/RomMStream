import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AUTO_PLAY_PATH,
  buildPlayPath,
  DEFAULT_LOGIN_PATH,
  DEFAULT_PLAY_PATH_TEMPLATE,
  getLoginPath,
  getPlayPathTemplate,
  setLoginPath,
  setPlayPathTemplate,
} from '../settingsStore';

describe('buildPlayPath', () => {
  describe('auto', () => {
    it.each([
      ['snes', '/rom/5/ejs'],
      ['SNES', '/rom/5/ejs'],
      ['gba', '/rom/5/ejs'],
      ['psx', '/rom/5/ejs'],
      ['flash', '/rom/5/ruffle'],
      ['browser', '/rom/5/ruffle'],
      ['win3x', '/rom/5/jsdos'],
      ['win9x', '/rom/5/jsdos'],
      ['pico', '/rom/5/pico8'],
      ['switch', '/rom/5'],
      ['', '/rom/5'],
    ])('routes platform %p to %p', (platformSlug, expected) => {
      expect(buildPlayPath(AUTO_PLAY_PATH, { id: 5, platformSlug })).toBe(
        expected,
      );
    });
  });

  it('substitutes {id} into a custom template', () => {
    expect(buildPlayPath('/rom/{id}', { id: 42, platformSlug: 'snes' })).toBe(
      '/rom/42',
    );
    expect(
      buildPlayPath('/play?rom={id}&x=1', { id: 42, platformSlug: 'snes' }),
    ).toBe('/play?rom=42&x=1');
  });

  it('leaves a template without a placeholder alone', () => {
    expect(buildPlayPath('/library', { id: 42, platformSlug: 'snes' })).toBe(
      '/library',
    );
  });
});

describe('persisted settings', () => {
  it('defaults to auto play path and /api/login', async () => {
    expect(DEFAULT_PLAY_PATH_TEMPLATE).toBe(AUTO_PLAY_PATH);
    expect(DEFAULT_LOGIN_PATH).toBe('/api/login');
    await expect(getPlayPathTemplate()).resolves.toBe(AUTO_PLAY_PATH);
    await expect(getLoginPath()).resolves.toBe('/api/login');
  });

  it('round-trips the play path template under a versioned key', async () => {
    await setPlayPathTemplate('/rom/{id}');

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      'rommstream.playPathTemplate.v2',
      '/rom/{id}',
    );
    await expect(getPlayPathTemplate()).resolves.toBe('/rom/{id}');
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

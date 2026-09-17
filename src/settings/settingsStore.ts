import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys are versioned: bumping one discards a saved value whose meaning or
// correct default changed, so it can't override a fix.
const PLAY_PATH_TEMPLATE_KEY = 'rommstream.playPathTemplate.v2';
const LOGIN_PATH_KEY = 'rommstream.loginPath.v2';
const IN_BROWSER_PLAY_ENABLED_KEY = 'rommstream.inBrowserPlayEnabled.v1';

export const DEFAULT_IN_BROWSER_PLAY_ENABLED = true;

// "auto" mirrors the Play button in RomM's frontend
// (components/common/Game/PlayBtn.vue): ask the server which route the rom
// can use, via utils/playPath. Any other value is used as a literal path
// template with `{id}` as the rom id placeholder.
export const AUTO_PLAY_PATH = 'auto';
export const DEFAULT_PLAY_PATH_TEMPLATE = AUTO_PLAY_PATH;

// The session-login endpoint the WebView calls (HTTP Basic) to pick up the
// session cookie RomM's web frontend needs. Verified against RomM's backend
// source (endpoints/auth.py mounted at /api), but kept editable in case a
// future release moves it.
export const DEFAULT_LOGIN_PATH = '/api/login';

export function buildPlayPath(template: string, romId: number): string {
  return template.replace('{id}', String(romId));
}

export async function getPlayPathTemplate(): Promise<string> {
  const stored = await AsyncStorage.getItem(PLAY_PATH_TEMPLATE_KEY);
  return stored ?? DEFAULT_PLAY_PATH_TEMPLATE;
}

export async function setPlayPathTemplate(template: string): Promise<void> {
  await AsyncStorage.setItem(PLAY_PATH_TEMPLATE_KEY, template);
}

export async function getLoginPath(): Promise<string> {
  const stored = await AsyncStorage.getItem(LOGIN_PATH_KEY);
  return stored ?? DEFAULT_LOGIN_PATH;
}

export async function setLoginPath(path: string): Promise<void> {
  await AsyncStorage.setItem(LOGIN_PATH_KEY, path);
}

export async function getInBrowserPlayEnabled(): Promise<boolean> {
  const stored = await AsyncStorage.getItem(IN_BROWSER_PLAY_ENABLED_KEY);
  return stored === null ? DEFAULT_IN_BROWSER_PLAY_ENABLED : stored === 'true';
}

export async function setInBrowserPlayEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(IN_BROWSER_PLAY_ENABLED_KEY, String(enabled));
}

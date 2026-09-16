import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAY_PATH_TEMPLATE_KEY = 'rommstream.playPathTemplate';
const LOGIN_PATH_KEY = 'rommstream.loginPath';

// RomM's web frontend route for a rom's detail/play page. This has moved
// between RomM releases, so it's kept editable from the Settings screen
// instead of hardcoded — use `{id}` as the rom id placeholder.
export const DEFAULT_PLAY_PATH_TEMPLATE = '/rom/{id}';

// The session-login endpoint the WebView POSTs credentials to, to pick up an
// httpOnly session cookie for RomM's web frontend. This has also moved
// between RomM versions (`/login` vs `/api/auth/login`), so it's editable too.
export const DEFAULT_LOGIN_PATH = '/api/auth/login';

export async function getPlayPathTemplate(): Promise<string> {
  const stored = await AsyncStorage.getItem(PLAY_PATH_TEMPLATE_KEY);
  return stored ?? DEFAULT_PLAY_PATH_TEMPLATE;
}

export async function setPlayPathTemplate(template: string): Promise<void> {
  await AsyncStorage.setItem(PLAY_PATH_TEMPLATE_KEY, template);
}

export function buildPlayPath(template: string, romId: number): string {
  return template.replace('{id}', String(romId));
}

export async function getLoginPath(): Promise<string> {
  const stored = await AsyncStorage.getItem(LOGIN_PATH_KEY);
  return stored ?? DEFAULT_LOGIN_PATH;
}

export async function setLoginPath(path: string): Promise<void> {
  await AsyncStorage.setItem(LOGIN_PATH_KEY, path);
}

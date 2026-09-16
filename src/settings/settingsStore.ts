import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAY_PATH_TEMPLATE_KEY = 'rommstream.playPathTemplate';
// Key bumped when the default changed from /api/auth/login (which was never
// correct) so a stale saved value doesn't override the fix.
const LOGIN_PATH_KEY = 'rommstream.loginPath.v2';

// RomM's web frontend route for a rom's detail/play page. This has moved
// between RomM releases, so it's kept editable from the Settings screen
// instead of hardcoded — use `{id}` as the rom id placeholder.
export const DEFAULT_PLAY_PATH_TEMPLATE = '/rom/{id}';

// The session-login endpoint the WebView calls (HTTP Basic) to pick up the
// session cookie RomM's web frontend needs. Verified against RomM's backend
// source (endpoints/auth.py mounted at /api), but kept editable in case a
// future release moves it.
export const DEFAULT_LOGIN_PATH = '/api/login';

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

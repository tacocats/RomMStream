import AsyncStorage from '@react-native-async-storage/async-storage';

const PLAY_PATH_TEMPLATE_KEY = 'rommstream.playPathTemplate';

// RomM's web frontend route for a rom's detail/play page. This has moved
// between RomM releases, so it's kept editable from the Settings screen
// instead of hardcoded — use `{id}` as the rom id placeholder.
export const DEFAULT_PLAY_PATH_TEMPLATE = '/rom/{id}';

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

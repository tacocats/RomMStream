import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys are versioned: bumping one discards a saved value whose meaning or
// correct default changed, so it can't override a fix.
const PLAY_PATH_TEMPLATE_KEY = 'rommstream.playPathTemplate.v2';
const LOGIN_PATH_KEY = 'rommstream.loginPath.v2';

// "auto" mirrors the Play button in RomM's frontend
// (components/common/Game/PlayBtn.vue): pick the web player route for the
// rom's platform, falling back to the rom page for platforms with no
// in-browser player. Any other value is used as a literal path template
// with `{id}` as the rom id placeholder.
export const AUTO_PLAY_PATH = 'auto';
export const DEFAULT_PLAY_PATH_TEMPLATE = AUTO_PLAY_PATH;

// The session-login endpoint the WebView calls (HTTP Basic) to pick up the
// session cookie RomM's web frontend needs. Verified against RomM's backend
// source (endpoints/auth.py mounted at /api), but kept editable in case a
// future release moves it.
export const DEFAULT_LOGIN_PATH = '/api/login';

// Platform slugs with an EmulatorJS core, copied from _EJS_CORES_MAP in
// RomM's frontend/src/utils/index.ts (including its nightly cores map).
// Some spellings look odd; they are RomM's own keys, kept verbatim.
const EJS_PLATFORM_SLUGS = new Set([
  '3do',
  '3ds',
  'acpc',
  'amiga',
  'amiga-cd32',
  'arcade',
  'atari-2600-plus',
  'atari-lynx-mkii',
  'atari2600',
  'atari5200',
  'atari7800',
  'c-plus-4',
  'c128',
  'c64',
  'colecovision',
  'commmodore-128',
  'commodore-64c',
  'cpet',
  'doom',
  'dos',
  'famicom',
  'fds',
  'game-boy-adavance-sp',
  'game-boy-light',
  'game-boy-micro',
  'game-boy-pocket',
  'game-televisison',
  'gamegear',
  'gb',
  'gba',
  'gbc',
  'genesis',
  'intellivision',
  'ique-player',
  'jaguar',
  'lynx',
  'master-system-girl',
  'master-system-super-compact',
  'mega-pc',
  'n64',
  'nds',
  'neo-geo-pocket',
  'neo-geo-pocket-color',
  'neogeoaes',
  'neogeomvs',
  'nes',
  'new-nintendo-3ds',
  'new-style-nes',
  'new-style-super-nes-model-sns-101',
  'nintendo-ds-lite',
  'nintendo-dsi',
  'nintendo-dsi-xl',
  'pc-fx',
  'philips-cd-i',
  'psp',
  'psx',
  'saturn',
  'sega-game-box-9',
  'sega-mark-iii',
  'sega-master-system-ii',
  'sega-mega-drive-2-slash-genesis',
  'sega-mega-jet',
  'sega-nomad',
  'sega32',
  'segacd',
  'sfam',
  'sms',
  'snes',
  'super-famicom-jr-model-shvc-101',
  'super-famicom-shvc-001',
  'super-nintendo-original-european-version',
  'supergrafx',
  'swancrystal',
  'tera-drive',
  'tg16',
  'turbografx-cd',
  'vic-20',
  'virtualboy',
  'wonderswan',
  'wonderswan-color',
  'zxs',
]);

export interface PlayTarget {
  id: number;
  platformSlug: string;
}

function resolveAutoPlayPath({ id, platformSlug }: PlayTarget): string {
  const slug = platformSlug.toLowerCase();
  if (EJS_PLATFORM_SLUGS.has(slug)) {
    return `/rom/${id}/ejs`;
  }
  if (slug === 'flash' || slug === 'browser') {
    return `/rom/${id}/ruffle`;
  }
  if (slug === 'win3x' || slug === 'win9x') {
    return `/rom/${id}/jsdos`;
  }
  if (slug === 'pico') {
    return `/rom/${id}/pico8`;
  }
  return `/rom/${id}`;
}

export function buildPlayPath(template: string, target: PlayTarget): string {
  if (template === AUTO_PLAY_PATH) {
    return resolveAutoPlayPath(target);
  }
  return template.replace('{id}', String(target.id));
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

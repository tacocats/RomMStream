import { Heartbeat, playPath, Rom, StreamingConfig } from '../playPath';

const NOTHING_DISABLED: Heartbeat = { EMULATION: {} };
const NO_STREAMING: StreamingConfig = { enabled: false, containers: [] };

function rom(overrides: Partial<Rom> = {}): Rom {
  return {
    id: 5,
    platform_slug: 'snes',
    has_file_on_disk: true,
    ...overrides,
  };
}

function resolve(
  target: Rom | null,
  overrides: Partial<Parameters<typeof playPath>[1]> = {},
) {
  return playPath(target, {
    heartbeat: NOTHING_DISABLED,
    streaming: NO_STREAMING,
    ...overrides,
  });
}

describe('playPath', () => {
  it.each([
    ['snes', '/rom/5/ejs'],
    ['SNES', '/rom/5/ejs'],
    ['gba', '/rom/5/ejs'],
    ['psx', '/rom/5/ejs'],
    ['flash', '/rom/5/ruffle'],
    ['browser', '/rom/5/ruffle'],
    ['switch', null],
    ['', null],
  ])('routes platform %p to %p', (platform_slug, expected) => {
    expect(resolve(rom({ platform_slug }))).toBe(expected);
  });

  it('routes a js-dos bundle to the js-dos player', () => {
    const bundle = rom({ platform_slug: 'win3x', fs_extension: 'jsdos' });

    expect(resolve(bundle)).toBe('/rom/5/jsdos');
    // A plain win9x rom that isn't a bundle has no player.
    expect(resolve(rom({ platform_slug: 'win9x' }))).toBeNull();
  });

  it('routes a PICO-8 cartridge to the PICO-8 player', () => {
    const cart = rom({ platform_slug: 'pico', fs_name: 'celeste.p8.png' });

    expect(resolve(cart)).toBe('/rom/5/pico8');
    expect(resolve(rom({ platform_slug: 'pico' }))).toBeNull();
  });

  it('resolves a platform through the configured version aliases', () => {
    expect(
      resolve(rom({ platform_slug: 'snes-clone' }), {
        config: { PLATFORMS_VERSIONS: { 'snes-clone': 'snes' } },
      }),
    ).toBe('/rom/5/ejs');
  });

  it('honours the emulators the server has switched off', () => {
    expect(
      resolve(rom(), {
        heartbeat: { EMULATION: { DISABLE_EMULATOR_JS: true } },
      }),
    ).toBeNull();
  });

  it('has no route for a rom without a file on disk', () => {
    expect(resolve(rom({ has_file_on_disk: false }))).toBeNull();
    expect(resolve(null)).toBeNull();
  });

  describe('streaming', () => {
    const streaming: StreamingConfig = {
      enabled: true,
      containers: [{ platform: 'snes', container: 'romm-snes' }],
    };

    it('prefers the stream over the browser emulator', () => {
      expect(resolve(rom(), { streaming })).toBe('/rom/5/stream');
    });

    it('stays on the browser emulator for a platform with no container', () => {
      expect(resolve(rom({ platform_slug: 'gba' }), { streaming })).toBe(
        '/rom/5/ejs',
      );
    });

    it('ignores the containers while streaming is disabled', () => {
      expect(
        resolve(rom(), { streaming: { ...streaming, enabled: false } }),
      ).toBe('/rom/5/ejs');
    });

    it('only offers the stream when asked for one explicitly', () => {
      expect(resolve(rom(), { player: 'stream', streaming })).toBe(
        '/rom/5/stream',
      );
      expect(resolve(rom(), { player: 'stream' })).toBeNull();
    });

    it('skips the stream for a local launch', () => {
      expect(resolve(rom(), { player: 'local', streaming })).toBe('/rom/5/ejs');
    });
  });

  describe('with in-browser play disabled', () => {
    const localOff = { inBrowserPlayEnabled: false };

    it('leaves a rom with no streaming container unplayable', () => {
      expect(resolve(rom(), localOff)).toBeNull();
      expect(resolve(rom(), { ...localOff, player: 'local' })).toBeNull();
    });

    it('still streams a platform that has a container', () => {
      expect(
        resolve(rom(), {
          ...localOff,
          streaming: {
            enabled: true,
            containers: [{ platform: 'snes', container: 'romm-snes' }],
          },
        }),
      ).toBe('/rom/5/stream');
    });
  });
});

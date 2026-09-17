import {
  fetchCall,
  fetchFormBody,
  fetchMock,
  fetchUrl,
  mockFetchOnce,
} from '../../testUtils/fetchMock';
import {
  getCollections,
  getPlatforms,
  getRecentlyAddedRoms,
  getRecommendations,
  getRom,
  getRoms,
  getRomsByCollection,
  getRomsByVirtualCollection,
  getStats,
  getVirtualCollections,
  login,
  normalizeServerUrl,
  refreshAccessToken,
} from '../rommClient';
import { RommApiError, RommRom } from '../types';

const SERVER = 'https://romm.test';
const TOKENS = {
  access_token: 'access',
  refresh_token: 'refresh',
  token_type: 'bearer',
  expires: 900,
  refresh_expires: 86400,
};

function makeRoms(count: number, startId: number): RommRom[] {
  return Array.from({ length: count }, (_, i) => ({
    id: startId + i,
    name: `Game ${startId + i}`,
    platform_id: 1,
  }));
}

describe('normalizeServerUrl', () => {
  it('prefixes https:// when no scheme is given', () => {
    expect(normalizeServerUrl('romm.example.com')).toBe(
      'https://romm.example.com',
    );
  });

  it('keeps an explicit http:// scheme', () => {
    expect(normalizeServerUrl('http://192.168.1.10:8080')).toBe(
      'http://192.168.1.10:8080',
    );
  });

  it('strips whitespace and trailing slashes', () => {
    expect(normalizeServerUrl('  https://romm.example.com///  ')).toBe(
      'https://romm.example.com',
    );
  });

  it('is case-insensitive about the scheme', () => {
    expect(normalizeServerUrl('HTTPS://romm.example.com')).toBe(
      'HTTPS://romm.example.com',
    );
  });
});

describe('login', () => {
  it('posts password-grant form data to /api/token and returns the tokens', async () => {
    mockFetchOnce({ body: TOKENS });

    await expect(login(SERVER, 'user', 'p&ss word')).resolves.toEqual(TOKENS);

    const [url, init] = fetchCall();
    expect(url).toBe(`${SERVER}/api/token`);
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({
      'Content-Type': 'application/x-www-form-urlencoded',
    });
    const body = fetchFormBody();
    expect(body.get('grant_type')).toBe('password');
    expect(body.get('username')).toBe('user');
    expect(body.get('password')).toBe('p&ss word');
    expect(body.get('scope')).toBe(
      'me.read platforms.read roms.read collections.read',
    );
  });

  it('throws a RommApiError carrying the server detail and status', async () => {
    mockFetchOnce({
      status: 401,
      body: { detail: 'Incorrect username or password' },
    });

    const error = await login(SERVER, 'user', 'nope').catch(e => e);
    expect(error).toBeInstanceOf(RommApiError);
    expect(error.name).toBe('RommApiError');
    expect(error.message).toBe('Incorrect username or password');
    expect(error.status).toBe(401);
  });

  it('falls back to the status text for non-JSON error bodies', async () => {
    mockFetchOnce({
      status: 502,
      statusText: 'Bad Gateway',
      text: '<html>proxy error</html>',
    });

    await expect(login(SERVER, 'user', 'pw')).rejects.toThrow('Bad Gateway');
  });

  it('falls back to the status code when there is no status text', async () => {
    mockFetchOnce({ status: 502, text: '' });

    await expect(login(SERVER, 'user', 'pw')).rejects.toThrow(
      'Request failed (502)',
    );
  });
});

describe('refreshAccessToken', () => {
  it('posts a refresh_token grant', async () => {
    mockFetchOnce({ body: TOKENS });

    await expect(refreshAccessToken(SERVER, 'old-refresh')).resolves.toEqual(
      TOKENS,
    );

    expect(fetchCall()[0]).toBe(`${SERVER}/api/token`);
    const body = fetchFormBody();
    expect(body.get('grant_type')).toBe('refresh_token');
    expect(body.get('refresh_token')).toBe('old-refresh');
  });
});

describe('getPlatforms', () => {
  it('sends the bearer token and returns a plain array response', async () => {
    const platforms = [{ id: 1, name: 'SNES' }];
    mockFetchOnce({ body: platforms });

    await expect(getPlatforms(SERVER, 'tok')).resolves.toEqual(platforms);

    const [url, init] = fetchCall();
    expect(url).toBe(`${SERVER}/api/platforms`);
    expect(init?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('unwraps an { items } envelope', async () => {
    const platforms = [{ id: 1, name: 'SNES' }];
    mockFetchOnce({ body: { items: platforms, total: 1 } });

    await expect(getPlatforms(SERVER, 'tok')).resolves.toEqual(platforms);
  });

  it('returns an empty list for an unrecognised body', async () => {
    mockFetchOnce({ body: { message: 'nothing here' } });

    await expect(getPlatforms(SERVER, 'tok')).resolves.toEqual([]);
  });

  it('propagates API errors', async () => {
    mockFetchOnce({ status: 401, body: { detail: 'expired' } });

    await expect(getPlatforms(SERVER, 'tok')).rejects.toMatchObject({
      status: 401,
    });
  });
});

describe('getRom', () => {
  it('requests a single rom by id', async () => {
    const rom = {
      id: 5,
      name: 'Zelda',
      platform_id: 1,
      summary: 'An adventure.',
    };
    mockFetchOnce({ body: rom });

    await expect(getRom(SERVER, 'tok', 5)).resolves.toEqual(rom);

    const [url, init] = fetchCall();
    expect(url).toBe(`${SERVER}/api/roms/5`);
    expect(init?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('propagates a 404', async () => {
    mockFetchOnce({ status: 404, body: { detail: 'Rom not found' } });

    await expect(getRom(SERVER, 'tok', 999)).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('getRoms', () => {
  it('requests the platform sorted by name, 500 at a time', async () => {
    mockFetchOnce({
      body: { items: makeRoms(3, 1), total: 3, limit: 500, offset: 0 },
    });

    const roms = await getRoms(SERVER, 'tok', 7);

    expect(roms).toHaveLength(3);
    const url = fetchUrl();
    expect(url.pathname).toBe('/api/roms');
    expect(url.searchParams.get('platform_ids')).toBe('7');
    expect(url.searchParams.get('limit')).toBe('500');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(url.searchParams.get('order_by')).toBe('name');
    expect(url.searchParams.get('order_dir')).toBe('asc');
    expect(fetchCall()[1]?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('omits platform_ids when no platform is given', async () => {
    mockFetchOnce({ body: { items: [], total: 0 } });

    await getRoms(SERVER, 'tok');

    expect(fetchUrl().searchParams.has('platform_ids')).toBe(false);
  });

  it('pages through the whole platform using offset', async () => {
    mockFetchOnce({ body: { items: makeRoms(500, 0), total: 1020 } });
    mockFetchOnce({ body: { items: makeRoms(500, 500), total: 1020 } });
    mockFetchOnce({ body: { items: makeRoms(20, 1000), total: 1020 } });

    const roms = await getRoms(SERVER, 'tok', 1);

    expect(roms).toHaveLength(1020);
    expect(roms[0].id).toBe(0);
    expect(roms[1019].id).toBe(1019);
    expect(fetchMock()).toHaveBeenCalledTimes(3);
    expect(fetchUrl(0).searchParams.get('offset')).toBe('0');
    expect(fetchUrl(1).searchParams.get('offset')).toBe('500');
    expect(fetchUrl(2).searchParams.get('offset')).toBe('1000');
  });

  it('stops as soon as the reported total has been reached', async () => {
    mockFetchOnce({ body: { items: makeRoms(500, 0), total: 500 } });

    const roms = await getRoms(SERVER, 'tok', 1);

    expect(roms).toHaveLength(500);
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('treats a plain array response as the complete list', async () => {
    mockFetchOnce({ body: makeRoms(500, 0) });

    const roms = await getRoms(SERVER, 'tok', 1);

    expect(roms).toHaveLength(500);
    expect(fetchMock()).toHaveBeenCalledTimes(1);
  });

  it('propagates API errors from any page', async () => {
    mockFetchOnce({ body: { items: makeRoms(500, 0), total: 600 } });
    mockFetchOnce({ status: 500, body: { detail: 'boom' } });

    await expect(getRoms(SERVER, 'tok', 1)).rejects.toThrow('boom');
  });
});

describe('getRomsByCollection', () => {
  it('requests roms filtered by collection_id', async () => {
    mockFetchOnce({ body: { items: makeRoms(2, 1), total: 2 } });

    const roms = await getRomsByCollection(SERVER, 'tok', 42);

    expect(roms).toHaveLength(2);
    const url = fetchUrl();
    expect(url.pathname).toBe('/api/roms');
    expect(url.searchParams.get('collection_id')).toBe('42');
    expect(url.searchParams.has('platform_ids')).toBe(false);
  });
});

describe('getRomsByVirtualCollection', () => {
  it('requests roms filtered by virtual_collection_id', async () => {
    mockFetchOnce({ body: { items: makeRoms(2, 1), total: 2 } });

    const roms = await getRomsByVirtualCollection(SERVER, 'tok', 'zelda-1');

    expect(roms).toHaveLength(2);
    const url = fetchUrl();
    expect(url.pathname).toBe('/api/roms');
    expect(url.searchParams.get('virtual_collection_id')).toBe('zelda-1');
  });
});

describe('getRecentlyAddedRoms', () => {
  it('orders by creation date, newest first, without the gallery sidecars', async () => {
    mockFetchOnce({ body: { items: makeRoms(5, 1), total: 5 } });

    const roms = await getRecentlyAddedRoms(SERVER, 'tok');

    expect(roms).toHaveLength(5);
    const url = fetchUrl();
    expect(url.pathname).toBe('/api/roms');
    expect(url.searchParams.get('order_by')).toBe('created_at');
    expect(url.searchParams.get('order_dir')).toBe('desc');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(url.searchParams.get('with_char_index')).toBe('false');
    expect(url.searchParams.get('with_filter_values')).toBe('false');
    expect(url.searchParams.get('with_rom_id_index')).toBe('false');
  });

  it('honours a custom limit', async () => {
    mockFetchOnce({ body: { items: makeRoms(3, 1), total: 3 } });

    await getRecentlyAddedRoms(SERVER, 'tok', 3);

    expect(fetchUrl().searchParams.get('limit')).toBe('3');
  });
});

describe('getRecommendations', () => {
  it('returns the ranked feed', async () => {
    const feed = [
      {
        rom: { id: 1, name: 'Zelda', platform_id: 1 },
        score: 0.9,
        reasons: [{ facet: 'franchise', value: 'Zelda' }],
        seed_rom_id: 5,
        seed_rom_name: 'Ocarina of Time',
      },
    ];
    mockFetchOnce({ body: feed });

    await expect(getRecommendations(SERVER, 'tok')).resolves.toEqual(feed);

    const url = fetchUrl();
    expect(url.pathname).toBe('/api/recommendations');
    expect(url.searchParams.get('limit')).toBe('20');
    expect(fetchCall()[1]?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('returns an empty list for an unrecognised body', async () => {
    mockFetchOnce({ body: { detail: 'nothing here' } });

    await expect(getRecommendations(SERVER, 'tok')).resolves.toEqual([]);
  });
});

describe('getCollections', () => {
  it('returns the collections list', async () => {
    const collections = [{ id: 1, name: 'Platformers', rom_count: 12 }];
    mockFetchOnce({ body: collections });

    await expect(getCollections(SERVER, 'tok')).resolves.toEqual(collections);
    expect(fetchUrl().pathname).toBe('/api/collections');
  });

  it('returns an empty list for an unrecognised body', async () => {
    mockFetchOnce({ body: { detail: 'nothing here' } });

    await expect(getCollections(SERVER, 'tok')).resolves.toEqual([]);
  });
});

describe('getVirtualCollections', () => {
  it('defaults to the IGDB collection facet', async () => {
    const collections = [{ id: 'collection-1', name: 'Zelda', rom_count: 5 }];
    mockFetchOnce({ body: collections });

    await expect(getVirtualCollections(SERVER, 'tok')).resolves.toEqual(
      collections,
    );
    const url = fetchUrl();
    expect(url.pathname).toBe('/api/collections/virtual');
    expect(url.searchParams.get('type')).toBe('collection');
    expect(url.searchParams.get('limit')).toBe('20');
  });

  it('honours a custom type and limit', async () => {
    mockFetchOnce({ body: [] });

    await getVirtualCollections(SERVER, 'tok', 'genre', 5);

    const url = fetchUrl();
    expect(url.searchParams.get('type')).toBe('genre');
    expect(url.searchParams.get('limit')).toBe('5');
  });

  it('returns an empty list for an unrecognised body', async () => {
    mockFetchOnce({ body: { detail: 'nothing here' } });

    await expect(getVirtualCollections(SERVER, 'tok')).resolves.toEqual([]);
  });
});

describe('getStats', () => {
  it('returns the stats payload', async () => {
    const stats = {
      PLATFORMS: 33,
      ROMS: 3164,
      SAVES: 2,
      STATES: 1,
      SCREENSHOTS: 1,
      TOTAL_FILESIZE_BYTES: 678972030976,
    };
    mockFetchOnce({ body: stats });

    await expect(getStats(SERVER, 'tok')).resolves.toEqual(stats);
    expect(fetchUrl().pathname).toBe('/api/stats');
  });

  it('propagates API errors', async () => {
    mockFetchOnce({ status: 401, body: { detail: 'expired' } });

    await expect(getStats(SERVER, 'tok')).rejects.toMatchObject({
      status: 401,
    });
  });
});

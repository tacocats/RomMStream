import { fetchCall, fetchUrl, mockFetchOnce } from '../../testUtils/fetchMock';
import { searchRoms } from '../rommClient';

const SERVER = 'https://romm.test';

describe('searchRoms', () => {
  it('queries /api/roms with the search term, sorted by name', async () => {
    const roms = [{ id: 1, name: 'Zelda', platform_id: 3 }];
    mockFetchOnce({ body: { items: roms, total: 1 } });

    await expect(searchRoms(SERVER, 'tok', 'zel da')).resolves.toEqual(roms);

    const url = fetchUrl();
    expect(url.pathname).toBe('/api/roms');
    expect(url.searchParams.get('search_term')).toBe('zel da');
    expect(url.searchParams.get('limit')).toBe('100');
    expect(url.searchParams.get('offset')).toBe('0');
    expect(url.searchParams.get('order_by')).toBe('name');
    expect(url.searchParams.get('order_dir')).toBe('asc');
    expect(fetchCall()[1]?.headers).toEqual({ Authorization: 'Bearer tok' });
  });

  it('accepts a plain array response', async () => {
    const roms = [{ id: 1, name: 'Zelda', platform_id: 3 }];
    mockFetchOnce({ body: roms });

    await expect(searchRoms(SERVER, 'tok', 'zelda')).resolves.toEqual(roms);
  });

  it('propagates API errors', async () => {
    mockFetchOnce({ status: 401, body: { detail: 'expired' } });

    await expect(searchRoms(SERVER, 'tok', 'zelda')).rejects.toMatchObject({
      status: 401,
      message: 'expired',
    });
  });
});

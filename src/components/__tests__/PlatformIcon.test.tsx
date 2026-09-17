import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import React from 'react';
import { fetchCall, fetchMock, mockFetchOnce } from '../../testUtils/fetchMock';
import { iconCandidates, PlatformIcon } from '../PlatformIcon';

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><style>.cls-1{fill:#c1c1c1;}</style>' +
  '<path class="cls-1" d="M0 0"/></svg>';

const BASE = 'https://romm.test/assets/platforms';

describe('iconCandidates', () => {
  it('mirrors the web UI order: fs_slug before slug, vector before ico', () => {
    expect(
      iconCandidates('https://romm.test', ['SNES-roms', 'snes']).map(
        c => c.url,
      ),
    ).toEqual([
      `${BASE}/snes-roms.svg`,
      `${BASE}/systematic/snes-roms.svg`,
      `${BASE}/snes-roms.ico`,
      `${BASE}/snes.svg`,
      `${BASE}/systematic/snes.svg`,
      `${BASE}/snes.ico`,
    ]);
  });

  it('collapses duplicate, empty and differently-cased slugs', () => {
    expect(
      iconCandidates('https://romm.test', ['PSVita', undefined, '', 'psvita']),
    ).toHaveLength(3);
  });
});

describe('PlatformIcon', () => {
  it('loads the fs_slug icon first and hands SvgXml the inlined markup', async () => {
    mockFetchOnce({ text: SVG });

    await render(
      <PlatformIcon
        serverUrl="https://romm.test"
        name="Super Nintendo"
        fsSlug="SNES"
        slug="snes"
      />,
    );

    const icon = await screen.findByTestId('svg-xml');
    expect(fetchMock()).toHaveBeenCalledTimes(1);
    expect(fetchCall()[0]).toBe(`${BASE}/snes.svg`);
    expect(icon.props.xml).toContain('style="fill:#c1c1c1;"');
    expect(icon.props.xml).not.toContain('<style');
    expect(icon.props.width).toBe(56);
    expect(icon.props.height).toBe(56);
  });

  it('falls back to the systematic vector set when the classic svg is missing', async () => {
    mockFetchOnce({ status: 404 });
    mockFetchOnce({ text: SVG });

    await render(
      <PlatformIcon
        serverUrl="https://romm.test"
        name="PlayStation Vita"
        fsSlug="psvita"
        slug="psvita"
      />,
    );

    await screen.findByTestId('svg-xml');
    expect(fetchMock()).toHaveBeenCalledTimes(2);
    expect(fetchCall(0)[0]).toBe(`${BASE}/psvita.svg`);
    expect(fetchCall(1)[0]).toBe(`${BASE}/systematic/psvita.svg`);
  });

  it('renders the .ico as an image when no svg exists, then moves on to the slug', async () => {
    mockFetchOnce({ status: 404 });
    mockFetchOnce({ status: 404 });
    mockFetchOnce({ text: SVG });

    await render(
      <PlatformIcon
        serverUrl="https://romm.test"
        name="Nintendo 64"
        fsSlug="N64-roms"
        slug="n64"
      />,
    );

    const image = await screen.findByTestId('platform-icon-image');
    expect(image.props.source).toEqual({ uri: `${BASE}/n64-roms.ico` });
    expect(fetchMock()).toHaveBeenCalledTimes(2);

    await act(async () => {
      fireEvent(image, 'error');
    });

    await screen.findByTestId('svg-xml');
    expect(fetchCall(2)[0]).toBe(`${BASE}/n64.svg`);
  });

  it('treats a 200 that is not svg markup (the SPA fallback page) as missing', async () => {
    mockFetchOnce({ text: '<!doctype html><html><body>RomM</body></html>' });
    mockFetchOnce({ text: SVG });

    await render(
      <PlatformIcon
        serverUrl="https://romm.test"
        name="Saturn"
        slug="saturn"
      />,
    );

    const icon = await screen.findByTestId('svg-xml');
    expect(icon.props.xml).toContain('<path');
    expect(fetchCall(1)[0]).toBe(`${BASE}/systematic/saturn.svg`);
  });

  it('shows a letter badge when no icon can be loaded', async () => {
    // arcade.svg, systematic/arcade.svg, then (after the .ico errors)
    // mame.svg and systematic/mame.svg.
    mockFetchOnce({ status: 404 });
    mockFetchOnce({ status: 404 });
    mockFetchOnce({ status: 404 });
    mockFetchOnce({ status: 500 });

    await render(
      <PlatformIcon
        serverUrl="https://romm.test"
        name="arcade"
        fsSlug="arcade"
        slug="mame"
        size={40}
      />,
    );

    const first = await screen.findByTestId('platform-icon-image');
    expect(first.props.source).toEqual({ uri: `${BASE}/arcade.ico` });
    await act(async () => {
      fireEvent(first, 'error');
    });

    await waitFor(() =>
      expect(screen.getByTestId('platform-icon-image').props.source).toEqual({
        uri: `${BASE}/mame.ico`,
      }),
    );
    await act(async () => {
      fireEvent(screen.getByTestId('platform-icon-image'), 'error');
    });

    await screen.findByText('A');
    expect(fetchMock()).toHaveBeenCalledTimes(4);
    expect(screen.queryByTestId('svg-xml')).toBeNull();
    expect(screen.queryByTestId('platform-icon-image')).toBeNull();
  });

  it('shows a letter badge straight away when the platform has no slugs', async () => {
    await render(
      <PlatformIcon serverUrl="https://romm.test" name="homebrew" />,
    );

    expect(screen.getByText('H')).toBeOnTheScreen();
    expect(fetchMock()).not.toHaveBeenCalled();
  });

  it('ignores a response that arrives after unmounting', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    fetchMock().mockReturnValueOnce(
      new Promise(resolve => {
        resolveFetch = resolve;
      }),
    );
    const { unmount } = await render(
      <PlatformIcon serverUrl="https://romm.test" name="Game Boy" slug="gb" />,
    );

    unmount();
    resolveFetch({ ok: true, text: async () => SVG });

    await waitFor(() => expect(screen.queryByTestId('svg-xml')).toBeNull());
  });
});

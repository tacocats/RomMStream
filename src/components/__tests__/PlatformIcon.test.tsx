import { render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { fetchCall, fetchMock, mockFetchOnce } from '../../testUtils/fetchMock';
import { PlatformIcon } from '../PlatformIcon';

const SVG =
  '<svg xmlns="http://www.w3.org/2000/svg"><style>.cls-1{fill:#c1c1c1;}</style>' +
  '<path class="cls-1" d="M0 0"/></svg>';

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
    expect(fetchCall()[0]).toBe('https://romm.test/assets/platforms/snes.svg');
    expect(icon.props.xml).toContain('style="fill:#c1c1c1;"');
    expect(icon.props.xml).not.toContain('<style');
    expect(icon.props.width).toBe(56);
    expect(icon.props.height).toBe(56);
  });

  it('falls back to the slug when the fs_slug icon is missing', async () => {
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

    await screen.findByTestId('svg-xml');
    expect(fetchCall(0)[0]).toBe(
      'https://romm.test/assets/platforms/n64-roms.svg',
    );
    expect(fetchCall(1)[0]).toBe('https://romm.test/assets/platforms/n64.svg');
  });

  it('shows a letter badge when no icon can be loaded', async () => {
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

    await screen.findByText('A');
    expect(fetchMock()).toHaveBeenCalledTimes(2);
    expect(screen.queryByTestId('svg-xml')).toBeNull();
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

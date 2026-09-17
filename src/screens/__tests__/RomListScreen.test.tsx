import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { getRoms } from '../../api/rommClient';
import { useAuth } from '../../auth/AuthContext';
import { createAuthValue } from '../../testUtils/mockAuth';
import { createScreenProps } from '../../testUtils/navigation';
import { RomListScreen } from '../RomListScreen';

jest.mock('../../auth/AuthContext');
jest.mock('../../api/rommClient');

const mockedUseAuth = jest.mocked(useAuth);
const mockedGetRoms = jest.mocked(getRoms);

const ROMS = [
  {
    id: 1,
    name: 'Zelda',
    platform_id: 3,
    platform_slug: 'snes',
    url_cover: '/assets/romm/resources/1/cover.png',
  },
  {
    id: 2,
    name: 'Mario',
    platform_id: 3,
    platform_slug: 'snes',
    url_cover: 'https://cdn.example/m.png',
  },
  { id: 3, name: 'Metroid', platform_id: 3 },
];

function renderScreen() {
  const screenProps = createScreenProps('Roms', {
    platformId: 3,
    platformName: 'SNES',
  });
  return {
    ...screenProps,
    rendered: render(<RomListScreen {...screenProps.props} />),
  };
}

beforeEach(() => {
  mockedUseAuth.mockReturnValue(createAuthValue());
});

describe('RomListScreen', () => {
  it('sets the header title and lists roms sorted by name', async () => {
    mockedGetRoms.mockResolvedValueOnce([...ROMS]);
    const { navigation, rendered } = renderScreen();
    await rendered;

    expect(await screen.findByText('Zelda')).toBeOnTheScreen();
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: 'SNES' });
    expect(mockedGetRoms).toHaveBeenCalledWith(
      'https://romm.test',
      'access-token',
      3,
    );

    const tiles = screen.getAllByTestId(/^rom-tile-/);
    expect(tiles.map(tile => tile.props.testID)).toEqual([
      'rom-tile-2',
      'rom-tile-3',
      'rom-tile-1',
    ]);
  });

  it('resolves cover URLs against the server and falls back to a placeholder', async () => {
    mockedGetRoms.mockResolvedValueOnce([...ROMS]);
    const { rendered } = renderScreen();
    await rendered;
    await screen.findByText('Zelda');

    expect(screen.getByTestId('rom-cover-1').props.source).toEqual({
      uri: 'https://romm.test/assets/romm/resources/1/cover.png',
    });
    expect(screen.getByTestId('rom-cover-2').props.source).toEqual({
      uri: 'https://cdn.example/m.png',
    });
    expect(screen.queryByTestId('rom-cover-3')).toBeNull();
    expect(screen.getByTestId('rom-cover-placeholder-3')).toHaveTextContent(
      'Metroid',
    );
  });

  it('opens the player for a rom, defaulting the platform slug', async () => {
    mockedGetRoms.mockResolvedValueOnce([...ROMS]);
    const { navigation, rendered } = renderScreen();
    await rendered;

    await fireEvent.press(await screen.findByTestId('rom-tile-1'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', {
      romId: 1,
      romName: 'Zelda',
      platformSlug: 'snes',
    });

    await fireEvent.press(screen.getByTestId('rom-tile-3'));
    expect(navigation.navigate).toHaveBeenCalledWith('Player', {
      romId: 3,
      romName: 'Metroid',
      platformSlug: '',
    });
  });

  it('shows an empty state when the platform has no roms', async () => {
    mockedGetRoms.mockResolvedValueOnce([]);
    const { rendered } = renderScreen();
    await rendered;

    expect(
      await screen.findByText('No games found for this platform.'),
    ).toBeOnTheScreen();
    expect(screen.queryByTestId('roms-loading')).toBeNull();
  });

  it('shows the error and reloads on Retry', async () => {
    mockedGetRoms
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([...ROMS]);
    const { rendered } = renderScreen();
    await rendered;

    expect(await screen.findByText('Failed to fetch')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('retry-button'));

    expect(await screen.findByText('Mario')).toBeOnTheScreen();
    expect(mockedGetRoms).toHaveBeenCalledTimes(2);
  });
});

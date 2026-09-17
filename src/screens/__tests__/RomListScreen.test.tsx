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
  { id: 1, name: 'Zelda', platform_id: 3, platform_slug: 'snes' },
  { id: 2, name: 'Mario', platform_id: 3, platform_slug: 'snes' },
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

    expect(await screen.findByTestId('rom-tile-1')).toHaveTextContent(/Zelda/);
    expect(navigation.setOptions).toHaveBeenCalledWith({ title: 'SNES' });
    expect(mockedGetRoms).toHaveBeenCalledWith(
      'https://romm.test',
      'access-token',
      3,
    );
    expect(screen.queryByTestId('roms-loading')).toBeNull();

    const tiles = screen.getAllByTestId(/^rom-tile-/);
    expect(tiles.map(tile => tile.props.testID)).toEqual([
      'rom-tile-2',
      'rom-tile-3',
      'rom-tile-1',
    ]);
  });

  it('opens the player for a rom', async () => {
    mockedGetRoms.mockResolvedValueOnce([...ROMS]);
    const { navigation, rendered } = renderScreen();
    await rendered;

    await fireEvent.press(await screen.findByTestId('rom-tile-3'));

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
  });

  it('shows the error and reloads on Retry', async () => {
    mockedGetRoms
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([...ROMS]);
    const { rendered } = renderScreen();
    await rendered;

    expect(await screen.findByText('Failed to fetch')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('rom-tile-2')).toHaveTextContent(/Mario/);
    expect(mockedGetRoms).toHaveBeenCalledTimes(2);
  });
});

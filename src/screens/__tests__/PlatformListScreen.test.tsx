import {
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react-native';
import React from 'react';
import { getPlatforms } from '../../api/rommClient';
import { useAuth } from '../../auth/AuthContext';
import { AuthValue, createAuthValue } from '../../testUtils/mockAuth';
import { createScreenProps } from '../../testUtils/navigation';
import { PlatformListScreen } from '../PlatformListScreen';

jest.mock('../../auth/AuthContext');
jest.mock('../../api/rommClient');
// PlatformIcon fetches SVGs; it has its own tests.
jest.mock('../../components/PlatformIcon', () => ({
  PlatformIcon: () => null,
}));

const mockedUseAuth = jest.mocked(useAuth);
const mockedGetPlatforms = jest.mocked(getPlatforms);

const PLATFORMS = [
  { id: 2, name: 'Super Nintendo', slug: 'snes', rom_count: 12 },
  { id: 1, name: 'Game Boy', slug: 'gb', rom_count: 1 },
  { id: 3, name: 'Arcade', fs_slug: 'arcade' },
];

let auth: AuthValue;

beforeEach(() => {
  auth = createAuthValue();
  mockedUseAuth.mockReturnValue(auth);
});

describe('PlatformListScreen', () => {
  it('loads platforms through withAuth and lists them sorted by name', async () => {
    mockedGetPlatforms.mockResolvedValueOnce([...PLATFORMS]);
    const { props } = createScreenProps('Platforms', undefined);

    await render(<PlatformListScreen {...props} />);

    expect(await screen.findByText('Super Nintendo')).toBeOnTheScreen();
    expect(mockedGetPlatforms).toHaveBeenCalledWith(
      'https://romm.test',
      'access-token',
    );
    expect(screen.getByText('https://romm.test')).toBeOnTheScreen();
    expect(screen.queryByTestId('platforms-loading')).toBeNull();

    const tiles = screen.getAllByTestId(/^platform-tile-/);
    expect(tiles.map(tile => tile.props.testID)).toEqual([
      'platform-tile-3',
      'platform-tile-1',
      'platform-tile-2',
    ]);
    expect(within(tiles[1]).getByText('1 game')).toBeOnTheScreen();
    expect(within(tiles[2]).getByText('12 games')).toBeOnTheScreen();
    expect(within(tiles[0]).queryByText(/game/)).toBeNull();
  });

  it('shows a spinner while loading', async () => {
    mockedGetPlatforms.mockReturnValueOnce(new Promise(() => {}));
    const { props } = createScreenProps('Platforms', undefined);

    await render(<PlatformListScreen {...props} />);

    expect(screen.getByTestId('platforms-loading')).toBeOnTheScreen();
    expect(screen.queryAllByTestId(/^platform-tile-/)).toHaveLength(0);
  });

  it('opens the rom list for a platform', async () => {
    mockedGetPlatforms.mockResolvedValueOnce([...PLATFORMS]);
    const { props, navigation } = createScreenProps('Platforms', undefined);
    await render(<PlatformListScreen {...props} />);

    await fireEvent.press(await screen.findByTestId('platform-tile-2'));

    expect(navigation.navigate).toHaveBeenCalledWith('Roms', {
      platformId: 2,
      platformName: 'Super Nintendo',
    });
  });

  it('shows the error and reloads on Retry', async () => {
    mockedGetPlatforms
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([...PLATFORMS]);
    const { props } = createScreenProps('Platforms', undefined);
    await render(<PlatformListScreen {...props} />);

    expect(await screen.findByText('Failed to fetch')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('retry-button'));

    expect(await screen.findByText('Game Boy')).toBeOnTheScreen();
    expect(screen.queryByText('Failed to fetch')).toBeNull();
    expect(mockedGetPlatforms).toHaveBeenCalledTimes(2);
  });

  it('navigates to Settings and signs out from the header', async () => {
    mockedGetPlatforms.mockResolvedValueOnce([]);
    const { props, navigation } = createScreenProps('Platforms', undefined);
    await render(<PlatformListScreen {...props} />);

    await fireEvent.press(screen.getByTestId('settings-button'));
    expect(navigation.navigate).toHaveBeenCalledWith('Settings');

    await fireEvent.press(screen.getByTestId('sign-out-button'));
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});

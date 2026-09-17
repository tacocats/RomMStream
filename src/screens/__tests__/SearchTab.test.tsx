import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { searchRoms } from '../../api/rommClient';
import { RommRom } from '../../api/types';
import { useAuth } from '../../auth/AuthContext';
import { createAuthValue } from '../../testUtils/mockAuth';
import { createScreenProps } from '../../testUtils/navigation';
import { SEARCH_DEBOUNCE_MS, SearchTab } from '../SearchTab';

jest.mock('../../auth/AuthContext');
jest.mock('../../api/rommClient');

const mockedUseAuth = jest.mocked(useAuth);
const mockedSearchRoms = jest.mocked(searchRoms);

const RESULTS: RommRom[] = [
  { id: 1, name: 'Zelda II', platform_id: 1, platform_slug: 'nes' },
  { id: 2, name: 'A Link to the Past', platform_id: 3, platform_slug: 'snes' },
];

function renderTab() {
  const { navigation, props } = createScreenProps('Main', undefined);
  return {
    navigation,
    rendered: render(<SearchTab navigation={props.navigation} />),
  };
}

async function submitQuery(text: string) {
  await fireEvent.changeText(screen.getByTestId('search-input'), text);
  await fireEvent(screen.getByTestId('search-input'), 'submitEditing');
}

beforeEach(() => {
  mockedUseAuth.mockReturnValue(createAuthValue());
  mockedSearchRoms.mockResolvedValue([]);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SearchTab', () => {
  it('starts with a hint and no request', async () => {
    await renderTab().rendered;

    expect(
      screen.getByText('Type at least 2 characters to search your library.'),
    ).toBeOnTheScreen();
    expect(mockedSearchRoms).not.toHaveBeenCalled();
  });

  it('searches on submit and lists the results sorted by name', async () => {
    mockedSearchRoms.mockResolvedValueOnce([...RESULTS]);
    await renderTab().rendered;

    await submitQuery('  zelda ');

    expect(mockedSearchRoms).toHaveBeenCalledWith(
      'https://romm.test',
      'access-token',
      'zelda',
    );
    expect(
      await screen.findByText('Results for “zelda” · 2 games'),
    ).toBeOnTheScreen();
    const tiles = screen.getAllByTestId(/^rom-tile-/);
    expect(tiles.map(tile => tile.props.testID)).toEqual([
      'rom-tile-2',
      'rom-tile-1',
    ]);
    expect(screen.queryByTestId('search-loading')).toBeNull();
  });

  it('searches automatically once typing pauses', async () => {
    jest.useFakeTimers();
    mockedSearchRoms.mockResolvedValueOnce([RESULTS[0]]);
    await renderTab().rendered;

    await fireEvent.changeText(screen.getByTestId('search-input'), 'zel');
    expect(mockedSearchRoms).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });

    expect(mockedSearchRoms).toHaveBeenCalledWith(
      'https://romm.test',
      'access-token',
      'zel',
    );
    expect(
      await screen.findByText('Results for “zel” · 1 game'),
    ).toBeOnTheScreen();
  });

  it('does not search for fewer than two characters', async () => {
    await renderTab().rendered;

    await submitQuery('z');

    expect(mockedSearchRoms).not.toHaveBeenCalled();
    expect(
      screen.getByText('Type at least 2 characters to search your library.'),
    ).toBeOnTheScreen();
  });

  it('says when nothing matches', async () => {
    mockedSearchRoms.mockResolvedValueOnce([]);
    await renderTab().rendered;

    await submitQuery('xyzzy');

    expect(
      await screen.findByText('No games match “xyzzy”.'),
    ).toBeOnTheScreen();
  });

  it('shows the error and retries', async () => {
    mockedSearchRoms
      .mockRejectedValueOnce(new Error('Failed to fetch'))
      .mockResolvedValueOnce([RESULTS[0]]);
    await renderTab().rendered;

    await submitQuery('zelda');
    expect(await screen.findByText('Failed to fetch')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('retry-button'));

    expect(await screen.findByTestId('rom-tile-1')).toHaveTextContent(
      /Zelda II/,
    );
    expect(mockedSearchRoms).toHaveBeenCalledTimes(2);
  });

  it('ignores a slow response to an earlier query', async () => {
    let resolveFirst: (roms: RommRom[]) => void = () => {};
    mockedSearchRoms
      .mockReturnValueOnce(
        new Promise<RommRom[]>(resolve => {
          resolveFirst = resolve;
        }),
      )
      .mockResolvedValueOnce([RESULTS[1]]);
    await renderTab().rendered;

    await submitQuery('zelda');
    await submitQuery('link');
    expect(await screen.findByTestId('rom-tile-2')).toBeOnTheScreen();

    await act(async () => {
      resolveFirst([RESULTS[0]]);
    });

    expect(screen.getByTestId('rom-tile-2')).toBeOnTheScreen();
    expect(screen.queryByTestId('rom-tile-1')).toBeNull();
    expect(mockedSearchRoms).toHaveBeenCalledTimes(2);
  });

  it('filters results by platform chip', async () => {
    mockedSearchRoms.mockResolvedValueOnce([...RESULTS]);
    await renderTab().rendered;

    await submitQuery('zelda');
    expect(await screen.findByTestId('rom-tile-1')).toBeOnTheScreen();

    expect(screen.getByTestId('platform-chip-all')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('platform-chip-nes'));

    expect(screen.getByText('Results for “zelda” · 1 game')).toBeOnTheScreen();
    expect(screen.getByTestId('rom-tile-1')).toBeOnTheScreen();
    expect(screen.queryByTestId('rom-tile-2')).toBeNull();

    await fireEvent.press(screen.getByTestId('platform-chip-all'));
    expect(screen.getByTestId('rom-tile-2')).toBeOnTheScreen();
  });

  it('resets the platform filter on a new search', async () => {
    mockedSearchRoms.mockResolvedValueOnce([...RESULTS]);
    await renderTab().rendered;
    await submitQuery('zelda');
    await fireEvent.press(await screen.findByTestId('platform-chip-nes'));
    expect(screen.queryByTestId('rom-tile-2')).toBeNull();

    mockedSearchRoms.mockResolvedValueOnce([...RESULTS]);
    await submitQuery('link');

    expect(await screen.findByTestId('rom-tile-2')).toBeOnTheScreen();
    expect(screen.getByTestId('rom-tile-1')).toBeOnTheScreen();
  });

  it('clears the query with the clear button', async () => {
    await renderTab().rendered;

    await fireEvent.changeText(screen.getByTestId('search-input'), 'zelda');
    expect(screen.getByTestId('clear-search-button')).toBeOnTheScreen();

    await fireEvent.press(screen.getByTestId('clear-search-button'));

    expect(screen.getByTestId('search-input').props.value).toBe('');
    expect(screen.queryByTestId('clear-search-button')).toBeNull();
  });

  it('opens the player for a result', async () => {
    mockedSearchRoms.mockResolvedValueOnce([...RESULTS]);
    const { navigation, rendered } = renderTab();
    await rendered;

    await submitQuery('zelda');
    await fireEvent.press(await screen.findByTestId('rom-tile-1'));

    expect(navigation.navigate).toHaveBeenCalledWith('Player', {
      romId: 1,
      romName: 'Zelda II',
      platformSlug: 'nes',
    });
  });
});

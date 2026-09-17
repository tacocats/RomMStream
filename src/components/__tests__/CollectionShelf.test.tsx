import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { CollectionShelf } from '../CollectionShelf';

const COLLECTIONS = [
  { id: 1, name: 'Platformers', rom_count: 12 },
  { id: 2, name: 'Beat em ups', rom_count: 1 },
];

describe('CollectionShelf', () => {
  it('renders a title and a tile per collection, with a pluralised count', async () => {
    await render(
      <CollectionShelf
        title="Collections"
        collections={COLLECTIONS}
        serverUrl="https://romm.test"
        onSelect={jest.fn()}
        testID="collections-shelf"
      />,
    );

    expect(screen.getByText('Collections')).toBeOnTheScreen();
    expect(screen.getByText('Platformers')).toBeOnTheScreen();
    expect(screen.getByText('12 games')).toBeOnTheScreen();
    expect(screen.getByText('1 game')).toBeOnTheScreen();
  });

  it('renders nothing when there are no collections', async () => {
    await render(
      <CollectionShelf
        title="Collections"
        collections={[]}
        serverUrl="https://romm.test"
        onSelect={jest.fn()}
        testID="collections-shelf"
      />,
    );

    expect(screen.queryByTestId('collections-shelf')).toBeNull();
  });

  it('reports the collection whose tile was pressed', async () => {
    const onSelect = jest.fn();
    await render(
      <CollectionShelf
        title="Collections"
        collections={COLLECTIONS}
        serverUrl="https://romm.test"
        onSelect={onSelect}
        testID="collections-shelf"
      />,
    );

    await fireEvent.press(screen.getByTestId('collections-shelf-tile-2'));

    expect(onSelect).toHaveBeenCalledWith(COLLECTIONS[1]);
  });
});

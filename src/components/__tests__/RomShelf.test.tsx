import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { RomShelf } from '../RomShelf';

const ROMS = [
  { id: 1, name: 'Zelda', platform_id: 1, platform_slug: 'nes' },
  { id: 2, name: 'Mario', platform_id: 1, platform_slug: 'nes' },
];

describe('RomShelf', () => {
  it('renders a title and a tile per rom', async () => {
    await render(
      <RomShelf
        title="Recently added"
        roms={ROMS}
        serverUrl="https://romm.test"
        onSelect={jest.fn()}
        testID="recent-shelf"
      />,
    );

    expect(screen.getByText('Recently added')).toBeOnTheScreen();
    expect(screen.getByTestId('recent-shelf-tile-1')).toBeOnTheScreen();
    expect(screen.getByTestId('recent-shelf-tile-2')).toBeOnTheScreen();
  });

  it('renders nothing when there are no roms', async () => {
    await render(
      <RomShelf
        title="Recently added"
        roms={[]}
        serverUrl="https://romm.test"
        onSelect={jest.fn()}
        testID="recent-shelf"
      />,
    );

    expect(screen.queryByTestId('recent-shelf')).toBeNull();
    expect(screen.queryByText('Recently added')).toBeNull();
  });

  it('reports the rom whose tile was pressed', async () => {
    const onSelect = jest.fn();
    await render(
      <RomShelf
        title="Recently added"
        roms={ROMS}
        serverUrl="https://romm.test"
        onSelect={onSelect}
        testID="recent-shelf"
      />,
    );

    await fireEvent.press(screen.getByTestId('recent-shelf-tile-2'));

    expect(onSelect).toHaveBeenCalledWith(ROMS[1]);
  });

  it('shows an optional subtitle under each tile', async () => {
    await render(
      <RomShelf
        title="Recommended for you"
        roms={ROMS}
        serverUrl="https://romm.test"
        onSelect={jest.fn()}
        subtitleFor={rom =>
          rom.id === 1 ? 'Because you played Metroid' : undefined
        }
        testID="recommended-shelf"
      />,
    );

    expect(screen.getByText('Because you played Metroid')).toBeOnTheScreen();
  });
});

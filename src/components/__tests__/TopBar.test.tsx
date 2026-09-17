import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { MainTab, TopBar } from '../TopBar';

async function renderBar(active: MainTab = 'Home') {
  const onSelect = jest.fn();
  const onSettings = jest.fn();
  const onSignOut = jest.fn();
  await render(
    <TopBar
      active={active}
      onSelect={onSelect}
      onSettings={onSettings}
      onSignOut={onSignOut}
    />,
  );
  return { onSelect, onSettings, onSignOut };
}

describe('TopBar', () => {
  it('shows the three tabs with the active one selected', async () => {
    await renderBar('Platforms');

    expect(screen.getByText('Home')).toBeOnTheScreen();
    expect(screen.getByText('Platforms')).toBeOnTheScreen();
    expect(screen.getByText('Search')).toBeOnTheScreen();
    expect(screen.getByTestId('tab-platforms')).toBeSelected();
    expect(screen.getByTestId('tab-home')).not.toBeSelected();
    expect(screen.getByTestId('tab-search')).not.toBeSelected();
  });

  it('reports the tab that was pressed', async () => {
    const { onSelect } = await renderBar('Home');

    await fireEvent.press(screen.getByTestId('tab-search'));
    expect(onSelect).toHaveBeenCalledWith('Search');

    await fireEvent.press(screen.getByTestId('tab-platforms'));
    expect(onSelect).toHaveBeenCalledWith('Platforms');
  });

  it('exposes Settings and Sign Out actions', async () => {
    const { onSettings, onSignOut } = await renderBar();

    await fireEvent.press(screen.getByTestId('settings-button'));
    expect(onSettings).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('sign-out-button'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

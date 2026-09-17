import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { MainTab, Sidebar } from '../Sidebar';

async function renderSidebar(active: MainTab = 'Home') {
  const onSelect = jest.fn();
  const onSettings = jest.fn();
  const onSignOut = jest.fn();
  await render(
    <Sidebar
      active={active}
      username="jack"
      onSelect={onSelect}
      onSettings={onSettings}
      onSignOut={onSignOut}
    />,
  );
  return { onSelect, onSettings, onSignOut };
}

describe('Sidebar', () => {
  it('shows the nav items with the active one selected', async () => {
    await renderSidebar('Platforms');

    expect(screen.getByTestId('tab-home')).not.toBeSelected();
    expect(screen.getByTestId('tab-platforms')).toBeSelected();
  });

  it('reports the tab that was pressed', async () => {
    const { onSelect } = await renderSidebar('Home');

    await fireEvent.press(screen.getByTestId('tab-platforms'));
    expect(onSelect).toHaveBeenCalledWith('Platforms');
  });

  it('exposes Settings and Sign Out actions', async () => {
    const { onSettings, onSignOut } = await renderSidebar();

    await fireEvent.press(screen.getByTestId('settings-button'));
    expect(onSettings).toHaveBeenCalledTimes(1);

    await fireEvent.press(screen.getByTestId('sign-out-button'));
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});

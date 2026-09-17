import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { getPlatforms } from '../../api/rommClient';
import { useAuth } from '../../auth/AuthContext';
import { createAuthValue } from '../../testUtils/mockAuth';
import { RootNavigator } from '../RootNavigator';

jest.mock('../../auth/AuthContext');
jest.mock('../../api/rommClient');

const mockedUseAuth = jest.mocked(useAuth);

function renderNavigator() {
  return render(
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>,
  );
}

describe('RootNavigator', () => {
  it('shows a spinner while the session is being restored', async () => {
    mockedUseAuth.mockReturnValue(createAuthValue({ status: 'loading' }));

    await renderNavigator();

    expect(screen.getByTestId('auth-loading')).toBeOnTheScreen();
    expect(screen.queryByTestId('login-submit')).toBeNull();
  });

  it('shows the login screen when signed out', async () => {
    mockedUseAuth.mockReturnValue(
      createAuthValue({ status: 'signedOut', serverUrl: '' }),
    );

    await renderNavigator();

    expect(await screen.findByTestId('login-submit')).toBeOnTheScreen();
    expect(screen.queryByTestId('platforms-screen')).toBeNull();
  });

  it('shows the platform list when signed in', async () => {
    jest.mocked(getPlatforms).mockResolvedValue([]);
    mockedUseAuth.mockReturnValue(createAuthValue({ status: 'signedIn' }));

    await renderNavigator();

    expect(await screen.findByTestId('platforms-screen')).toBeOnTheScreen();
    expect(screen.queryByTestId('login-submit')).toBeNull();
  });
});

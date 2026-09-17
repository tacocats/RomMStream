import { NavigationContainer } from '@react-navigation/native';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
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
    expect(screen.queryByTestId('main-screen')).toBeNull();
  });

  it('shows the main screen on its Home tab when signed in', async () => {
    mockedUseAuth.mockReturnValue(createAuthValue({ status: 'signedIn' }));

    await renderNavigator();

    expect(await screen.findByTestId('main-screen')).toBeOnTheScreen();
    expect(screen.getByText('Hello world')).toBeOnTheScreen();
    expect(screen.queryByTestId('login-submit')).toBeNull();
  });
});

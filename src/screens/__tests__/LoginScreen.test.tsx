import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import { AuthValue, createAuthValue } from '../../testUtils/mockAuth';
import { LoginScreen } from '../LoginScreen';

jest.mock('../../auth/AuthContext');

const mockedUseAuth = jest.mocked(useAuth);

let auth: AuthValue;

beforeEach(() => {
  auth = createAuthValue({
    status: 'signedOut',
    serverUrl: '',
    accessToken: '',
  });
  mockedUseAuth.mockReturnValue(auth);
});

async function fillForm() {
  await fireEvent.changeText(
    screen.getByTestId('login-server-url'),
    'romm.test',
  );
  await fireEvent.changeText(screen.getByTestId('login-username'), 'player');
  await fireEvent.changeText(screen.getByTestId('login-password'), 'secret');
}

describe('LoginScreen', () => {
  it('keeps Sign In disabled until every field is filled', async () => {
    await render(<LoginScreen />);

    expect(screen.getByTestId('login-submit')).toBeDisabled();

    await fireEvent.changeText(
      screen.getByTestId('login-server-url'),
      'romm.test',
    );
    await fireEvent.changeText(screen.getByTestId('login-username'), 'player');
    expect(screen.getByTestId('login-submit')).toBeDisabled();

    await fireEvent.changeText(screen.getByTestId('login-password'), 'secret');
    expect(screen.getByTestId('login-submit')).toBeEnabled();

    await fireEvent.changeText(screen.getByTestId('login-username'), '   ');
    expect(screen.getByTestId('login-submit')).toBeDisabled();
  });

  it('signs in with the entered values', async () => {
    await render(<LoginScreen />);
    await fillForm();

    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(auth.signIn).toHaveBeenCalledWith('romm.test', 'player', 'secret');
    expect(screen.queryByTestId('login-error')).toBeNull();
  });

  it('submits from the password field', async () => {
    await render(<LoginScreen />);
    await fillForm();

    await fireEvent(screen.getByTestId('login-password'), 'submitEditing');

    expect(auth.signIn).toHaveBeenCalledTimes(1);
  });

  // The in-flight spinner can't be observed: fireEvent awaits the press
  // handler, which awaits signIn, and React only commits once that settles.
  it('restores the button once signing in has finished', async () => {
    await render(<LoginScreen />);
    await fillForm();

    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(auth.signIn).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('login-spinner')).toBeNull();
    expect(screen.getByText('Connect')).toBeOnTheScreen();
    expect(screen.getByTestId('login-submit')).toBeEnabled();
  });

  it('shows the error message when signing in fails', async () => {
    jest
      .mocked(auth.signIn)
      .mockRejectedValueOnce(new Error('Incorrect username or password'));
    await render(<LoginScreen />);
    await fillForm();

    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Incorrect username or password',
    );
    expect(screen.getByTestId('login-submit')).toBeEnabled();
  });

  it('shows a generic message for non-Error rejections', async () => {
    jest.mocked(auth.signIn).mockRejectedValueOnce('nope');
    await render(<LoginScreen />);
    await fillForm();

    await fireEvent.press(screen.getByTestId('login-submit'));

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Unable to sign in',
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  setInBrowserPlayEnabled,
  setLoginPath,
  setPlayPathTemplate,
} from '../../settings/settingsStore';
import { createAuthValue } from '../../testUtils/mockAuth';
import { createScreenProps } from '../../testUtils/navigation';
import { PlayerScreen } from '../PlayerScreen';

jest.mock('../../auth/AuthContext');

const mockedUseAuth = jest.mocked(useAuth);

const SERVER = 'https://romm.test';

function loginMessage(payload: unknown) {
  return { nativeEvent: { data: JSON.stringify(payload) } };
}

async function renderPlayer(platformSlug = 'snes') {
  const screenProps = createScreenProps('Player', {
    romId: 5,
    romName: 'Zelda',
    platformSlug,
  });
  await render(<PlayerScreen {...screenProps.props} />);
  const webview = await screen.findByTestId('player-webview');
  return { ...screenProps, webview };
}

beforeEach(() => {
  mockedUseAuth.mockReturnValue(
    createAuthValue({
      serverUrl: SERVER,
      username: 'player',
      password: 'p@ss',
    }),
  );
});

describe('PlayerScreen', () => {
  it('bootstraps the WebView with the login script', async () => {
    const { webview } = await renderPlayer();

    expect(screen.queryByTestId('player-loading')).toBeNull();
    expect(webview.props.source).toEqual({ uri: `${SERVER}/api/heartbeat` });
    expect(webview.props.injectedJavaScript).toContain('fetch("/api/login"');
    expect(webview.props.injectedJavaScript).toContain('"player"');
    expect(webview.props.injectedJavaScript).toContain('"p@ss"');
    expect(screen.getByText(`Signing in to ${SERVER}…`)).toBeOnTheScreen();
  });

  it('opens the web player for the rom once the login succeeds', async () => {
    const { webview } = await renderPlayer('snes');

    await fireEvent(
      webview,
      'message',
      loginMessage({ type: 'login', ok: true, status: 200 }),
    );

    const player = screen.getByTestId('player-webview');
    expect(player.props.source).toEqual({ uri: `${SERVER}/rom/5/ejs` });
    expect(player.props.injectedJavaScript).not.toContain('/api/login');
    expect(player.props.injectedJavaScript).toContain('play-button');
    expect(screen.queryByText(/Signing in/)).toBeNull();
  });

  it('falls back to the plain rom page when in-browser play is disabled', async () => {
    await setInBrowserPlayEnabled(false);
    const { webview } = await renderPlayer('snes');

    await fireEvent(
      webview,
      'message',
      loginMessage({ type: 'login', ok: true }),
    );

    expect(screen.getByTestId('player-webview').props.source).toEqual({
      uri: `${SERVER}/rom/5`,
    });
  });

  it('honours the stored play path template and login path', async () => {
    await setPlayPathTemplate('/rom/{id}');
    await setLoginPath('/custom/login');
    const { webview } = await renderPlayer('snes');

    expect(webview.props.injectedJavaScript).toContain('fetch("/custom/login"');

    await fireEvent(
      webview,
      'message',
      loginMessage({ type: 'login', ok: true }),
    );

    expect(screen.getByTestId('player-webview').props.source).toEqual({
      uri: `${SERVER}/rom/5`,
    });
  });

  it('ignores messages that are not login results', async () => {
    const { webview } = await renderPlayer();

    await fireEvent(
      webview,
      'message',
      loginMessage({ type: 'other', ok: true }),
    );
    await fireEvent(webview, 'message', { nativeEvent: { data: 'not json' } });

    expect(screen.getByTestId('player-webview').props.source).toEqual({
      uri: `${SERVER}/api/heartbeat`,
    });
    expect(screen.getByText(/Signing in/)).toBeOnTheScreen();
  });

  it.each([
    [401, /rejected the username\/password/],
    [404, /Login endpoint not found at \/api\/login/],
    [500, /HTTP 500/],
  ])('explains a login failure with HTTP %i', async (status, message) => {
    const { webview } = await renderPlayer();

    await fireEvent(
      webview,
      'message',
      loginMessage({ type: 'login', ok: false, status }),
    );

    expect(screen.getByTestId('player-error')).toHaveTextContent(message);
    expect(screen.queryByText(/Signing in/)).toBeNull();
  });

  it('explains a login failure without a status', async () => {
    const { webview } = await renderPlayer();

    await fireEvent(
      webview,
      'message',
      loginMessage({
        type: 'login',
        ok: false,
        error: 'TypeError: Failed to fetch',
      }),
    );

    expect(screen.getByTestId('player-error')).toHaveTextContent(
      'Sign-in request failed: TypeError: Failed to fetch',
    );
  });

  it('shows WebView load errors', async () => {
    const { webview } = await renderPlayer();

    await fireEvent(webview, 'error', {
      nativeEvent: { description: 'net::ERR_CONNECTION_REFUSED' },
    });

    expect(screen.getByTestId('player-error')).toHaveTextContent(
      'net::ERR_CONNECTION_REFUSED',
    );
  });
});

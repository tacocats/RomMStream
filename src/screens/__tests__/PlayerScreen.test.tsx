import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';
import {
  getConfig,
  getHeartbeat,
  getRom,
  getStreamingConfig,
} from '../../api/rommClient';
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
jest.mock('../../api/rommClient');

const mockedUseAuth = jest.mocked(useAuth);
const mockedGetRom = jest.mocked(getRom);
const mockedGetHeartbeat = jest.mocked(getHeartbeat);
const mockedGetConfig = jest.mocked(getConfig);
const mockedGetStreamingConfig = jest.mocked(getStreamingConfig);

const SERVER = 'https://romm.test';

function loginMessage(payload: unknown) {
  return { nativeEvent: { data: JSON.stringify(payload) } };
}

async function renderPlayer(platformSlug = 'snes', { romFails = false } = {}) {
  if (romFails) {
    mockedGetRom.mockRejectedValue(new Error('500'));
  } else {
    mockedGetRom.mockResolvedValue({
      id: 5,
      name: 'Zelda',
      platform_id: 1,
      platform_slug: platformSlug,
      has_file_on_disk: true,
    });
  }
  const screenProps = createScreenProps('Player', {
    romId: 5,
    romName: 'Zelda',
    platformSlug,
  });
  await render(<PlayerScreen {...screenProps.props} />);
  const webview = await screen.findByTestId('player-webview');
  return { ...screenProps, webview };
}

/** Sign in, then hand back the WebView showing the game. */
async function signIn(webview: ReturnType<typeof screen.getByTestId>) {
  await fireEvent(
    webview,
    'message',
    loginMessage({ type: 'login', ok: true, status: 200 }),
  );
  return screen.getByTestId('player-webview');
}

beforeEach(() => {
  mockedUseAuth.mockReturnValue(
    createAuthValue({
      serverUrl: SERVER,
      username: 'player',
      password: 'p@ss',
    }),
  );
  mockedGetHeartbeat.mockResolvedValue({ EMULATION: {} });
  mockedGetConfig.mockResolvedValue({});
  mockedGetStreamingConfig.mockResolvedValue({
    enabled: false,
    containers: [],
  });
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

    const player = await signIn(webview);

    expect(player.props.source).toEqual({ uri: `${SERVER}/rom/5/ejs` });
    expect(player.props.injectedJavaScript).not.toContain('/api/login');
    expect(player.props.injectedJavaScript).toContain('play-button');
    expect(screen.queryByText(/Signing in/)).toBeNull();
  });

  it('prefers the stream when the platform has a streaming container', async () => {
    mockedGetStreamingConfig.mockResolvedValue({
      enabled: true,
      containers: [{ platform: 'snes', container: 'romm-snes' }],
    });
    const { webview } = await renderPlayer('snes');

    expect((await signIn(webview)).props.source).toEqual({
      uri: `${SERVER}/rom/5/stream`,
    });
  });

  it('honours an emulator the server has switched off', async () => {
    mockedGetHeartbeat.mockResolvedValue({
      EMULATION: { DISABLE_EMULATOR_JS: true },
    });
    const { webview } = await renderPlayer('snes');

    expect((await signIn(webview)).props.source).toEqual({
      uri: `${SERVER}/rom/5`,
    });
  });

  it('still launches when the server lookups fail', async () => {
    // An older RomM has no /api/streaming/config; that must not stop the
    // launch, it just leaves streaming off.
    mockedGetStreamingConfig.mockRejectedValue(new Error('404'));
    mockedGetHeartbeat.mockRejectedValue(new Error('404'));
    mockedGetConfig.mockRejectedValue(new Error('404'));
    const { webview } = await renderPlayer('snes');

    expect((await signIn(webview)).props.source).toEqual({
      uri: `${SERVER}/rom/5/ejs`,
    });
  });

  it('falls back to the plain rom page when the rom lookup fails', async () => {
    const { webview } = await renderPlayer('snes', { romFails: true });

    expect((await signIn(webview)).props.source).toEqual({
      uri: `${SERVER}/rom/5`,
    });
  });

  it('keeps streaming on offer when in-browser play is disabled', async () => {
    await setInBrowserPlayEnabled(false);
    mockedGetStreamingConfig.mockResolvedValue({
      enabled: true,
      containers: [{ platform: 'snes', container: 'romm-snes' }],
    });
    const { webview } = await renderPlayer('snes');

    expect((await signIn(webview)).props.source).toEqual({
      uri: `${SERVER}/rom/5/stream`,
    });
  });

  it('falls back to the plain rom page when in-browser play is disabled', async () => {
    await setInBrowserPlayEnabled(false);
    const { webview } = await renderPlayer('snes');

    expect((await signIn(webview)).props.source).toEqual({
      uri: `${SERVER}/rom/5`,
    });
  });

  it('honours the stored play path template and login path', async () => {
    await setPlayPathTemplate('/rom/{id}');
    await setLoginPath('/custom/login');
    const { webview } = await renderPlayer('snes');

    expect(webview.props.injectedJavaScript).toContain('fetch("/custom/login"');

    expect((await signIn(webview)).props.source).toEqual({
      uri: `${SERVER}/rom/5`,
    });
    expect(mockedGetStreamingConfig).not.toHaveBeenCalled();
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

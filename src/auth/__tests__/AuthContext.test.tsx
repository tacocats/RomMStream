import { act, renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { RommApiError } from '../../api/types';
import {
  fetchCall,
  fetchFormBody,
  fetchMock,
  mockFetchOnce,
} from '../../testUtils/fetchMock';
import { AuthProvider, useAuth } from '../AuthContext';
import {
  loadCredentials,
  loadTokens,
  saveCredentials,
  saveTokens,
} from '../secureStore';

const TOKENS = {
  access_token: 'access-1',
  refresh_token: 'refresh-1',
  token_type: 'bearer',
  expires: 900,
  refresh_expires: 86400,
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// RNTL's act hands back React's bare thenable, whose `then` returns
// undefined, so `expect(act(...)).resolves` / `.rejects` would not wait for
// it. Adopt it into a real Promise first.
function actAsync<T>(callback: () => Promise<T>): Promise<T> {
  return Promise.resolve(act(callback));
}

async function renderAuth() {
  const view = await renderHook(() => useAuth(), { wrapper });
  await waitFor(() => expect(view.result.current.status).not.toBe('loading'));
  return view;
}

async function seedSignedIn() {
  await saveCredentials({
    serverUrl: 'https://romm.test',
    username: 'player',
    password: 'pw',
  });
  await saveTokens({ accessToken: 'access-0', refreshToken: 'refresh-0' });
}

describe('AuthProvider', () => {
  describe('session restore', () => {
    it('is signed out when the keychain is empty', async () => {
      const { result } = await renderAuth();

      expect(result.current.status).toBe('signedOut');
      expect(result.current.serverUrl).toBe('');
      expect(result.current.accessToken).toBe('');
    });

    it('restores a signed-in session from stored credentials and tokens', async () => {
      await seedSignedIn();

      const { result } = await renderAuth();

      expect(result.current).toMatchObject({
        status: 'signedIn',
        serverUrl: 'https://romm.test',
        username: 'player',
        password: 'pw',
        accessToken: 'access-0',
        refreshToken: 'refresh-0',
      });
    });

    it('stays signed out when only credentials are stored', async () => {
      await saveCredentials({
        serverUrl: 'https://romm.test',
        username: 'player',
        password: 'pw',
      });

      const { result } = await renderAuth();

      expect(result.current.status).toBe('signedOut');
    });
  });

  describe('signIn', () => {
    it('normalizes the server URL, exchanges credentials and persists the session', async () => {
      const { result } = await renderAuth();
      mockFetchOnce({ body: TOKENS });

      await act(() => result.current.signIn('romm.test/', 'player', 'pw'));

      expect(fetchCall()[0]).toBe('https://romm.test/api/token');
      expect(fetchFormBody().get('grant_type')).toBe('password');
      expect(result.current).toMatchObject({
        status: 'signedIn',
        serverUrl: 'https://romm.test',
        username: 'player',
        password: 'pw',
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });
      await expect(loadCredentials()).resolves.toEqual({
        serverUrl: 'https://romm.test',
        username: 'player',
        password: 'pw',
      });
      await expect(loadTokens()).resolves.toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });
    });

    it('rejects with the server message and persists nothing on failure', async () => {
      const { result } = await renderAuth();
      mockFetchOnce({
        status: 401,
        body: { detail: 'Incorrect username or password' },
      });

      await expect(
        actAsync(() => result.current.signIn('romm.test', 'player', 'wrong')),
      ).rejects.toThrow('Incorrect username or password');

      expect(result.current.status).toBe('signedOut');
      await expect(loadCredentials()).resolves.toBeNull();
      await expect(loadTokens()).resolves.toBeNull();
    });
  });

  describe('signOut', () => {
    it('clears the keychain and returns to signed out', async () => {
      await seedSignedIn();
      const { result } = await renderAuth();

      await act(() => result.current.signOut());

      expect(result.current.status).toBe('signedOut');
      expect(result.current.accessToken).toBe('');
      await expect(loadCredentials()).resolves.toBeNull();
      await expect(loadTokens()).resolves.toBeNull();
    });
  });

  describe('withAuth', () => {
    it('runs the call with the current server URL and access token', async () => {
      await seedSignedIn();
      const { result } = await renderAuth();
      const fn = jest.fn().mockResolvedValue('payload');

      await expect(actAsync(() => result.current.withAuth(fn))).resolves.toBe(
        'payload',
      );

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('https://romm.test', 'access-0');
      expect(fetchMock()).not.toHaveBeenCalled();
    });

    it('refreshes once and retries after a 401', async () => {
      await seedSignedIn();
      const { result } = await renderAuth();
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new RommApiError('expired', 401))
        .mockResolvedValueOnce('payload');
      mockFetchOnce({ body: TOKENS });

      await expect(actAsync(() => result.current.withAuth(fn))).resolves.toBe(
        'payload',
      );

      expect(fetchCall()[0]).toBe('https://romm.test/api/token');
      expect(fetchFormBody().get('grant_type')).toBe('refresh_token');
      expect(fetchFormBody().get('refresh_token')).toBe('refresh-0');
      expect(fn).toHaveBeenNthCalledWith(1, 'https://romm.test', 'access-0');
      expect(fn).toHaveBeenNthCalledWith(2, 'https://romm.test', 'access-1');
      expect(result.current.accessToken).toBe('access-1');
      expect(result.current.refreshToken).toBe('refresh-1');
      await expect(loadTokens()).resolves.toEqual({
        accessToken: 'access-1',
        refreshToken: 'refresh-1',
      });
    });

    it('rethrows non-401 errors without refreshing', async () => {
      await seedSignedIn();
      const { result } = await renderAuth();
      const fn = jest
        .fn()
        .mockRejectedValue(new RommApiError('server exploded', 500));

      await expect(actAsync(() => result.current.withAuth(fn))).rejects.toThrow(
        'server exploded',
      );

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fetchMock()).not.toHaveBeenCalled();
    });

    it('rethrows a 401 when there is no refresh token to use', async () => {
      await saveCredentials({
        serverUrl: 'https://romm.test',
        username: 'player',
        password: 'pw',
      });
      await saveTokens({ accessToken: 'access-0', refreshToken: '' });
      const { result } = await renderAuth();
      const fn = jest.fn().mockRejectedValue(new RommApiError('expired', 401));

      await expect(actAsync(() => result.current.withAuth(fn))).rejects.toThrow(
        'expired',
      );

      expect(fn).toHaveBeenCalledTimes(1);
      expect(fetchMock()).not.toHaveBeenCalled();
    });

    it('surfaces a failed refresh', async () => {
      await seedSignedIn();
      const { result } = await renderAuth();
      const fn = jest.fn().mockRejectedValue(new RommApiError('expired', 401));
      mockFetchOnce({ status: 401, body: { detail: 'refresh token expired' } });

      await expect(actAsync(() => result.current.withAuth(fn))).rejects.toThrow(
        'refresh token expired',
      );

      expect(fn).toHaveBeenCalledTimes(1);
      expect(result.current.accessToken).toBe('access-0');
    });
  });
});

describe('useAuth', () => {
  it('throws when used outside an AuthProvider', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth must be used within an AuthProvider',
    );

    consoleError.mockRestore();
  });
});

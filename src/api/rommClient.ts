import { RommApiError, RommPlatform, RommRom, TokenResponse } from './types';

// Read-only scopes are enough for browsing + launching the web player.
const REQUESTED_SCOPES = 'me.read platforms.read roms.read collections.read';

export function normalizeServerUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

async function parseJsonOrThrow(response: Response) {
  const text = await response.text();
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // Non-JSON body (e.g. an HTML error page from a reverse proxy).
    }
  }
  if (!response.ok) {
    const detail =
      body && typeof body === 'object' && 'detail' in body
        ? String((body as { detail: unknown }).detail)
        : response.statusText;
    throw new RommApiError(detail || `Request failed (${response.status})`, response.status);
  }
  return body;
}

export async function login(
  serverUrl: string,
  username: string,
  password: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'password',
    username,
    password,
    scope: REQUESTED_SCOPES,
  });

  const response = await fetch(`${serverUrl}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return (await parseJsonOrThrow(response)) as TokenResponse;
}

export async function refreshAccessToken(
  serverUrl: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });

  const response = await fetch(`${serverUrl}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  return (await parseJsonOrThrow(response)) as TokenResponse;
}

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

// The API returns a plain array in every RomM version we've checked, but
// tolerate a future `{ items: [...] }` envelope just in case.
function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }
  if (body && typeof body === 'object' && Array.isArray((body as { items?: unknown }).items)) {
    return (body as { items: T[] }).items;
  }
  return [];
}

export async function getPlatforms(
  serverUrl: string,
  accessToken: string,
): Promise<RommPlatform[]> {
  const response = await fetch(`${serverUrl}/api/platforms`, {
    headers: authHeaders(accessToken),
  });
  return unwrapList<RommPlatform>(await parseJsonOrThrow(response));
}

export async function getRoms(
  serverUrl: string,
  accessToken: string,
  platformId?: number,
): Promise<RommRom[]> {
  const params = new URLSearchParams({
    with_extra: 'false',
    ...(platformId !== undefined ? { platform_id: String(platformId) } : {}),
  });

  const response = await fetch(`${serverUrl}/api/roms?${params.toString()}`, {
    headers: authHeaders(accessToken),
  });
  return unwrapList<RommRom>(await parseJsonOrThrow(response));
}

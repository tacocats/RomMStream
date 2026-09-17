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
    throw new RommApiError(
      detail || `Request failed (${response.status})`,
      response.status,
    );
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

// /api/platforms returns a plain array; /api/roms returns a paginated
// { items: [...] } envelope. Accept either shape from either endpoint.
function unwrapList<T>(body: unknown): T[] {
  if (Array.isArray(body)) {
    return body as T[];
  }
  if (
    body &&
    typeof body === 'object' &&
    Array.isArray((body as { items?: unknown }).items)
  ) {
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

// GET /api/roms is limit/offset paginated ({ items, total, limit, offset })
// with a default page of 50 (max 10,000). The platform filter is the
// repeatable `platform_ids` parameter; `platform_id` is silently ignored.
const ROMS_PAGE_SIZE = 500;

export async function getRoms(
  serverUrl: string,
  accessToken: string,
  platformId?: number,
): Promise<RommRom[]> {
  const roms: RommRom[] = [];
  let offset = 0;

  for (;;) {
    const params = new URLSearchParams({
      limit: String(ROMS_PAGE_SIZE),
      offset: String(offset),
      order_by: 'name',
      order_dir: 'asc',
      ...(platformId !== undefined ? { platform_ids: String(platformId) } : {}),
    });

    const response = await fetch(`${serverUrl}/api/roms?${params.toString()}`, {
      headers: authHeaders(accessToken),
    });
    const body = await parseJsonOrThrow(response);
    const page = unwrapList<RommRom>(body);
    roms.push(...page);

    const total =
      body &&
      typeof body === 'object' &&
      typeof (body as { total?: unknown }).total === 'number'
        ? (body as { total: number }).total
        : undefined;
    const exhausted =
      page.length < ROMS_PAGE_SIZE ||
      Array.isArray(body) ||
      (total !== undefined && roms.length >= total);
    if (exhausted) {
      return roms;
    }
    offset += page.length;
  }
}

// Loosely typed to survive RomM API changes across versions.
// Only fields the app actually relies on are required; everything else is optional.

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires: number;
  refresh_expires: number;
}

export interface RommPlatform {
  id: number;
  name: string;
  slug?: string;
  fs_slug?: string;
  rom_count?: number;
  [key: string]: unknown;
}

export interface RommRom {
  id: number;
  name: string;
  platform_id: number;
  platform_slug?: string;
  platform_name?: string;
  fs_name?: string;
  url_cover?: string;
  [key: string]: unknown;
}

export class RommApiError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'RommApiError';
    this.status = status;
  }
}

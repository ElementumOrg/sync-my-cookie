import { setting } from './store';

const REGISTERED_CLIENT_ID = 'Ov23lix1ca59qPt8q41l';
const CLIENT_ID = __GITHUB_CLIENT_ID__ || REGISTERED_CLIENT_ID;
const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const TOKEN_URL = 'https://github.com/login/oauth/access_token';
const USER_URL = 'https://api.github.com/user';
const SCOPE = 'gist';
const DEFAULT_VERIFICATION_URI = 'https://github.com/login/device';

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  interval: number;
  expiresAt: number;
}

export interface GithubUser {
  login: string;
}

export function isOAuthConfigured(): boolean {
  return Boolean(CLIENT_ID);
}

export async function startAuthorization(): Promise<DeviceAuthorization> {
  if (!isOAuthConfigured()) {
    throw new Error('GitHub OAuth is not configured. Build with GITHUB_CLIENT_ID.');
  }
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      scope: SCOPE,
    }).toString(),
  });
  const data = await response.json() as {
    device_code?: string;
    user_code?: string;
    verification_uri?: string;
    verification_uri_complete?: string;
    expires_in?: number;
    interval?: number;
    error?: string;
    error_description?: string;
  };
  if (!data.device_code || !data.user_code) {
    throw new Error(data.error_description || data.error || 'Failed to start GitHub authorization');
  }
  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri_complete || data.verification_uri || DEFAULT_VERIFICATION_URI,
    interval: data.interval || 5,
    expiresAt: Date.now() + (data.expires_in || 900) * 1000,
  };
}

export async function waitForAuthorization(auth: DeviceAuthorization): Promise<string> {
  let interval = auth.interval;
  while (Date.now() < auth.expiresAt) {
    await delay(interval * 1000);
    const response = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        device_code: auth.deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }).toString(),
    });
    const data = await response.json() as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (data.access_token) {
      await setting.set({token: data.access_token});
      return data.access_token;
    }
    if (data.error === 'authorization_pending') {
      continue;
    }
    if (data.error === 'slow_down') {
      interval += 5;
      continue;
    }
    if (data.error === 'expired_token') {
      throw new Error('GitHub authorization code expired');
    }
    if (data.error === 'access_denied') {
      throw new Error('GitHub authorization denied');
    }
    throw new Error(data.error_description || data.error || 'GitHub authorization failed');
  }
  throw new Error('GitHub authorization code expired');
}

export async function getUser(token: string): Promise<GithubUser> {
  const response = await fetch(USER_URL, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const message = response.status === 401
      ? 'GitHub authorization expired'
      : `GitHub API error: ${response.status}`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function signOut(): Promise<void> {
  await setting.remove('token');
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

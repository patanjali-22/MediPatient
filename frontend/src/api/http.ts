import { authStore } from '../ui/authStore';

export class HttpError extends Error {
  status: number;
  bodyText?: string;

  constructor(message: string, status: number, bodyText?: string) {
    super(message);
    this.status = status;
    this.bodyText = bodyText;
  }
}

function joinUrl(baseUrl: string, path: string) {
  // if baseUrl is empty => use relative (dev proxy)
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string | undefined;

export async function http<T>(
  path: string,
  init?: RequestInit & { json?: unknown; auth?: boolean }
): Promise<T> {
  const url = joinUrl(API_BASE_URL ?? '', path);

  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');

  if (init?.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const shouldAuth = init?.auth ?? true;
  if (shouldAuth) {
    const token = authStore.getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
  });

  if (res.status === 401) {
    // token invalid/expired — force logout
    authStore.clearToken();
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => undefined);
    throw new HttpError(`Request failed: ${res.status} ${res.statusText}`, res.status, bodyText);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    // best effort
    return (await res.text()) as unknown as T;
  }

  return (await res.json()) as T;
}

import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as client from './client';
import { authStore } from '../ui/authStore';

// Minimal localStorage mock for tests (authStore depends on it)
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
    setItem: (k: string, v: string) => void storage.set(k, String(v)),
    removeItem: (k: string) => void storage.delete(k),
    clear: () => void storage.clear(),
  },
  writable: true,
});

// Simple unit test: ensure login hits /auth/login without auth header.

describe('api client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    authStore.clearToken();
  });

  it('login calls /auth/login and returns token', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ token: 'abc' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

    const res = await client.login({ email: 'a@b.com', password: 'password123' });

    expect(res.token).toBe('abc');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain('/auth/login');
    expect((init?.headers as Headers).get('Authorization')).toBe(null);
  });

  it('getPatients attaches bearer token', async () => {
    authStore.setToken('tok');

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      );

    await client.getPatients();

    const [, init] = fetchMock.mock.calls[0]!;
    expect((init?.headers as Headers).get('Authorization')).toBe('Bearer tok');
  });
});

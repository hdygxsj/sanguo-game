import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';

describe('API client', () => {
  afterEach(() => vi.restoreAllMocks());

  it('does not send a JSON content type for a bodyless demo login', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ user: { id: 'u1', phone: '13800138000', displayName: 'Arena 体验官' } }), { status: 200 }),
    );

    await api.demoLogin();

    expect(fetchMock).toHaveBeenCalledWith('/api/auth/demo-login', expect.objectContaining({
      method: 'POST',
      headers: {},
    }));
  });
});

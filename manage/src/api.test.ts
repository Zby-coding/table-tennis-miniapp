import { afterEach, describe, expect, it, vi } from 'vitest';
import { login } from './api';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('reports backend availability when the dev proxy returns a plain 502', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      headers: new Headers({ 'Content-Type': 'text/plain' }),
      text: vi.fn().mockResolvedValue('Bad Gateway'),
    }));

    await expect(login('admin')).rejects.toThrow('后端服务未启动或代理不可用');
  });
});

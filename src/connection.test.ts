import { describe, expect, it, vi } from 'vitest';
import { retryConnection, testServerConnection, validateServerConfiguration, saveAfterSuccessfulTest } from './connection';

describe('Yattee Server configuration', () => {
  it('retries a connection three times before reporting it unavailable', async () => {
    const connect = vi.fn().mockRejectedValue(new Error('offline'));
    await expect(retryConnection(connect, 3)).rejects.toThrow('offline');
    expect(connect).toHaveBeenCalledTimes(3);
  });

  it('uses local-only mode without a remote URL', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    await expect(testServerConnection('', 'http://yattee.example', request)).resolves.toBe('Using local-only mode.');
    expect(request).toHaveBeenCalledWith('http://yattee.example/health', { headers: { Accept: 'application/json' } });
  });

  it('accepts a remote URL without collecting credentials', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 401 }));
    await expect(testServerConnection('https://remote.example/', 'http://yattee.example', request)).resolves.toBe('Remote Yattee Server is online. Sign in when prompted.');
    expect(request).toHaveBeenCalledWith('https://remote.example/health', { headers: { Accept: 'application/json' } });
  });

  it('rejects an offline remote URL before it can be saved', async () => {
    const request = vi.fn().mockResolvedValue(new Response('{}', { status: 503 }));
    await expect(testServerConnection('https://remote.example', 'http://yattee.example', request)).rejects.toThrow('503');
  });

  it('does not persist a server configuration when its connection test fails', async () => {
    const test = vi.fn().mockRejectedValue(new Error('Server connection failed (503)'));
    const save = vi.fn();
    await expect(saveAfterSuccessfulTest(test, save)).rejects.toThrow('503');
    expect(save).not.toHaveBeenCalled();
  });

  it('persists only after a successful connection test', async () => {
    const calls: string[] = [];
    await saveAfterSuccessfulTest(async () => { calls.push('test'); }, async () => { calls.push('save'); });
    expect(calls).toEqual(['test', 'save']);
  });

  it('normalizes a URL without requiring user credentials', () => {
    expect(validateServerConfiguration('https://remote.example/', '', '')).toBe('https://remote.example');
  });
});

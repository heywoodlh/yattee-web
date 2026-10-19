import { describe, expect, it } from 'vitest';
import { loadOfflineProfile, loadStateWithOfflineFallback, saveOfflineProfile, type OfflineProfileStore } from './offline-profile';
import { defaultParentalControls } from './parental';
import { initialStore } from './store';

class MemoryStore implements OfflineProfileStore {
  value: unknown = null;
  async load() { return this.value; }
  async save(value: unknown) { this.value = value; }
}

describe('offline profile snapshots', () => {
  it('restores a schema-normalized cached profile after the server becomes unavailable', async () => {
    const storage = new MemoryStore();
    await saveOfflineProfile(storage, { ...initialStore, history: [{ videoId: 'offline-video', title: 'Available offline', author: 'Creator', authorId: 'channel' }] }, { ...defaultParentalControls, enabled: true, disableSearch: true });

    await expect(loadOfflineProfile(storage)).resolves.toMatchObject({
      state: { history: [{ videoId: 'offline-video' }] },
      controls: { enabled: true, disableSearch: true },
      pending: false,
    });
  });

  it('uses the cached snapshot only after a server profile load fails', async () => {
    const storage = new MemoryStore();
    await saveOfflineProfile(storage, { ...initialStore, history: [{ videoId: 'offline-video', title: 'Available offline', author: 'Creator', authorId: 'channel' }] }, defaultParentalControls);

    await expect(loadStateWithOfflineFallback(() => Promise.reject(new Error('offline')), storage)).resolves.toMatchObject({ offline: true, state: { history: [{ videoId: 'offline-video' }] } });
  });

  it('rejects malformed browser data rather than rendering it as a profile', async () => {
    const storage = new MemoryStore();
    storage.value = { state: { history: 'not an array' }, controls: [] };

    await expect(loadOfflineProfile(storage)).resolves.toBeNull();
  });

  it('retains a pending local change until it has been synchronized', async () => {
    const storage = new MemoryStore();
    await saveOfflineProfile(storage, { ...initialStore, queue: [{ videoId: 'queued-offline', title: 'Queued offline', author: 'Creator', authorId: 'channel' }] }, defaultParentalControls, true);

    await expect(loadOfflineProfile(storage)).resolves.toMatchObject({ pending: true, state: { queue: [{ videoId: 'queued-offline' }] } });
  });
});

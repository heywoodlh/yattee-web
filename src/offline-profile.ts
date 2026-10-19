import { defaultParentalControls, type ParentalControls } from './parental';
import { initialStore, loadStore, type Store } from './store';

export type OfflineProfile = { state: Store; controls: ParentalControls; pending: boolean; savedAt: string };
export type OfflineProfileStore = { load: () => Promise<unknown>; save: (value: unknown) => Promise<void> };

const database = 'yattee-web-offline-profiles';
const objectStore = 'profiles';
const localProfile = 'local';
const profileStorageKey = 'yattee-web-offline-profile';

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const listFields: (keyof Store)[] = ['history', 'bookmarks', 'subscriptions', 'playlists', 'queue', 'searchHistory', 'recentChannels', 'recentPlaylists', 'instances', 'mediaSources', 'channelNotificationSettings', 'controlsPresets'];

function normalizeControls(raw: unknown): ParentalControls | null {
  const value = object(raw);
  if (!value) return null;
  const keys: (keyof ParentalControls)[] = ['enabled', 'disableSearch', 'disableSubscriptions', 'disablePlaylists'];
  if (keys.some(key => value[key] !== undefined && typeof value[key] !== 'boolean')) return null;
  return { ...defaultParentalControls, ...value } as ParentalControls;
}

export function normalizeOfflineProfile(raw: unknown): OfflineProfile | null {
  const value = object(raw);
  const rawState = object(value?.state);
  const controls = normalizeControls(value?.controls);
  if (!rawState || !controls || listFields.some(field => !Array.isArray(rawState[field]))) return null;
  return {
    state: { ...initialStore, ...loadStore(JSON.stringify(rawState)) },
    controls,
    pending: value?.pending === true,
    savedAt: typeof value?.savedAt === 'string' ? value.savedAt : '',
  };
}

export async function loadOfflineProfile(storage: OfflineProfileStore): Promise<OfflineProfile | null> {
  return normalizeOfflineProfile(await storage.load());
}

export async function saveOfflineProfile(storage: OfflineProfileStore, state: Store, controls: ParentalControls, pending = false): Promise<void> {
  await storage.save({ state, controls, pending, savedAt: new Date().toISOString() } satisfies OfflineProfile);
}

export async function loadStateWithOfflineFallback(loadServer: () => Promise<Store>, storage: OfflineProfileStore): Promise<{ state: Store; controls?: ParentalControls; offline: boolean; pending: boolean }> {
  try {
    return { state: await loadServer(), offline: false, pending: false };
  } catch (error) {
    const snapshot = await loadOfflineProfile(storage);
    if (!snapshot) throw error;
    return { state: snapshot.state, controls: snapshot.controls, offline: true, pending: snapshot.pending };
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(objectStore);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Offline storage is unavailable'));
  });
}

export function browserOfflineProfileStore(profile = localProfile): OfflineProfileStore {
  const key = profile || localProfile;
  return {
    async load() {
      const db = await openDatabase();
      return await new Promise((resolve, reject) => {
        const request = db.transaction(objectStore, 'readonly').objectStore(objectStore).get(key);
        request.onsuccess = () => { db.close(); resolve(request.result ?? null); };
        request.onerror = () => { db.close(); reject(request.error || new Error('Offline storage is unavailable')); };
      });
    },
    async save(value) {
      const db = await openDatabase();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction(objectStore, 'readwrite');
        transaction.objectStore(objectStore).put(value, key);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error || new Error('Offline storage is unavailable')); };
      });
    },
  };
}

export function currentOfflineProfile(): string {
  try { return localStorage.getItem(profileStorageKey) || localProfile; } catch { return localProfile; }
}

export function rememberOfflineProfile(profile: string): void {
  try { localStorage.setItem(profileStorageKey, profile || localProfile); } catch { /* Browser storage can be unavailable. */ }
}

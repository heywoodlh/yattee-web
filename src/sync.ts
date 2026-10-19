import { initialStore, loadStore, type Store } from './store';
import { retryConnection } from './connection';

export type Theme = Store['settings']['theme'];
export type SyncedState = Store;

export const initialSyncedState: SyncedState = initialStore;

const list = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const themes: Theme[] = ['default', 'light', 'nord', 'catppuccin-mocha', 'solarized', 'dracula'];

export function normalizeSyncedState(raw: unknown): SyncedState {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return initialSyncedState;
  const value = raw as Record<string, unknown>;
  const store = loadStore(JSON.stringify(value));
  const settings = value.settings && typeof value.settings === 'object' && !Array.isArray(value.settings) ? value.settings as Record<string, unknown> : {};
  const theme = themes.includes(settings.theme as Theme) ? settings.theme as Theme : 'default';
  return {
    ...initialSyncedState,
    ...store,
    settings: { ...initialSyncedState.settings, ...store.settings, theme },
    searchHistory: list<string>(value.searchHistory).filter(item => typeof item === 'string'),
    recentChannels: list<Store['subscriptions'][number]>(value.recentChannels),
    recentPlaylists: list<{ playlistId: string; title: string }>(value.recentPlaylists),
    instances: list<{ id: string; url: string }>(value.instances),
    mediaSources: list<{ id: string; name: string }>(value.mediaSources),
    channelNotificationSettings: list<{ channelId: string; enabled: boolean }>(value.channelNotificationSettings),
    controlsPresets: list<{ id: string; name: string }>(value.controlsPresets),
    feedCache: store.feedCache,
  };
}

export async function loadSyncedState(request: typeof fetch = fetch, attempts = 3, retryDelayMs = 500): Promise<SyncedState> {
  return retryConnection(async () => {
    const response = await request('/state', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error('Filesystem state is unavailable');
    return normalizeSyncedState(await response.json());
  }, attempts, retryDelayMs);
}

export async function saveSyncedState(state: SyncedState, request: typeof fetch = fetch, attempts = 3, retryDelayMs = 500): Promise<void> {
  await retryConnection(async () => {
    const response = await request('/state', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(state) });
    if (!response.ok) throw new Error('Unable to persist state on this server');
  }, attempts, retryDelayMs);
}

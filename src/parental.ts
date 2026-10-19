export type ParentalControls = { enabled: boolean; disableSearch: boolean; disableSubscriptions: boolean; disableSubscriptionImport?: boolean; disablePlaylists: boolean };
export const defaultParentalControls: ParentalControls = { enabled: false, disableSearch: false, disableSubscriptions: false, disableSubscriptionImport: false, disablePlaylists: false };

export function blockedRoute(route: string, controls: ParentalControls) {
  if (!controls.enabled) return false;
  const base = route.split('/', 1)[0];
  return (controls.disableSearch && base === 'search') || (controls.disablePlaylists && base === 'playlists');
}

export function canAddContent(kind: 'subscription' | 'playlist' | 'bookmark' | 'queue', controls: ParentalControls) {
  if (!controls.enabled) return true;
  if (kind === 'subscription') return !controls.disableSubscriptions;
  return !controls.disablePlaylists;
}

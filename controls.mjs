import { hashSecret, verifySecret } from './credentials.mjs';

export const defaultControls = { enabled: false, disableSearch: false, disableSubscriptions: false, disableSubscriptionImport: false, disablePlaylists: false };
export function configureControls(existing = defaultControls, input = {}) {
  const next = { ...defaultControls, ...existing, ...input };
  if (input.enabled === false) delete next.pinHash;
  if (input.enabled && !next.pinHash) {
    if (!/^\d{4,12}$/.test(input.pin || '')) throw new Error('Set a 4–12 digit PIN to enable parental controls');
    next.pinHash = hashSecret(input.pin);
  }
  delete next.pin;
  return next;
}
export function verifyPin(controls, pin) {
  return !!controls?.pinHash && verifySecret(pin, controls.pinHash);
}
export function publicControls(controls = defaultControls) { const { pinHash, ...safe } = controls; return safe; }

const lockedFields = controls => [
  ...(controls?.enabled && controls.disableSubscriptions ? ['subscriptions'] : []),
  ...(controls?.enabled && controls.disablePlaylists ? ['bookmarks', 'playlists'] : []),
];

// Keep the fields that parental controls lock at their saved values, so a
// client can't change them by writing state directly.
export function enforceControls(next, existing, controls) {
  const enforced = { ...next };
  for (const field of lockedFields(controls)) enforced[field] = existing?.[field] ?? [];
  return enforced;
}

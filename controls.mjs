import { createHash, timingSafeEqual } from 'node:crypto';

const digest = pin => createHash('sha256').update(pin).digest('hex');
export const defaultControls = { enabled: false, disableSearch: false, disableSubscriptions: false, disableSubscriptionImport: false, disablePlaylists: false };
export function configureControls(existing = defaultControls, input = {}) {
  const next = { ...defaultControls, ...existing, ...input };
  if (input.enabled === false) delete next.pinHash;
  if (input.enabled && !next.pinHash) {
    if (!/^\d{4,12}$/.test(input.pin || '')) throw new Error('Set a 4–12 digit PIN to enable parental controls');
    next.pinHash = digest(input.pin);
  }
  delete next.pin;
  return next;
}
export function verifyPin(controls, pin) {
  if (!controls?.pinHash || !pin) return false;
  const expected = Buffer.from(controls.pinHash, 'hex'); const actual = Buffer.from(digest(pin), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
export function publicControls(controls = defaultControls) { const { pinHash, ...safe } = controls; return safe; }

import { createHash } from 'node:crypto';

export function profileKey(instanceUrl, userId) {
  return createHash('sha256').update(`${new URL(instanceUrl).origin}:${userId}`).digest('hex');
}

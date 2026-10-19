import { gunzipSync, strFromU8, unzipSync } from 'fflate';

export type ImportedSubscription = { authorId: string; author: string };
const decoder = new TextDecoder();

export function parseTakeoutSubscriptions(csv: string): ImportedSubscription[] {
  const rows = csv.replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const header = rows.shift()?.split(',').map(value => value.trim().toLowerCase()) || [];
  const idIndex = header.findIndex(value => value === 'channel id');
  const titleIndex = header.findIndex(value => value === 'channel title');
  if (idIndex < 0 || titleIndex < 0) throw new Error('Choose Google Takeout subscriptions.csv');
  const seen = new Set<string>();
  return rows.map(row => row.split(',')).map(columns => ({ authorId: columns[idIndex]?.trim(), author: columns[titleIndex]?.trim() })).filter((entry): entry is ImportedSubscription => !!entry.authorId && !!entry.author && !seen.has(entry.authorId) && !!seen.add(entry.authorId));
}

function tarEntries(bytes: Uint8Array) {
  const entries: Record<string, Uint8Array> = {};
  for (let offset = 0; offset + 512 <= bytes.length;) {
    const header = bytes.subarray(offset, offset + 512);
    const name = decoder.decode(header.subarray(0, 100)).replace(/\0.*$/, '');
    if (!name) break;
    const size = Number.parseInt(decoder.decode(header.subarray(124, 136)).replace(/\0.*$/, '').trim(), 8) || 0;
    const body = offset + 512;
    if (body + size > bytes.length) throw new Error('Invalid tar archive');
    entries[name] = bytes.slice(body, body + size);
    offset = body + Math.ceil(size / 512) * 512;
  }
  return entries;
}

export function archiveSubscriptions(bytes: Uint8Array, filename: string): ImportedSubscription[] {
  const name = filename.toLowerCase();
  const entries = name.endsWith('.zip') ? unzipSync(bytes) : name.endsWith('.tar.gz') || name.endsWith('.tgz') ? tarEntries(gunzipSync(bytes)) : null;
  if (!entries) throw new Error('Choose subscriptions.csv, a Google Takeout ZIP, or a .tar.gz archive');
  const csvName = Object.keys(entries).find(path => path.toLowerCase().endsWith('/subscriptions/subscriptions.csv') || path.toLowerCase() === 'subscriptions.csv');
  if (!csvName) throw new Error('This archive does not contain YouTube subscriptions.csv');
  return parseTakeoutSubscriptions(strFromU8(entries[csvName]));
}

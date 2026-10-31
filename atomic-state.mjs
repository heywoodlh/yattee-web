import fs from 'node:fs/promises';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

export async function writeFileAtomic(target, data, mode = 0o600) {
  await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
  const temporary = `${target}.${randomBytes(12).toString('hex')}.tmp`;
  await fs.writeFile(temporary, data, { mode });
  await fs.rename(temporary, target);
}

export const writeJsonAtomic = (target, value, mode = 0o600) => writeFileAtomic(target, JSON.stringify(value), mode);

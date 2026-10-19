// @ts-ignore Node runtime-only test
import { mkdtemp, readFile, rm } from 'node:fs/promises';
// @ts-ignore Node runtime-only test
import { tmpdir } from 'node:os';
// @ts-ignore Node runtime-only test
import path from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-ignore Container-side module
import { writeJsonAtomic } from '../atomic-state.mjs';

describe('atomic state persistence', () => {
  it('accepts overlapping progress saves without a rename failure or corrupt state', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'yattee-web-state-'));
    const target = path.join(directory, 'state.json');
    try {
      await expect(Promise.all(Array.from({ length: 25 }, (_, resume) => writeJsonAtomic(target, { resume })))).resolves.toHaveLength(25);
      const persisted = JSON.parse(await readFile(target, 'utf8'));
      expect(persisted.resume).toEqual(expect.any(Number));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

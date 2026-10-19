import { describe, expect, it } from 'vitest';
import { apiUrl, normalizeInstanceUrl } from './instance';

describe('remote Yattee instance configuration', () => {
  it('uses the current origin when no remote instance is configured', () => {
    expect(apiUrl('', '/api/v1/trending', 'http://yattee.barn-banana.ts.net')).toBe('http://yattee.barn-banana.ts.net/api/v1/trending');
  });

  it('normalizes an HTTPS remote instance and sends API calls to that instance', () => {
    expect(normalizeInstanceUrl(' https://yattee.example.net/ ')).toBe('https://yattee.example.net');
    expect(apiUrl('https://yattee.example.net/', '/api/v1/trending', 'http://yattee.barn-banana.ts.net')).toBe('https://yattee.example.net/api/v1/trending');
  });

  it('rejects non-HTTP instance URLs', () => {
    expect(() => normalizeInstanceUrl('file:///etc/passwd')).toThrow('http or https');
  });
});

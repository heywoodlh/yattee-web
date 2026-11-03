// The only outbound SponsorBlock target: never accept a client-provided host or path.
const categories = ['sponsor', 'selfpromo', 'interaction', 'intro', 'outro', 'preview', 'music_offtopic', 'filler', 'poi_highlight'];
export const sponsorVideoID = value => typeof value === 'string' && /^[\w-]{11}$/.test(value);
export function normalizeServerSponsorSettings(value) {
  const saved = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  return {
    enabled: typeof saved.enabled === 'boolean' ? saved.enabled : true,
    autoSkip: typeof saved.autoSkip === 'boolean' ? saved.autoSkip : true,
    categories: Array.isArray(saved.categories) ? categories.filter(category => saved.categories.includes(category)) : categories.slice(0, 5),
  };
}

export async function getSponsorSegments(videoID, fetcher = fetch) {
  if (!sponsorVideoID(videoID)) throw new Error('Invalid video ID');
  const url = new URL('https://sponsor.ajay.app/api/skipSegments');
  url.searchParams.set('videoID', videoID);
  url.searchParams.set('categories', JSON.stringify(categories));
  let response;
  try { response = await fetcher(url, { signal: AbortSignal.timeout(8000), redirect: 'error', headers: { Accept: 'application/json' } }); }
  catch { throw new Error('SponsorBlock is unavailable'); }
  if (response.status === 404) return [];
  if (!response.ok) throw new Error('SponsorBlock is unavailable');
  try {
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 262144) { await reader.cancel(); throw new Error('SponsorBlock response too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const entries = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(entries) || entries.length > 1000) throw new Error('Invalid SponsorBlock response');
    return entries.flatMap(entry => {
      if (!entry || entry.actionType !== 'skip' || !categories.includes(entry.category) || typeof entry.UUID !== 'string' || entry.UUID.length > 128 || !Array.isArray(entry.segment) || entry.segment.length !== 2) return [];
      const [start, end] = entry.segment;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start || end > 86400) return [];
      return [{ id: entry.UUID, category: entry.category, start, end }];
    }).sort((a, b) => a.start - b.start);
  } catch { throw new Error('Invalid SponsorBlock response'); }
}

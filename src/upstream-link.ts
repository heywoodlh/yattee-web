export function upstreamWatchRoute(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return undefined;
    return `watch-url/${encodeURIComponent(url.toString())}`;
  } catch {
    return undefined;
  }
}

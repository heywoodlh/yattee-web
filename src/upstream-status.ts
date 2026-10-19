const remoteRoute = new Set(['search', 'watch', 'watch-url', 'channel', 'playlist']);

export function upstreamRequired(route: string) {
  return remoteRoute.has(route.split('/', 1)[0]);
}

export function canUseCachedRoute(route: string) {
  return !upstreamRequired(route);
}

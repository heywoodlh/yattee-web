export function feedRefreshIndicator(refreshing: boolean) {
  return refreshing ? { label: 'Updating Feed' } : null;
}

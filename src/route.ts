export function initialRoute(hash: string): string {
  return hash || 'home';
}

export function routeUsesHistory(route: string): boolean {
  return route.split('/', 1)[0] === 'home';
}

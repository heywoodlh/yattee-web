export function normalizeInstanceUrl(value: string): string {
  const url = new URL(value.trim());
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Yattee instance URL must use http or https');
  if (url.username || url.password) throw new Error('Put credentials in the sign-in fields, not the instance URL');
  return url.origin + url.pathname.replace(/\/$/, '');
}

export function apiUrl(instanceUrl: string, path: string, currentOrigin: string): string {
  const base = instanceUrl.trim() ? normalizeInstanceUrl(instanceUrl) : currentOrigin;
  return new URL(path.replace(/^\//, ''), `${base}/`).toString();
}

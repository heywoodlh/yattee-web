export function profileMenuLabel(username: string): string | null {
  return username ? `Signed in as ${username}` : null;
}

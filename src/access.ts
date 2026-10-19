export type ManagedUser = { id: string; username: string };

export function controlsMutationAllowed(input: { isAdmin: boolean; target: 'self' | string; controlsEnabled: boolean; pinVerified: boolean }) {
  return input.isAdmin || (input.target === 'self' && (!input.controlsEnabled || input.pinVerified));
}

export function visibleManagedUsers(isAdmin: boolean, users: ManagedUser[]) {
  return isAdmin ? users : [];
}

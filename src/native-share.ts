export type NativeShareAvailability = 'available' | 'insecure' | 'unsupported';

export function nativeShareAvailability(secureContext: boolean, shareSupported: boolean): NativeShareAvailability {
  if (!secureContext) return 'insecure';
  return shareSupported ? 'available' : 'unsupported';
}

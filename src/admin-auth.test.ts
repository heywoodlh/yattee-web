import { describe, expect, it } from 'vitest';
// @ts-ignore Container-side module
import { adminIdentity, configuredAdmin, proxyAuthorization, shouldForwardUpstreamAuthorization } from '../admin-auth.mjs';

const basic = (value: string) => `Basic ${btoa(value)}`;

describe('local Yattee Web admin authentication', () => {
  it('recognizes only the fixed admin username with its locally stored verifier', () => {
    const verifier = configuredAdmin('local-admin-password');
    expect(adminIdentity(basic('admin:local-admin-password'), verifier)).toEqual({ username: 'admin', isLocalAdmin: true });
    expect(adminIdentity(basic('admin:wrong'), verifier)).toEqual({ username: 'admin', isLocalAdmin: false });
    expect(adminIdentity(basic('alice:local-admin-password'), verifier)).toEqual({ username: 'alice', isLocalAdmin: false });
  });

  it('never forwards an admin username credential to an upstream Yattee Server', () => {
    const auth = basic('admin:local-admin-password');
    expect(shouldForwardUpstreamAuthorization(auth, configuredAdmin('local-admin-password'))).toBe(false);
    expect(shouldForwardUpstreamAuthorization(basic('admin:wrong'), configuredAdmin('local-admin-password'))).toBe(false);
    expect(shouldForwardUpstreamAuthorization(basic('alice:password'), configuredAdmin('local-admin-password'))).toBe(true);
  });

  it('passes a native Yattee user credential through to the complete upstream API', () => {
    const admin = configuredAdmin('local-admin-password');
    const native = basic('alice:upstream-password');
    const browserSession = basic('bob:session-password');
    expect(proxyAuthorization(native, browserSession, admin)).toBe(native);
    expect(proxyAuthorization('', browserSession, admin)).toBe(browserSession);
    expect(proxyAuthorization(basic('admin:local-admin-password'), browserSession, admin)).toBe(browserSession);
  });
});

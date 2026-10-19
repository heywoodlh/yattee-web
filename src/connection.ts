import { apiUrl, normalizeInstanceUrl } from './instance';

type Request = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function retryConnection<T>(connect: () => Promise<T>, attempts = 3, retryDelayMs = 500): Promise<T> {
  let failure: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try { return await connect(); } catch (error) { failure = error; if (attempt + 1 < attempts) await new Promise(resolve => setTimeout(resolve, retryDelayMs)); }
  }
  throw failure;
}

export function validateServerConfiguration(instanceUrl: string, _username = '', _password = ''): string {
  return instanceUrl.trim() ? normalizeInstanceUrl(instanceUrl) : '';
}

export async function saveAfterSuccessfulTest(test: () => Promise<unknown>, save: () => Promise<unknown>) {
  await test();
  return save();
}

export async function testServerConnection(instanceUrl: string, currentOrigin: string, request: Request = fetch): Promise<string> {
  const normalized = validateServerConfiguration(instanceUrl);
  const response = await request(apiUrl(normalized, '/health', currentOrigin), { headers: { Accept: 'application/json' } });
  // A challenge proves that the remote service is online and will authenticate
  // the browser on its first proxied request.
  if (!response.ok && response.status !== 401) throw new Error(`Server connection failed (${response.status})`);
  return normalized ? 'Remote Yattee Server is online. Sign in when prompted.' : 'Using local-only mode.';
}

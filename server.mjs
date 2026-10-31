import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { decryptAuthorization, localSessionLifetimeSeconds, sessionRecord, tokenHash } from './local-upstream-session.mjs';
import { configureControls, defaultControls, publicControls, verifyPin } from './controls.mjs';
import { adminIdentity, configuredAdmin, proxyAuthorization, shouldForwardUpstreamAuthorization } from './admin-auth.mjs';
import { profileKey } from './profile-key.mjs';
import { writeJsonAtomic } from './atomic-state.mjs';
import { isProfileKey, mediaResponseHeaders, mediaTarget, upstreamTarget } from './request-safety.mjs';

const dataDir = process.env.YATTEE_WEB_DATA_DIR || '/data';
const configPath = path.join(dataDir, 'server.json');
const localStatePath = path.join(dataDir, 'state.json');
const profilesPath = path.join(dataDir, 'remote-users.json');
const localAdminPath = path.join(dataDir, 'local-admin.json');
const localSessionKeyPath = path.join(dataDir, 'local-upstream-session.key');
const localSessionsPath = path.join(dataDir, 'local-upstream-sessions.json');
const fallback = process.env.YATTEE_SERVER_URL || 'http://yattee.default.svc.cluster.local:80';
const defaults = { instanceUrl: '', controls: defaultControls };
const stateDefaults = { history: [], bookmarks: [], subscriptions: [], playlists: [], queue: [], settings: { autoplay: true, speed: 1, quality: 'auto', instanceUrl: '', theme: 'default' }, searchHistory: [], recentChannels: [], recentPlaylists: [], instances: [], mediaSources: [], channelNotificationSettings: [], controlsPresets: [], feedCache: { videos: [] } };

const read = async () => { try { const saved = JSON.parse(await fs.readFile(configPath, 'utf8')); return { ...defaults, ...saved, controls: { ...defaultControls, ...(saved.controls || {}) } }; } catch { return defaults; } };
let localAdmin = null;
async function writeLocalAdmin(admin) { await fs.mkdir(dataDir, { recursive: true, mode: 0o700 }); await fs.writeFile(`${localAdminPath}.tmp`, JSON.stringify(admin), { mode: 0o600 }); await fs.rename(`${localAdminPath}.tmp`, localAdminPath); localAdmin = admin; }
async function initializeLocalAdmin() { try { localAdmin = JSON.parse(await fs.readFile(localAdminPath, 'utf8')); } catch { if (process.env.LOCAL_ADMIN_PASSWORD) await writeLocalAdmin(configuredAdmin(process.env.LOCAL_ADMIN_PASSWORD)); } }
const localAdminStatus = request => ({ configured: !!localAdmin?.passwordHash, authenticated: adminIdentity(upstreamAuth(request), localAdmin).isLocalAdmin });
const localAdminChallenge = response => send(response, 401, { detail: 'Please provide yattee-web admin password' }, { 'www-authenticate': 'Basic realm="Yattee Web Admin"' });
const send = (response, status, payload, headers = {}) => { response.writeHead(status, { 'content-type': 'application/json', ...headers }); response.end(JSON.stringify(payload)); };
const parseBody = request => new Promise((resolve, reject) => { let raw = ''; request.on('data', chunk => raw += chunk); request.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { reject(new Error('Invalid JSON')); } }); });
const statePathFor = identity => identity ? path.join(dataDir, 'users', `${createHash('sha256').update(identity).digest('hex')}.json`) : localStatePath;
const upstreamAuth = request => typeof request.headers.authorization === 'string' && request.headers.authorization.startsWith('Basic ') ? request.headers.authorization : '';
const cookieValue = (request, name) => new RegExp(`(?:^|;\\s*)${name}=([^;]+)`).exec(String(request.headers.cookie || ''))?.[1] || '';
async function localSessionKey() { try { const key = await fs.readFile(localSessionKeyPath); if (key.length === 32) return key; } catch {} const key = randomBytes(32); await fs.mkdir(dataDir, { recursive: true, mode: 0o700 }); await fs.writeFile(`${localSessionKeyPath}.tmp`, key, { mode: 0o600 }); await fs.rename(`${localSessionKeyPath}.tmp`, localSessionKeyPath); return key; }
async function localSessions() { try { const sessions = JSON.parse(await fs.readFile(localSessionsPath, 'utf8')); return Array.isArray(sessions) ? sessions.filter(session => session?.expiresAt > Date.now()) : []; } catch { return []; } }
async function saveLocalSessions(sessions) { await fs.mkdir(dataDir, { recursive: true, mode: 0o700 }); await fs.writeFile(`${localSessionsPath}.tmp`, JSON.stringify(sessions), { mode: 0o600 }); await fs.rename(`${localSessionsPath}.tmp`, localSessionsPath); }
async function localSessionAuthorization(request) { const token = cookieValue(request, 'yattee_web_local_session'); if (!token) return ''; const sessions = await localSessions(); const session = sessions.find(item => item.tokenHash === tokenHash(token)); if (!session) return ''; try { return decryptAuthorization(session.authorization, await localSessionKey()); } catch { return ''; } }
async function createLocalSession(authorization) { const token = randomBytes(32).toString('base64url'); const sessions = await localSessions(); sessions.push(sessionRecord(token, authorization, await localSessionKey())); await saveLocalSessions(sessions); return token; }
async function revokeLocalSession(request) { const token = cookieValue(request, 'yattee_web_local_session'); if (token) await saveLocalSessions((await localSessions()).filter(session => session.tokenHash !== tokenHash(token))); }
const localSessionCookie = token => `yattee_web_local_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${localSessionLifetimeSeconds}`;
const remoteProfileCookie = key => `yattee_web_remote_profile=${key}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000`;
const offlineRemoteProfile = request => { const key = cookieValue(request, 'yattee_web_remote_profile'); return isProfileKey(key) ? key : ''; };
const isRemoteSignedOut = request => /(?:^|;\s*)yattee_web_remote_signed_out=1(?:;|$)/.test(String(request.headers.cookie || ''));
const challenge = (response, upstreamChallenge) => send(response, 401, { detail: 'Remote Yattee Server authentication required' }, { 'www-authenticate': hasBasicChallenge(upstreamChallenge) ? upstreamChallenge : 'Basic realm="Yattee Server"' });
const readState = async identity => { try { const value = JSON.parse(await fs.readFile(statePathFor(identity), 'utf8')); return value && typeof value === 'object' && !Array.isArray(value) ? { ...stateDefaults, ...value, settings: { ...stateDefaults.settings, ...(value.settings || {}) } } : stateDefaults; } catch { return stateDefaults; } };
const saveState = async (input, identity) => { if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid state'); const statePath = statePathFor(identity); const next = { ...stateDefaults, ...input, settings: { ...stateDefaults.settings, ...(input.settings || {}) } }; await writeJsonAtomic(statePath, next); return next; };
const requirePin = (current, supplied) => { if (current.controls?.enabled && !verifyPin(current.controls, supplied)) throw new Error('PIN required to change settings'); };

async function save(input) {
  const old = await read();
  requirePin(old, input.currentPin);
  const instanceUrl = input.instanceUrl === undefined ? old.instanceUrl : input.instanceUrl.trim();
  if (instanceUrl) new URL(instanceUrl);
  const controls = configureControls(old.controls, input.controls || {});
  const next = { instanceUrl, controls };
  await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });
  await fs.writeFile(`${configPath}.tmp`, JSON.stringify(next), { mode: 0o600 });
  await fs.rename(`${configPath}.tmp`, configPath);
  return next;
}

function isFallbackServer(instanceUrl) {
  try { return !!instanceUrl && new URL(instanceUrl).origin === new URL(fallback).origin; } catch { return false; }
}

async function checkConnection(config, authorization = '', protectedCheck = false) {
  const remote = !!config.instanceUrl && !isFallbackServer(config.instanceUrl);
  const target = new URL(protectedCheck ? '/api/v1/trending?limit=1' : '/health', remote ? config.instanceUrl : fallback);
  const client = target.protocol === 'https:' ? https : http;
  const headers = { Accept: 'application/json' };
  if (authorization) headers.authorization = authorization;
  return new Promise(resolve => {
    const upstream = client.request(target, { method: 'GET', headers }, response => {
      response.resume();
      const status = response.statusCode || 502;
      resolve({ healthy: status >= 200 && status < 300, online: status < 500, status, detail: `Server returned ${status}` });
    });
    upstream.setTimeout(10000, () => upstream.destroy(new Error('Connection timed out')));
    upstream.on('error', error => resolve({ healthy: false, online: false, status: 503, detail: error.message }));
    upstream.end();
  });
}

function hasBasicChallenge(value) { return (Array.isArray(value) ? value : [value]).some(challenge => typeof challenge === 'string' && /(?:^|,)\s*Basic(?:\s|$)/i.test(challenge)); }

async function remoteSession(config, request) {
  const local = adminIdentity(upstreamAuth(request), localAdmin);
  if (local.isLocalAdmin) return { remote: false, localAdmin: true, isAdmin: true, key: '', username: 'admin' };
  if (local.username === 'admin') return { error: 'local-auth' };
  if (!config.instanceUrl || isFallbackServer(config.instanceUrl)) {
    const authorization = upstreamAuth(request) || await localSessionAuthorization(request);
    if (!authorization || !shouldForwardUpstreamAuthorization(authorization, localAdmin)) return { remote: false, localUpstream: false, localAdmin: false, isAdmin: false, key: '', username: '' };
    const target = new URL('/api/user/me', fallback);
    const client = target.protocol === 'https:' ? https : http;
    const result = await new Promise(resolve => {
      const upstream = client.request(target, { method: 'GET', headers: { Accept: 'application/json', authorization } }, response => { let raw = ''; response.setEncoding('utf8'); response.on('data', chunk => raw += chunk); response.on('end', () => { try { resolve({ status: response.statusCode || 502, body: JSON.parse(raw || '{}') }); } catch { resolve({ status: response.statusCode || 502, body: {} }); } }); });
      upstream.on('error', () => resolve({ status: 503, body: {} })); upstream.end();
    });
    if (result.status < 200 || result.status >= 300 || !result.body.username || result.body.id == null) return { remote: false, localUpstream: false, localAdmin: false, isAdmin: false, key: '', username: '' };
    return { remote: false, localUpstream: true, localAdmin: false, isAdmin: !!result.body.is_admin, key: profileKey(fallback, result.body.id), username: String(result.body.username) };
  }
  if (isRemoteSignedOut(request)) return { error: 'logged-out' };
  const authorization = upstreamAuth(request);
  const target = new URL('/api/user/me', config.instanceUrl);
  const client = target.protocol === 'https:' ? https : http;
  const result = await new Promise(resolve => {
    const upstream = client.request(target, { method: 'GET', headers: { Accept: 'application/json', ...(authorization ? { authorization } : {}) } }, response => { let raw = ''; response.setEncoding('utf8'); response.on('data', chunk => raw += chunk); response.on('end', () => { try { resolve({ status: response.statusCode || 502, challenge: response.headers['www-authenticate'], body: JSON.parse(raw || '{}') }); } catch { resolve({ status: response.statusCode || 502, challenge: response.headers['www-authenticate'], body: {} }); } }); });
    upstream.on('error', () => resolve({ status: 503, body: {} })); upstream.end();
  });
  if (result.status === 401 && hasBasicChallenge(result.challenge)) return { error: 'auth', challenge: result.challenge };
  if (result.status < 200 || result.status >= 300 || !result.body.username || result.body.id == null) return { error: 'down' };
  const key = profileKey(config.instanceUrl, result.body.id);
  return { remote: true, isAdmin: !!result.body.is_admin, key, username: String(result.body.username) };
}
const controlsPathFor = key => key ? path.join(dataDir, 'users', `${key}.controls.json`) : configPath;
async function readProfileControls(config, key) { if (!key) return config.controls; try { return { ...defaultControls, ...JSON.parse(await fs.readFile(controlsPathFor(key), 'utf8')) }; } catch { return defaultControls; } }
async function saveProfileControls(key, controls) { const target = controlsPathFor(key); await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o700 }); await fs.writeFile(`${target}.tmp`, JSON.stringify(controls), { mode: 0o600 }); await fs.rename(`${target}.tmp`, target); }
async function rememberRemoteUser(session) { if (!session.remote) return; let users = []; try { users = JSON.parse(await fs.readFile(profilesPath, 'utf8')); } catch {} if (!Array.isArray(users)) users = []; const now = new Date().toISOString(); const next = [...users.filter(user => user.key !== session.key), { key: session.key, username: session.username, lastLogin: now }]; await fs.mkdir(dataDir, { recursive: true, mode: 0o700 }); await fs.writeFile(`${profilesPath}.tmp`, JSON.stringify(next), { mode: 0o600 }); await fs.rename(`${profilesPath}.tmp`, profilesPath); }
async function rememberedUsers() { try { const users = JSON.parse(await fs.readFile(profilesPath, 'utf8')); return Array.isArray(users) ? users.map(({ key, username, lastLogin }) => ({ id: key, username, lastLogin })) : []; } catch { return []; } }

const configuredOrigin = config => new URL(config.instanceUrl || fallback).origin;
const maxDownloads = 2;
let activeDownloads = 0;

async function downloadMedia(request, response) {
  const params = new URL(request.url, 'http://localhost').searchParams;
  const source = params.get('url');
  if (!source) return send(response, 400, { detail: 'Missing media URL' });
  const target = mediaTarget(source, configuredOrigin(await read()));
  if (activeDownloads >= maxDownloads) return send(response, 429, { detail: 'Too many downloads in progress' });
  const name = (params.get('filename') || 'yattee-video.mp4').replace(/[^a-zA-Z0-9._ -]/g, '_').replace(/\.mp4$/i, '') || 'yattee-video';
  response.writeHead(200, { 'content-type': 'video/mp4', 'content-disposition': `attachment; filename="${name}.mp4"`, 'cache-control': 'no-store' });
  const ffmpeg = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'https,http,tls,tcp,crypto', '-i', target.toString(), '-map', '0:v:0', '-map', '0:a:0?', '-c:v', 'libx264', '-preset', 'veryfast', '-c:a', 'aac', '-movflags', 'frag_keyframe+empty_moov+default_base_moof', '-f', 'mp4', 'pipe:1'], { stdio: ['ignore', 'pipe', 'ignore'] });
  activeDownloads += 1;
  ffmpeg.once('close', () => { activeDownloads -= 1; });
  ffmpeg.stdout.pipe(response);
  request.on('close', () => ffmpeg.kill('SIGTERM'));
  ffmpeg.on('error', () => response.destroy());
  ffmpeg.on('close', code => { if (code && !response.writableEnded) response.end(); });
}

async function streamMedia(request, response) {
  const source = new URL(request.url, 'http://localhost').searchParams.get('url');
  if (!source) return send(response, 400, { detail: 'Missing media URL' });
  const config = await read();
  const origin = configuredOrigin(config);
  let target;
  try { target = mediaTarget(source, origin); } catch { return send(response, 403, { detail: 'Unsupported media host' }); }
  const client = target.protocol === 'https:' ? https : http;
  const headers = { Accept: '*/*' };
  if (request.headers.range) headers.Range = request.headers.range;
  if (target.origin === origin && config.username) headers.authorization = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
  const upstream = client.request(target, { method: 'GET', headers }, upstreamResponse => {
    const contentType = String(upstreamResponse.headers['content-type'] || '');
    if (!contentType.includes('mpegurl')) { response.writeHead(upstreamResponse.statusCode || 502, mediaResponseHeaders(upstreamResponse.headers)); return upstreamResponse.pipe(response); }
    let playlist = '';
    upstreamResponse.setEncoding('utf8');
    upstreamResponse.on('data', chunk => playlist += chunk);
    upstreamResponse.on('end', () => {
      const relay = value => `/stream?url=${encodeURIComponent(new URL(value, target).toString())}`;
      const rewritten = playlist.split('\n').map(line => line.startsWith('#') ? line.replace(/URI="([^"]+)"/g, (_, value) => `URI="${relay(value)}"`) : line ? relay(line) : line).join('\n');
      const responseHeaders = { ...mediaResponseHeaders(upstreamResponse.headers), 'content-length': Buffer.byteLength(rewritten) };
      response.writeHead(upstreamResponse.statusCode || 502, responseHeaders); response.end(rewritten);
    });
  });
  upstream.on('error', error => send(response, 502, { detail: error.message }));
  upstream.end();
}

async function proxy(request, response, configOverride) {
  const config = configOverride || await read();
  const remote = !!config.instanceUrl && !isFallbackServer(config.instanceUrl);
  if (remote) {
    const health = await checkConnection(config);
    if (!health.online) return send(response, 503, { detail: 'The configured upstream Yattee Server is down. Switch to local-only mode in Settings to continue.' });
  }
  let controls = config.controls;
  if (remote) { const session = await remoteSession(config, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down. Switch to local-only mode in Settings to continue.' }); if (session.localAdmin) return send(response, 403, { detail: 'Yattee Web local admin access is restricted to Settings.' }); await rememberRemoteUser(session); controls = await readProfileControls(config, session.key); }
  if (controls.enabled && controls.disableSearch && request.url.startsWith('/api/v1/search')) return send(response, 403, { detail: 'Search is disabled by parental controls' });
  const target = upstreamTarget(request.url, remote ? config.instanceUrl : fallback);
  const client = target.protocol === 'https:' ? https : http;
  const headers = { ...request.headers, host: target.host };
  if (!remote) { const authorization = proxyAuthorization(upstreamAuth(request), await localSessionAuthorization(request), localAdmin); delete headers.authorization; if (authorization) headers.authorization = authorization; }
  else if (!shouldForwardUpstreamAuthorization(headers.authorization, localAdmin)) delete headers.authorization;
  const upstream = client.request(target, { method: request.method, headers }, upstreamResponse => { const responseHeaders = { ...upstreamResponse.headers }; if (!remote) delete responseHeaders['www-authenticate']; response.writeHead(upstreamResponse.statusCode || 502, responseHeaders); upstreamResponse.pipe(response); });
  upstream.on('error', error => send(response, 503, { detail: `The configured upstream Yattee Server is down: ${error.message}` }));
  request.pipe(upstream);
}

async function sessionFailure(response, session) { return session.error === 'local-auth' ? localAdminChallenge(response) : challenge(response); }

await initializeLocalAdmin();
http.createServer(async (request, response) => {
  try {
    if (request.url === '/local-admin/status' && request.method === 'GET') return send(response, 200, { configured: !!localAdmin?.passwordHash });
    if (request.url === '/local-admin/setup' && request.method === 'POST') { if (localAdmin?.passwordHash) return send(response, 409, { detail: 'Yattee Web admin password is already configured' }); const input = await parseBody(request); await writeLocalAdmin(configuredAdmin(input.password)); return send(response, 201, { configured: true }); }
    if (request.url === '/local-admin/session' && request.method === 'GET') { if (!localAdmin?.passwordHash) return send(response, 409, { detail: 'Yattee Web admin password has not been configured' }); return localAdminStatus(request).authenticated ? send(response, 200, { authenticated: true, username: 'admin' }) : localAdminChallenge(response); }
    if (request.url === '/upstream-login' && request.method === 'GET') { const authorization = upstreamAuth(request); if (!authorization) { response.writeHead(401, { 'www-authenticate': 'Basic realm="Yattee Server"' }); return response.end('Yattee Server login required'); } if (!shouldForwardUpstreamAuthorization(authorization, localAdmin)) return localAdminChallenge(response); const health = await checkConnection(await read(), authorization, true); if (!health.healthy) { response.writeHead(401, { 'www-authenticate': 'Basic realm="Yattee Server"' }); return response.end('Yattee Server login failed'); } const token = await createLocalSession(authorization); response.writeHead(302, { location: '/', 'set-cookie': localSessionCookie(token) }); return response.end(); }
    if (request.url === '/logout' && request.method === 'POST') { const config = await read(); if (!config.instanceUrl || isFallbackServer(config.instanceUrl)) { await revokeLocalSession(request); response.writeHead(204, { 'set-cookie': 'yattee_web_local_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' }); return response.end(); } response.writeHead(204, { 'set-cookie': 'yattee_web_remote_signed_out=1; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000' }); return response.end(); }
    if (request.url === '/login' && request.method === 'POST') { response.writeHead(204, { 'set-cookie': 'yattee_web_remote_signed_out=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' }); return response.end(); }
    if (request.url === '/session' && request.method === 'GET') { const config = await read(); const session = await remoteSession(config, request); if (session.error === 'logged-out') return send(response, 200, { remote: true, loggedOut: true, isAdmin: false, username: '' }); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error === 'down') return send(response, 200, { remote: true, unavailable: true, isAdmin: false, username: '' }); if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down.' }); await rememberRemoteUser(session); return send(response, 200, { remote: session.remote, localUpstream: !!session.localUpstream, localAdmin: !!session.localAdmin, isAdmin: session.isAdmin, username: session.username, profile: session.key || 'local' }, session.remote ? { 'set-cookie': remoteProfileCookie(session.key) } : {}); }
    if (request.url === '/controls/verify' && request.method === 'POST') { const config = await read(); const session = await remoteSession(config, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down.' }); const input = await parseBody(request); const controls = await readProfileControls(config, session.key); return verifyPin(controls, input.currentPin) ? send(response, 200, { ok: true }) : send(response, 403, { detail: 'PIN required' }); }
    if (request.url === '/controls' || request.url.startsWith('/controls?')) { const config = await read(); const session = await remoteSession(config, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down.' }); await rememberRemoteUser(session); const target = new URL(request.url, 'http://localhost').searchParams.get('user') || session.key; if (target !== session.key && !isProfileKey(target)) return send(response, 400, { detail: 'Invalid user' }); if (target !== session.key && !session.isAdmin) return send(response, 403, { detail: 'Admin permission required' }); const existing = await readProfileControls(config, target); if (request.method === 'GET') return send(response, 200, { controls: publicControls(existing), user: target }); if (request.method === 'PUT') { const input = await parseBody(request); if (!session.isAdmin && existing.enabled && !verifyPin(existing, input.currentPin)) return send(response, 403, { detail: 'PIN required to change settings' }); const controls = configureControls(existing, input.controls || {}); if (session.key) await saveProfileControls(target, controls); else await save({ controls, currentPin: input.currentPin }); return send(response, 200, { controls: publicControls(controls), user: target }); } return send(response, 405, { detail: 'Method not allowed' }); }
    if (request.url === '/web-admin/users' && request.method === 'GET') { const config = await read(); const session = await remoteSession(config, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (!session.isAdmin) return send(response, 403, { detail: 'Admin permission required' }); return send(response, 200, { users: await rememberedUsers() }); }
    if (request.url.startsWith('/web-admin/history?') && request.method === 'GET') { const config = await read(); const session = await remoteSession(config, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (!session.isAdmin) return send(response, 403, { detail: 'Admin permission required' }); const user = new URL(request.url, 'http://localhost').searchParams.get('user'); const users = await rememberedUsers(); if (!user || !users.some(entry => entry.id === user)) return send(response, 404, { detail: 'Logged-in user not found' }); return send(response, 200, { history: (await readState(user)).history || [] }); }
    if (request.url === '/subscriptions/import' && request.method === 'POST') { const config = await read(); const session = await remoteSession(config, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down.' }); const controls = await readProfileControls(config, session.key); if (controls.enabled && controls.disableSubscriptionImport) return send(response, 403, { detail: 'Subscription importing is disabled by parental controls' }); const input = await parseBody(request); if (controls.enabled && !session.isAdmin && !verifyPin(controls, input.currentPin)) return send(response, 403, { detail: 'PIN required' }); const channels = Array.isArray(input.channels) ? input.channels : []; if (channels.length > 5000 || channels.some(channel => !channel || typeof channel.authorId !== 'string' || !/^UC[\w-]{3,}$/.test(channel.authorId) || typeof channel.author !== 'string' || channel.author.length > 200)) return send(response, 400, { detail: 'Invalid subscription import' }); const state = await readState(session.key); const unique = new Map(channels.map(channel => [channel.authorId, { authorId: channel.authorId, author: channel.author, authorThumbnails: [] }])); for (const channel of state.subscriptions || []) if (!unique.has(channel.authorId)) unique.set(channel.authorId, channel); const saved = await saveState({ ...state, subscriptions: [...unique.values()] }, session.key); return send(response, 200, { subscriptions: saved.subscriptions }); }
    if (request.url === '/state' && (request.method === 'GET' || request.method === 'PUT')) {
      const config = await read(); const session = await remoteSession(config, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error === 'down') { const key = offlineRemoteProfile(request); if (!key) return request.method === 'GET' ? send(response, 200, stateDefaults) : send(response, 503, { detail: 'Yattee Server is offline' }); return request.method === 'GET' ? send(response, 200, await readState(key)) : send(response, 200, await saveState(await parseBody(request), key)); } if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down. Switch to local-only mode in Settings to continue.' }); await rememberRemoteUser(session); return request.method === 'GET' ? send(response, 200, await readState(session.key)) : send(response, 200, await saveState(await parseBody(request), session.key));
    }
    if (request.url === '/config/remove' && request.method === 'POST') { if (!localAdminStatus(request).authenticated) return localAdminChallenge(response); const current = await read(); const next = { ...current, instanceUrl: '' }; await fs.writeFile(`${configPath}.tmp`, JSON.stringify(next), { mode: 0o600 }); await fs.rename(`${configPath}.tmp`, configPath); return send(response, 200, { configured: false, mode: 'local' }); }
    if (request.url === '/config' && request.method === 'GET') { const config = await read(); const configured = !!config.instanceUrl && !isFallbackServer(config.instanceUrl); return send(response, 200, { instanceUrl: config.instanceUrl, configured, mode: configured ? 'remote' : 'local', controls: publicControls(config.controls) }); }
    if (request.url === '/config' && request.method === 'PUT') { const input = await parseBody(request); const current = await read(); const session = await remoteSession(current, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down.' }); if (!session.localAdmin && !session.remote) return localAdminChallenge(response); if (session.remote && !session.isAdmin) return send(response, 403, { detail: 'Yattee Server admin permission required' }); const config = await save(input); const configured = !!config.instanceUrl && !isFallbackServer(config.instanceUrl); return send(response, 200, { instanceUrl: config.instanceUrl, configured, mode: configured ? 'remote' : 'local', controls: publicControls(config.controls) }); }
    if (request.url === '/config/verify' && request.method === 'POST') { const input = await parseBody(request); requirePin(await read(), input.currentPin); return send(response, 200, { ok: true }); }
    if (request.url === '/config/health' && request.method === 'GET') { const config = await read(); const health = await checkConnection(config); const configured = !!config.instanceUrl && !isFallbackServer(config.instanceUrl); const using = configured ? 'remote' : 'local'; return send(response, health.online ? 200 : 503, { ...health, configured, using, instanceUrl: config.instanceUrl }); }
    if (request.url === '/config/test' && request.method === 'POST') { const input = await parseBody(request); const current = await read(); const session = await remoteSession(current, request); if (session.error === 'local-auth') return localAdminChallenge(response); if (session.error === 'auth') return challenge(response, session.challenge); if (session.error) return send(response, 503, { detail: 'The configured upstream Yattee Server is down.' }); if (!session.localAdmin && !session.remote) return localAdminChallenge(response); if (session.remote && !session.isAdmin) return send(response, 403, { detail: 'Yattee Server admin permission required' }); requirePin(current, input.currentPin); const candidate = { ...current, instanceUrl: input.instanceUrl === undefined ? current.instanceUrl : input.instanceUrl.trim() }; if (candidate.instanceUrl) new URL(candidate.instanceUrl); const health = await checkConnection(candidate); return send(response, health.online ? 200 : 502, health); }
    if (request.url.startsWith('/download?') && request.method === 'GET') return await downloadMedia(request, response);
    if (request.url.startsWith('/stream?') && request.method === 'GET') return await streamMedia(request, response);
    return await proxy(request, response);
  } catch (error) { send(response, 400, { detail: error.message }); }
}).listen(3000, '127.0.0.1');

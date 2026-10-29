import http from 'node:http';

const video = { videoId: 'abcdefghijk', title: 'Fixture video', author: 'Fixture creator', authorId: 'fixture', lengthSeconds: 100, originalUrl: 'https://www.youtube.com/watch?v=abcdefghijk', formatStreams: [{ itag: '18', url: 'http://fixture:8085/media.mp4', type: 'video/mp4; codecs="avc1.42001E, mp4a.40.2"', resolution: '360p', fps: 30 }], adaptiveFormats: [{ itag: '299', url: 'http://fixture:8085/video.mp4', type: 'video/mp4', resolution: '1080p', fps: 60 }, { itag: '140', url: 'http://fixture:8085/audio.m4a', type: 'audio/mp4' }] };
http.createServer((request, response) => {
  const path = new URL(request.url, 'http://fixture').pathname;
  const body = path === '/health' ? { ok: true } : path === '/api/user/me' ? { id: 1, username: 'fixture', is_admin: false } : path === '/api/v1/videos/abcdefghijk' ? video : path === '/api/v1/search' ? [video] : { detail: 'not found' };
  response.writeHead(path === '/health' || path === '/api/user/me' || path === '/api/v1/videos/abcdefghijk' || path === '/api/v1/search' ? 200 : 404, { 'content-type': 'application/json' }); response.end(JSON.stringify(body));
}).listen(8085, '0.0.0.0');

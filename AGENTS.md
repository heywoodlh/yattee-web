# yattee-web agent guide

## Architecture

Yattee Web is a standalone React/Vite PWA and Node/Nginx sidecar. The browser bundle lives in `src/`; `server.mjs` owns the same-origin API, persisted `/data` profile state, local-admin boundary, upstream authentication forwarding, and restricted media relays. Nginx serves the PWA and proxies protected application routes to the sidecar.

Keep `/data` authoritative whenever it is reachable. The PWA may retain profile-isolated IndexedDB snapshots only for outage recovery; never store credentials, PIN verifiers, server configuration, or arbitrary media in browser storage. Do not weaken `/stream`, `/download`, or URL/extraction boundaries, and never log or inspect credentials or protected state files.

## Development

Use Node 22 and the committed lockfile:

```sh
npm ci --no-audit --no-fund
npm test
npm run check
npm run build
node --check server.mjs
git diff --check
```

Add a focused regression test before behavior changes, then run the full suite. The test suite covers the client behavior and server-side security helpers. The Docker smoke test verifies the built image starts and serves the shell, worker, and safe session contract.

## Nix

The flake exposes `yattee-web` as the default package and app:

```sh
nix run github:heywoodlh/yattee-web
```

The flake supports x86_64 Linux, ARM64 Linux, and ARM64 macOS. The Nix launcher stores persistent state in `YATTEE_WEB_DATA_DIR` (default: `./data`) and listens on port 8080.

## Deployment

`Dockerfile` produces the deployable image. On merges to `main`, `.github/workflows/publish.yml` publishes multi-architecture `linux/amd64` and `linux/arm64` manifests for `latest`, the package version, and a commit-SHA tag to GHCR. Pull requests into `main` run `.github/workflows/ci.yml`; they do not publish images.

For the existing Kubernetes sandbox, build and push the current `0.1.0` image only after all local checks pass, then restart `sandbox/yattee-web` and verify the running Pod serves the expected client asset. Do not modify production Kubernetes or `nixos-configs` without explicit authorization.

## Contributions

Use a feature branch and pull request against `main`. Preserve normal Git history after the initial `0.1.0` bootstrap unless the maintainer explicitly asks otherwise. Keep changes narrowly scoped, document user-facing deployment changes in `README.md`, and keep the service unauthenticated at the web boundary while preserving all upstream and local-admin safeguards.

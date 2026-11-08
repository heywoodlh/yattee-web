# yattee-web

Standalone web client for Yattee Server.

## What's new in 0.2.0

Search defaults to mixed video, channel, and playlist results. Use the All, Videos, Channels, Topics, and Playlists filters to narrow results; Topics shows channels whose names end in “- Topic.” The Channels page has a **Find channels to subscribe** button that searches Yattee Server without importing another user's subscriptions. Open a result and select **Subscribe** to add it to your own profile.

SponsorBlock is available for YouTube videos, with the same five categories enabled by default as the Yattee iOS client. Manage automatic skipping and categories in **Settings → SponsorBlock**. When automatic skipping is off, use the player’s **Skip segment** button. Segments are fetched through a fixed-origin relay to `https://sponsor.ajay.app`; playback continues when that service is unavailable. Upstream Yattee Server credentials are never forwarded to SponsorBlock.

Videos with dubbed audio tracks now play the original-language track by default. Choose a preferred language in **Settings → Audio language**, or switch tracks from the player's **Audio** menu. When a video has several audio languages, **Auto** quality plays adaptive video (up to 1080p) with the chosen track, because HLS and muxed streams don't say which language they carry.

# Docker

```yaml
services:
  yattee-server:
    image: yattee/yattee-server:latest
    volumes:
      - yattee-server-data:/app/data
      - yattee-server-downloads:/downloads

  yattee-web:
    image: ghcr.io/heywoodlh/yattee-web:latest
    ports:
      - "8080:8080"
    volumes:
      - yattee-web-data:/data
    environment:
      YATTEE_SERVER_URL: http://yattee-server:8085
    depends_on:
      - yattee-server

volumes:
  yattee-server-data:
  yattee-server-downloads:
  yattee-web-data:
```

# NixOS

```nix
{
  inputs.yattee-web.url = "github:heywoodlh/yattee-web";

  outputs = { nixpkgs, yattee-web, ... }: {
    nixosConfigurations.example = nixpkgs.lib.nixosSystem {
      modules = [
        yattee-web.nixosModules.default
        {
          services.yattee-web = {
            enable = true;
            serverUrl = "http://127.0.0.1:8085";
            openFirewall = true;
          };
        }
      ];
    };
  };
}
```

The service listens on port 8080 and stores its state in `/var/lib/yattee-web`.

When Yattee Web is served over HTTPS, set `YATTEE_WEB_SECURE_COOKIES=1` (or `services.yattee-web.secureCookies = true`) to mark its session cookies `Secure`.

The key that encrypts stored upstream sessions defaults to `local-upstream-session.key` in the data directory. To keep it elsewhere, point `YATTEE_WEB_SESSION_KEY_FILE` at a file holding a 32-byte key (raw, hex, or base64), or set `services.yattee-web.sessionKeyFile`, which passes it in as a systemd credential. Changing the key signs out existing browser sessions.

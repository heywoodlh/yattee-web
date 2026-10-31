# yattee-web

Standalone web client for Yattee Server.

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

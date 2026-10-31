{
  description = "Yattee Web PWA and local gateway";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" "aarch64-darwin" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      packages = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
          webRoot = pkgs.buildNpmPackage {
            pname = "yattee-web-assets";
            version = "0.1.0";
            src = self;
            npmDepsHash = "sha256-D1n48n1aNYHwM0yOt7Z8J5phV/LqZ7gHYbSYlmyEVU4=";
            installPhase = ''
              runHook preInstall
              mkdir -p "$out"
              cp -r dist/. "$out/"
              runHook postInstall
            '';
          };
          serverRoot = pkgs.runCommand "yattee-web-server" { nativeBuildInputs = [ pkgs.coreutils ]; } ''
            mkdir -p "$out"
            cp -L ${./server.mjs} "$out/server.mjs"
            cp -L ${./controls.mjs} "$out/controls.mjs"
            cp -L ${./admin-auth.mjs} "$out/admin-auth.mjs"
            cp -L ${./local-upstream-session.mjs} "$out/local-upstream-session.mjs"
            cp -L ${./profile-key.mjs} "$out/profile-key.mjs"
            cp -L ${./atomic-state.mjs} "$out/atomic-state.mjs"
          '';
          nginxConfig = pkgs.writeText "yattee-web-nginx.conf" ''
            pid nginx.pid;
            error_log stderr;
            events {}
            http {
              access_log /dev/stdout;
              include ${pkgs.nginx}/conf/mime.types;
              server {
                listen 8080;
                client_max_body_size 8m;
                server_name _;
                root ${webRoot};
                index index.html;
                location ^~ /download { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header Authorization $http_authorization; }
                location ^~ /stream { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header Authorization $http_authorization; }
                location ~ ^/(state$|session$|local-admin(?:/|$)|controls(?:/|$)|subscriptions/import$|web-admin/|config(?:/|$)|api/|proxy/|health$|info$|setup$|login$|upstream-login$|logout$|admin$|watch$|static/) { proxy_pass http://127.0.0.1:3000; proxy_http_version 1.1; proxy_set_header Host $host; proxy_set_header Authorization $http_authorization; }
                location = /index.html { add_header Cache-Control "no-cache"; }
                location / { try_files $uri $uri/ /index.html; }
              }
            }
          '';
        in {
          default = pkgs.writeShellApplication {
            name = "yattee-web";
            runtimeInputs = [ pkgs.nodejs_22 pkgs.nginx pkgs.ffmpeg pkgs.coreutils ];
            text = ''
              data_dir="''${YATTEE_WEB_DATA_DIR:-$PWD/data}"
              runtime_dir="$(mktemp -d)"
              cleanup() {
                if [ -n "''${server_pid:-}" ]; then kill "$server_pid" 2>/dev/null || true; fi
                rm -rf "$runtime_dir"
              }
              trap cleanup EXIT INT TERM
              mkdir -p "$data_dir"
              chmod 700 "$data_dir"
              export YATTEE_WEB_DATA_DIR="$data_dir"
              node ${serverRoot}/server.mjs &
              server_pid=$!
              nginx -g 'daemon off;' -c ${nginxConfig} -p "$runtime_dir" | cat
            '';
            meta = {
              mainProgram = "yattee-web";
              platforms = pkgs.lib.platforms.unix;
            };
          };
        });
      nixosModules.default = import ./nixos-module.nix self;
      apps = forAllSystems (system: {
        default = {
          type = "app";
          program = "${self.packages.${system}.default}/bin/yattee-web";
        };
      });
    };
}

self:
{ config, lib, pkgs, ... }:
let
  cfg = config.services.yattee-web;
in
{
  options.services.yattee-web = {
    enable = lib.mkEnableOption "Yattee Web";
    package = lib.mkOption {
      type = lib.types.package;
      default = self.packages.${pkgs.stdenv.hostPlatform.system}.default;
      defaultText = lib.literalExpression "yattee-web.packages.\${pkgs.stdenv.hostPlatform.system}.default";
      description = "The yattee-web package to run.";
    };
    serverUrl = lib.mkOption {
      type = lib.types.str;
      example = "http://127.0.0.1:8085";
      description = "URL of the Yattee Server instance that Yattee Web uses by default.";
    };
    environmentFile = lib.mkOption {
      type = lib.types.nullOr lib.types.path;
      default = null;
      example = "/run/secrets/yattee-web.env";
      description = ''
        Environment file passed to the service, for secrets such as
        `LOCAL_ADMIN_PASSWORD`, which sets the Yattee Web admin password on
        first start instead of leaving it to the first visitor.
      '';
    };
    openFirewall = lib.mkOption {
      type = lib.types.bool;
      default = false;
      description = "Whether to open port 8080 in the firewall.";
    };
  };

  config = lib.mkIf cfg.enable {
    systemd.services.yattee-web = {
      description = "Yattee Web";
      after = [ "network-online.target" ];
      wants = [ "network-online.target" ];
      wantedBy = [ "multi-user.target" ];
      environment = {
        YATTEE_SERVER_URL = cfg.serverUrl;
        YATTEE_WEB_DATA_DIR = "/var/lib/yattee-web";
      };
      serviceConfig = {
        ExecStart = lib.getExe cfg.package;
        EnvironmentFile = lib.mkIf (cfg.environmentFile != null) cfg.environmentFile;
        DynamicUser = true;
        StateDirectory = "yattee-web";
        StateDirectoryMode = "0700";
        PrivateTmp = true;
        Restart = "always";
        UMask = "0077";
        CapabilityBoundingSet = "";
        AmbientCapabilities = "";
        PrivateDevices = true;
        ProtectKernelTunables = true;
        ProtectKernelModules = true;
        ProtectKernelLogs = true;
        ProtectControlGroups = true;
        ProtectClock = true;
        ProtectHostname = true;
        ProtectProc = "invisible";
        RestrictAddressFamilies = [
          "AF_UNIX"
          "AF_INET"
          "AF_INET6"
          "AF_NETLINK"
        ];
        RestrictNamespaces = true;
        RestrictRealtime = true;
        LockPersonality = true;
        SystemCallArchitectures = "native";
        SystemCallFilter = [
          "@system-service"
          "~@privileged"
        ];
        TasksMax = 256;
      };
    };

    networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ 8080 ];
  };
}

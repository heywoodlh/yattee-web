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
        DynamicUser = true;
        StateDirectory = "yattee-web";
        StateDirectoryMode = "0700";
        PrivateTmp = true;
        Restart = "on-failure";
      };
    };

    networking.firewall.allowedTCPPorts = lib.mkIf cfg.openFirewall [ 8080 ];
  };
}

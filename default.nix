with builtins;
{ pkgs ? import
    (
      fetchTarball {
        name = "nixpkgs-unstable-2022-04-21";
        url = "https://github.com/NixOS/nixpkgs/archive/76b68621e88f674922aa70276a8333f319ce9c05.tar.gz";
        sha256 = "0c02rxy51jyvmim3h394xjxb6wmnla52mdx1h7rq8x0cf47wmfq4";
      }
    )
    {
      config = {
        allowUnfree = true;
      };
      overlays = [ ];
    }
}:
let
  name = "ec2instances.info";

  tools = with pkgs; {
    actions = [
      act
    ];
    cli = [
      bashInteractive_5
      coreutils
      curl
      jq
    ];
    formatters = [
      black
      nixpkgs-fmt
      nodePackages.prettier
    ];
    python = [
      (python39.withPackages (p: with p; lib.flatten [
        boto
        boto3
        (invocations.overridePythonAttrs (old: { propagatedBuildInputs = old.propagatedBuildInputs ++ [ tqdm ]; }))
        invoke
        lxml
        Mako
        requests
        six
      ]))
    ];
    scripts = [
      (writeShellScriptBin "test_actions" ''
        ${pkgs.act}/bin/act --artifact-server-path ./.cache/ -r --rm
      '')
    ];
  };

  packages = with pkgs; lib.flatten [
    (pkgs.lib.flatten (attrValues tools))
  ];

  env = pkgs.buildEnv {
    inherit name;
    buildInputs = packages;
    paths = packages;
  };
in
env

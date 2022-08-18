with builtins;
{ pkgs ? import
    (
      fetchTarball {
        name = "nixpkgs-unstable-2022-08-17";
        url = "https://github.com/NixOS/nixpkgs/archive/6c6409e965a6c883677be7b9d87a95fab6c3472e.tar.gz";
        sha256 = "0l1py0rs1940wx76gpg66wn1kgq2rv2m9hzrhq5isz42hdpf4q6r";
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
      nixpkgs-fmt
      nodePackages.prettier
    ];
    python = [
      (python39.withPackages (p: with p; [
        black
        boto
        boto3
        (invocations.overridePythonAttrs (old: { propagatedBuildInputs = old.propagatedBuildInputs ++ [ tqdm ]; }))
        invoke
        lxml
        Mako
        pyyaml
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

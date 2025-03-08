{
  description = "Vipr-Wallet development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs_20
            nodePackages.pnpm
            nodePackages.typescript
          ];

          shellHook = ''
            echo "Vipr-Wallet development environment"
            echo "Node.js $(node --version)"
            echo "pnpm $(pnpm --version)"
            echo "TypeScript $(tsc --version)"
            echo ""
            echo "Run 'pnpm install' to set up dependencies"
            echo "Then 'pnpm dev' to start the development server"
          '';
        };
      }
    );
}
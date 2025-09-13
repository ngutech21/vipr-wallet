{
  description = "Vipr-Wallet development environment";
  

  inputs = {
    # Follow fedimint's pinned nixpkgs (nixos-24.11) for cache hits
    fedimint.url = "github:fedimint/fedimint/v0.7.2";
    nixpkgs.follows = "fedimint/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils,fedimint, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pinnedNixpkgs = fedimint.inputs.nixpkgs;
        pkgs = import pinnedNixpkgs {
          inherit system;
          overlays = [ fedimint.overlays.all ];
        };
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            fedimint.packages.${system}.devimint
            fedimint.packages.${system}.gateway-pkgs
            fedimint.packages.${system}.fedimint-pkgs
            fedimint.packages.${system}.fedimint-recurringd
            pkgs.bitcoind
            pkgs.electrs
            pkgs.lnd
            pkgs.esplora-electrs
            #pkgs.jq
            #pkgs.netcat
            #pkgs.perl
            #pkgs.procps
            #pkgs.which
            #pkgs.git

            nodejs_22
            nodePackages.pnpm
            nodePackages.typescript
            mkcert
            pkgs.playwright-driver.browsers
          ];

          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true

            echo "Vipr-Wallet development environment"
            echo "Node.js $(node --version)"
            echo "pnpm $(pnpm --version)"
            echo "TypeScript $(tsc --version)"
            
            # Create certs directory if it doesn't exist
            #mkdir -p certs
            
            # Generate certificates if they don't exist
            # if [ ! -f "certs/localhost-key.pem" ] || [ ! -f "certs/localhost.pem" ]; then
            #   echo "Generating TLS certificates for localhost..."
            #   cd certs
            #   mkcert -install >/dev/null 2>&1
              
            #   # Detect all local IPs
            #   echo "Detecting local IP addresses..."
            #   LOCAL_IPS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | tr '\n' ' ')
            #   echo "Found local IPs: $LOCAL_IPS"
              
            #   # Generate certificates with localhost and all detected IPs
            #   mkcert --cert-file localhost.pem --key-file localhost-key.pem localhost 127.0.0.1 $LOCAL_IPS
              
            #   cd ..
            #   echo "✅ TLS certificates generated for localhost and local IPs!"
            # else
            #   echo "✅ TLS certificates already exist"
            # fi
            
            # # Export environment variables for Quasar
            # export HTTPS_KEY="$(pwd)/certs/localhost-key.pem"
            # export HTTPS_CERT="$(pwd)/certs/localhost.pem"
            # echo "HTTPS_KEY=$HTTPS_KEY"
            # echo "HTTPS_CERT=$HTTPS_CERT"
            
            
            echo ""
            echo "Run 'pnpm install' to set up dependencies"
            echo "Then 'pnpm dev' to start the development server with HTTPS"
          '';
        };
      }
    );
    nixConfig = {
      allow-dirty = true;
      extra-substituters = [ "https://fedimint.cachix.org" ];
      extra-trusted-public-keys = [
        "fedimint.cachix.org-1:FpJJjy1iPVlvyv4OMiN5y9+/arFLPcnZhZVVCHCDYTs="
    ];
  };
}
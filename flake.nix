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
            mkcert
          ];

          shellHook = ''
            echo "Vipr-Wallet development environment"
            echo "Node.js $(node --version)"
            echo "pnpm $(pnpm --version)"
            echo "TypeScript $(tsc --version)"
            
            # Create certs directory if it doesn't exist
            mkdir -p certs
            
            # Generate certificates if they don't exist
            if [ ! -f "certs/localhost-key.pem" ] || [ ! -f "certs/localhost.pem" ]; then
              echo "Generating TLS certificates for localhost..."
              cd certs
              mkcert -install >/dev/null 2>&1
              
              # Detect all local IPs
              echo "Detecting local IP addresses..."
              LOCAL_IPS=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | tr '\n' ' ')
              echo "Found local IPs: $LOCAL_IPS"
              
              # Generate certificates with localhost and all detected IPs
              mkcert --cert-file localhost.pem --key-file localhost-key.pem localhost 127.0.0.1 $LOCAL_IPS
              
              cd ..
              echo "✅ TLS certificates generated for localhost and local IPs!"
            else
              echo "✅ TLS certificates already exist"
            fi
            
            # Export environment variables for Quasar
            export HTTPS_KEY="$(pwd)/certs/localhost-key.pem"
            export HTTPS_CERT="$(pwd)/certs/localhost.pem"
            echo "HTTPS_KEY=$HTTPS_KEY"
            echo "HTTPS_CERT=$HTTPS_CERT"
            
            echo ""
            echo "Run 'pnpm install' to set up dependencies"
            echo "Then 'pnpm dev' to start the development server with HTTPS"
          '';
        };
      }
    );
}
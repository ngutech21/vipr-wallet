# Vipr Wallet Docker Image

Vipr Wallet is a Progressive Web App for Fedimint ecash wallets. It provides a
browser-based wallet experience for private Lightning, on-chain Bitcoin, and
federation-based ecash payments.

This image serves the built Vipr Wallet PWA with Nginx.

## Tags

- `dev-latest`: latest successful development build from the `master` branch
- `<commit-sha>-alpine`: immutable image for a specific Git commit
- `latest`: latest promoted production release
- `vX.Y.Z`: production release tags

## Pull

```bash
docker pull ngutech21/vipr-wallet:latest
```

## Run

```bash
docker run --rm -p 8080:80 ngutech21/vipr-wallet:latest
```

Then open `http://localhost:8080`.

Use `dev-latest` only if you intentionally want the latest development build
from the `master` branch.

## Security

The development image is built by GitHub Actions after the main CI checks pass.
The Docker image is scanned with Trivy before deployment. The deploy build also
publishes Docker Buildx provenance and SBOM attestations.

## Project Links

- Website: https://vipr.cash
- App: https://app.vipr.cash
- Source: https://github.com/ngutech21/vipr-wallet


## Disclaimer

Vipr Wallet is experimental software. Do not use it with significant amounts of
ecash or in production environments without understanding the risks.

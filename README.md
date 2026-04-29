[![Actionlint](https://github.com/ngutech21/vipr-wallet/actions/workflows/actionlint.yml/badge.svg)](https://github.com/ngutech21/vipr-wallet/actions/workflows/actionlint.yml)
[![Spelling](https://github.com/ngutech21/vipr-wallet/actions/workflows/spelling.yml/badge.svg)](https://github.com/ngutech21/vipr-wallet/actions/workflows/spelling.yml)
[![CI](https://github.com/ngutech21/vipr-wallet/actions/workflows/ci.yaml/badge.svg)](https://github.com/ngutech21/vipr-wallet/actions/workflows/ci.yaml)
[![Tests](https://github.com/ngutech21/vipr-wallet/actions/workflows/e2e-test.yaml/badge.svg)](https://github.com/ngutech21/vipr-wallet/actions/workflows/e2e-test.yaml)
[![Lighthouse](https://github.com/ngutech21/vipr-wallet/actions/workflows/lighthouse.yaml/badge.svg)](https://github.com/ngutech21/vipr-wallet/actions/workflows/lighthouse.yaml)
[![Coverage](https://img.shields.io/codecov/c/github/ngutech21/vipr-wallet)](https://app.codecov.io/gh/ngutech21/vipr-wallet/)

---

# Vipr Wallet

Vipr Wallet is a modern Progressive Web App (PWA) that serves as an ecash wallet for Fedimint. It runs seamlessly on both mobile and desktop devices, enabling private and instant lightning transactions wherever you are.

## ⚠️ Disclaimer

This software is experimental and comes with risks:
**DO NOT USE** with significant amounts of ecash or in production environments

By using this wallet, you acknowledge and accept these risks.

## Use Vipr

The production release of the wallet is available at
[app.vipr.cash](https://app.vipr.cash).

For development and testing, [beta.vipr.cash](https://beta.vipr.cash) always
tracks the current `master` branch.

Learn more about the project at [vipr.cash](https://vipr.cash).

## 📱 App Screenshots

<div align="center">
  <img src="./public/screenshots/Home.webp" alt="Dashboard" width="30%" />
  <img src="./public/screenshots/Settings.webp" alt="Federation Details" width="30%" />
  <img src="./public/screenshots/Receive-Lightning.webp" alt="Receive Payment" width="30%" />
</div>

## ✨ Features

Vipr is a Fedimint ecash wallet for private, instant payments across Lightning,
on-chain Bitcoin, and federation-based ecash.

|     | Feature area        | What Vipr offers                                                                     |
| --- | ------------------- | ------------------------------------------------------------------------------------ |
| ⚡  | Lightning           | Send invoices, scan QR codes, pay Lightning addresses, and use LNURL-pay             |
| 📥  | Receive             | Create Lightning invoices with memo, QR code, copy/share actions, and payment status |
| 🪙  | Ecash               | Import and export ecash tokens                                                       |
| ₿   | On-chain Bitcoin    | Send and receive on-chain payments through supported federations                     |
| 🏛️  | Federations         | Join multiple federations, switch between them, and inspect federation details       |
| 🔎  | Discovery           | Discover public federations through Nostr recommendations                            |
| 👥  | Contacts            | Sync Nostr contacts from NIP-05 or npub and pay contacts by name                     |
| 🔐  | Recovery & security | Back up and restore the wallet, protect the app with PIN and Face ID / Touch ID      |
| 📱  | PWA                 | Installable web app with update handling and Docker-based self-hosting               |

### Federation Details

Vipr helps users understand the federations they join:

- Guardian and module overview
- Federation invite sharing
- Balance and invoice limits
- Gateway and fee information
- Federation UTXOs
- Fedimint Observer links
- Terms of Service and federation messages

### Supported Standards

Vipr supports common Bitcoin and Lightning payment standards:

| Standard          | Support                                      |
| ----------------- | -------------------------------------------- |
| BOLT11            | Send and receive Lightning invoices          |
| BIP21             | Read Bitcoin payment URIs for on-chain sends |
| Lightning Address | Pay human-readable Lightning addresses       |
| LNURL-pay         | Pay LNURL payment requests                   |

## 🐳 Deployment

### Docker Image

If you want to host the wallet yourself, you can use the Docker image on Docker Hub.

```bash
docker pull ngutech21/vipr-wallet:latest
```

### Quick Start

Run the latest container from dockerhub locally:

```bash
docker run -d \
  -p 8080:80 \
  --name vipr-wallet \
  ngutech21/vipr-wallet:latest
```

Run the container locally using docker-compose:

```bash
docker compose up -d
```

The wallet will be available at `http://localhost:8080`

## 🚀 Getting Started

### Development Environment

- This project uses [Vue 3](https://v3.vuejs.org/) with [TypeScript](https://www.typescriptlang.org/)
- [Quasar Framework](https://quasar.dev/) provides the UI components
- [Pinia](https://pinia.vuejs.org/) is used for state management
- [Fedimint-SDK](https://github.com/fedimint/fedimint-sdk) is used for interacting with the fedimint

### Prerequisites

Make sure you have the following installed:

- Node.js 24+
- pnpm 10+
- Nix with flakes enabled for running end-to-end tests locally

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/ngutech21/vipr-wallet.git
cd vipr-wallet
```

2. **Install pnpm**

```bash
npm install -g pnpm@latest-10
```

3. **Install the dependencies**

```bash
pnpm install
```

4. **Run the standard local quality checks**

```bash
pnpm final-check
```

5. **Start the app in development mode (hot-code reloading, error reporting, etc.)**

```bash
pnpm dev
```

6. **Run end-to-end tests locally**

```bash
nix develop --accept-flake-config --command pnpm test:e2e
```

### Getting Started Tips

- Use `pnpm final-check` before opening a pull request. It runs formatting checks, linting, type checks, unit tests, and a production dependency audit.
- Use `pnpm build` to verify the production PWA build locally.
- Use `pnpm build:docker` if you want to validate the container image build path used by the project.
- Lighthouse CI and the main CI workflows are configured in GitHub Actions, so local checks and CI should stay close to each other.

### 🛠️ Development

| Command                | Description                                                     |
| ---------------------- | --------------------------------------------------------------- |
| `pnpm dev`             | Start the development server with hot reload                    |
| `pnpm dev:e2e`         | Start the app on a fixed port for browser-based end-to-end work |
| `pnpm build`           | Build the production PWA                                        |
| `pnpm build:docker`    | Build the Docker image locally                                  |
| `pnpm lint`            | Run ESLint on source files                                      |
| `pnpm lint:fix`        | Run ESLint and automatically fix safe issues                    |
| `pnpm format`          | Format code with Prettier                                       |
| `pnpm format:check`    | Verify formatting without modifying files                       |
| `pnpm typecheck`       | Run Vue TypeScript checks                                       |
| `pnpm typecheck:pwa`   | Run TypeScript checks for the PWA service worker code           |
| `pnpm test`            | Run unit tests once                                             |
| `pnpm test:unit:ci`    | Run unit tests in CI mode                                       |
| `pnpm test:unit:ui`    | Open the Vitest UI                                              |
| `pnpm coverage`        | Generate the unit test coverage report                          |
| `pnpm test:e2e`        | Run end-to-end tests from a Nix dev shell                       |
| `pnpm test:e2e:headed` | Run Playwright tests with a visible browser                     |
| `pnpm final-check`     | Run the main local verification suite before pushing changes    |

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vipr-Wallet is a Progressive Web App (PWA) that serves as an ecash wallet for Fedimint. Built with Vue 3, TypeScript, and Quasar Framework, it enables private and instant lightning transactions.

## Development Commands

### Core Commands

- `pnpm dev` - Start development server with hot reload (opens in Firefox by default)
- `pnpm build` - Build for production (PWA mode)
- `pnpm build-docker` - Build Docker image

### Code Quality

- `pnpm lint` - Run ESLint on source files
- `pnpm format` - Format code with Prettier
- `pnpm typecheck` - Run Vue TypeScript compiler checks
- `pnpm final-check` - Run all checks: format, lint, typecheck, and tests

### Testing

- `pnpm test` - Run unit tests (alias for `pnpm test:unit`)
- `pnpm test:unit` - Run Vitest unit tests in watch mode
- `pnpm test:unit:ci` - Run tests once (CI mode)
- `pnpm test:unit:ui` - Run tests with Vitest UI

### Package Management

- `pnpm install` - Install dependencies
- `pnpm postinstall` - Prepare Quasar (runs automatically after install)

## Architecture Overview

### Framework Stack

- **Frontend**: Vue 3 with Composition API + TypeScript
- **UI Framework**: Quasar Framework (Material Design components)
- **State Management**: Pinia stores with localStorage persistence
- **Build Tool**: Vite with Quasar CLI
- **PWA**: Workbox for service worker generation
- **Testing**: Vitest with Vue Test Utils

### Key Dependencies

- `@fedimint/core-web` - Core Fedimint SDK for wallet operations
- `@getalby/bitcoin-connect` & `@getalby/lightning-tools` - Lightning connectivity
- `@nostr-dev-kit/ndk` - Nostr protocol integration
- `@vueuse/core` - Vue composition utilities
- `@unplugin-vue-router` - Routing

### Core Store Architecture

Located in `src/stores/`:

1. **WalletStore** (`wallet.ts`) - Core wallet operations using FedimintWallet
   - Manages wallet initialization, opening/closing
   - Handles balance, transactions, and payment operations
   - Lightning invoice operations (send/receive)

2. **FederationStore** (`federation.ts`) - Federation management
   - Stores federations list in localStorage
   - Manages selected federation state
   - Federation discovery via Nostr

3. **LightningStore** (`lightning.ts`) - Lightning-specific operations
4. **NostrStore** (`nostr.ts`) - Nostr protocol integration

### Application Structure

- `src/boot/fedimint.ts` - App initialization, wallet setup on boot
- `src/components/` - Reusable Vue components (modals, transaction items, etc.)
- `src/pages/` - Route-level page components
- `src/router/` - Vue Router configuration
- `src/utils/` - Utility functions (formatters, LNURL, error handling)
- `src/services/logger.ts` - Logging service using consola

### Build Configuration

- **Quasar Config** (`quasar.config.ts`) - Main build configuration
  - PWA mode with service worker
  - WASM and top-level await support for Fedimint integration
  - TypeScript strict mode enabled
  - Hash-based routing
- **Vite Plugins**: WASM, top-level await, Vue TypeScript checking
- **Target**: Modern browsers (ES2022, Firefox 115+, Chrome 115+, Safari 15+)

### Development Notes

- Uses pnpm for package management
- ESLint with Vue and TypeScript configurations (flat config)
- Prettier for code formatting
- Vitest for unit testing with happy-dom environment
- HTTPS development server support via environment variables
- Firefox as default development browser

### Key Implementation Patterns

- Pinia stores use localStorage for persistence via `@vueuse/core`
- Fedimint wallet operations are async and handle federation switching
- Components follow Quasar Material Design patterns
- Error handling via custom error utilities
- Transaction history and balance updates via reactive stores
- PWA features with offline capability and caching strategies

### MCP Tools for Development

#### Context7 Server for API Documentation

- ALWAYS use the Context7 MCP server when requiring API documentation for libraries
- Use `resolve-library-id` first to get the correct library ID, then `get-library-docs` to fetch documentation
- This provides up-to-date documentation and code examples for all project dependencies

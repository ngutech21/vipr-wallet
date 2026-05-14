# Product

## Register

product

## Users

Vipr is for people who want to use federated ecash for private, fast Bitcoin payments across mobile and desktop. Users may be Bitcoin-aware but should not need to understand Fedimint internals to complete common wallet tasks.

The primary context is transactional and trust-sensitive: joining a federation, checking balance, sending or receiving Lightning, on-chain Bitcoin, or ecash, backing up recovery words, and managing wallet security. Users are often acting on a small screen, with money at stake, and need confidence that each step is clear, reversible where possible, and honest about risk.

## Product Purpose

Vipr Wallet is a Progressive Web App for Fedimint ecash. It helps users hold, send, receive, and inspect private ecash payments through federations, Lightning, on-chain Bitcoin, contacts, and Nostr-based federation discovery.

Success means a user can safely set up or restore a wallet, join a federation they understand, complete payment flows without ambiguity, recover from mistakes, and stay aware that the software and custodial model carry real risk. The product should make private payments feel usable without making experimental custodial ecash feel safer than it is.

## Brand Personality

Vipr should feel like a calm private tool: quiet, precise, and trustworthy. The interface should reduce anxiety during payment and backup flows through clear hierarchy, concise copy, visible state, and restrained visual emphasis.

The voice is direct and plain-spoken. It should avoid hype, trading language, insider jargon, and decorative crypto attitude. Confidence comes from clarity and operational polish, not from loud branding.

## Anti-references

Vipr should not look like a generic crypto trading app, exchange dashboard, neon-on-black Web3 landing page, or speculative finance product. Avoid excessive glow effects, cyberpunk palettes, token-price visual language, decorative gradients, and visual drama that competes with payment comprehension.

It should also avoid looking like an enterprise banking portal: heavy forms, corporate blue trust-washing, dense legalese, and sterile compliance-first layout. Warnings should be explicit and readable without turning every screen into a risk disclaimer.

## Design Principles

1. Keep money flows calm and legible. Amounts, selected federation, fees, limits, destination, state, and final action should be immediately clear.
2. Make trust explicit. Federation choice, custodial risk, recovery requirements, and destructive actions should be surfaced at the moment they matter.
3. Optimize for repeated small-screen use. Primary actions should be reachable, touch targets generous, and navigation predictable across mobile and desktop PWA contexts.
4. Prefer progressive disclosure over dense explanation. Show the next necessary decision, then reveal deeper federation, gateway, transaction, or backup detail when the user asks for it.
5. Earn confidence through consistency. Shared `vipr-*` classes, tokens, copy patterns, and state treatments should make every flow feel like the same wallet.

## Accessibility & Inclusion

Target WCAG AA as the baseline for new and changed UI. Payment, backup, onboarding, and destructive flows should be keyboard reachable, screen-reader understandable, and robust under high contrast needs.

Reduced motion preferences should be respected, especially in route transitions, QR or scanner surfaces, success states, and any loading feedback. Color should never be the only indicator of status or risk; use labels, icons, and text where meaning matters. Avoid crypto-neon aesthetics and low-contrast glow treatments that reduce readability or create visual fatigue.

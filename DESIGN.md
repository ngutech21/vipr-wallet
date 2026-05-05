---
name: Vipr Wallet
description: Calm private wallet interface for Fedimint ecash payments.
colors:
  vault-violet: '#8000ff'
  vault-violet-bright: '#a22bff'
  vault-violet-deep: '#7400fff5'
  ledger-charcoal: '#141414'
  ledger-black: '#121212'
  surface-base: '#0f1016eb'
  panel-charcoal: '#1f1f1f'
  header-charcoal: '#202020'
  text-primary: '#ffffff'
  text-secondary: '#ffffffc7'
  text-muted: '#ffffff9e'
  text-soft: '#ffffff8f'
  text-subtle: '#ffffff85'
  text-faint: '#ffffff7a'
  border-subtle: '#ffffff14'
  border-faint: '#ffffff0f'
  surface-soft: '#ffffff0a'
  surface-hover: '#ffffff0d'
  surface-selected: '#8000ff14'
  primary-accent: '#a970ff'
  bitcoin: '#f7b955'
  lightning: '#f7d75c'
  scan-black: '#050505'
  qr-white: '#ffffff'
  signal-green: '#17d97a'
  signal-info: '#4db8ff'
  signal-amber: '#ffb648'
  signal-red: '#ff5d7d'
typography:
  display:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '2.2rem'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0'
  headline:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '1.9rem'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0'
  title:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '1.35rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '0'
  body:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: '0'
  label:
    fontFamily: "Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: '0.78rem'
    fontWeight: 600
    lineHeight: 1
    letterSpacing: '0'
  mono:
    fontFamily: "'Courier New', monospace"
    fontSize: '1.1rem'
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: '0.04em'
rounded:
  xs: '8px'
  sm: '12px'
  control: '14px'
  md: '16px'
  button-lg: '18px'
  lg: '24px'
  xl: '32px'
  pill: '999px'
  round: '50%'
spacing:
  '0': '0'
  '1': '4px'
  '2': '8px'
  '3': '12px'
  '4': '16px'
  '4-5': '18px'
  '5': '20px'
  '6': '24px'
  '7': '28px'
  '8': '32px'
  '10': '40px'
components:
  button-primary:
    backgroundColor: '{colors.vault-violet}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.button-lg}'
    padding: '0 20px'
    height: '54px'
  button-secondary:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.body}'
    rounded: '{rounded.control}'
    padding: '0 20px'
    height: '48px'
  card:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.text-primary}'
    rounded: '{rounded.lg}'
    padding: '16px'
  input:
    backgroundColor: '{colors.surface-soft}'
    textColor: '{colors.text-primary}'
    typography: '{typography.body}'
    rounded: '{rounded.md}'
    padding: '0 16px'
    height: '48px'
  chip:
    backgroundColor: '{colors.border-subtle}'
    textColor: '{colors.text-secondary}'
    typography: '{typography.label}'
    rounded: '{rounded.pill}'
    padding: '0 10px'
    height: '24px'
---

# Design System: Vipr Wallet

## 1. Overview

**Creative North Star: "The Quiet Vault"**

Vipr's interface is a compact private wallet surface: dark, restrained, touch-first, and deliberately calm around moments where users move money or make trust decisions. It should feel like a secure working tool rather than a crypto spectacle. The visual system earns confidence through clear hierarchy, generous touch targets, predictable flow panels, and reusable `vipr-*` classes.

The physical scene is a user checking or sending funds on a phone in mixed ambient light, often with limited patience and real risk attached. Dark mode is justified by repeated mobile use, QR scanning, payment review, and a need to keep the interface quiet while amounts, federation names, invoices, recovery words, and warnings remain readable.

The system explicitly rejects the PRODUCT.md anti-references: a generic crypto trading app, exchange dashboard, neon-on-black Web3 landing page, speculative finance product, enterprise banking portal, corporate blue trust-washing, dense legalese, and sterile compliance-first layout.

**Key Characteristics:**

- Compact mobile shells with a 700px app width ceiling and 16px edge insets.
- Wider detail and backup panels use the documented wide widths (`760px`, `720px`) without changing the mobile-first rhythm.
- Restrained dark neutrals with a rare violet accent for primary action and selection.
- Tonal layering, borders, and inset highlights before heavy drop shadows.
- Direct, plain-spoken copy that surfaces trust and custody risk at the relevant step.
- Shared `vipr-*` classes and CSS tokens as the source of truth for new UI.

## 2. Colors

The palette is a quiet charcoal vault with one operational violet accent and functional status colors. The frontmatter mirrors source tokens in hex or alpha hex for parser compatibility; source CSS custom properties in `src/css/app.scss` remain the implementation source of truth.

### Primary

- **Vault Violet** (`--q-primary`, `#8000ff`): primary actions, selected federation states, focus borders, scan frames, and the rare visual signal that something is actionable.
- **Lifted Vault Violet** (`--vipr-gradient-primary`, `#a22bff` to `#7400fff5`): the primary button gradient. Use only for committed actions, FABs, slider handles, and action surfaces that must stand apart.
- **Primary Accent Violet** (`--vipr-color-primary-accent`, `oklch(0.64 0.27 302)`): tab active states, focus emphasis, wizard rings, scanner frames, and compact accent details when the full primary gradient would be too loud.

### Secondary

- **Signal Info Blue** (`--vipr-notify-status-info`, `#4db8ff`): informational notices and on-chain result accents. It is a utility signal, not a brand color.
- **Signal Green** (`--vipr-notify-status-positive`, `#17d97a`): positive status, received state, completed confirmation, and success timing.
- **Bitcoin Gold** (`--vipr-color-bitcoin`, `oklch(0.78 0.16 72)`): Bitcoin rail identity and on-chain affordances only.
- **Lightning Gold** (`--vipr-color-lightning`, `oklch(0.82 0.16 82)`): Lightning rail identity only. Keep it functional and distinct from warning amber.

### Tertiary

- **Signal Amber** (`--vipr-notify-status-warning`, `#ffb648`): custody warnings, backup reminders, and risk notes.
- **Signal Red** (`--vipr-notify-status-negative`, `#ff5d7d`): destructive actions, error states, invalid inputs, and danger settings.

### Neutral

- **Ledger Charcoal** (`--vipr-color-page`, `#141414`): the app page background. It should stay unornamented and stable.
- **Deep Ledger** (`--dark`, `#121212`): deep surface base for settings, notifications, and result backgrounds.
- **Panel Charcoal** (`--vipr-modal-bg`, `#1f1f1f`): modal and bottom sheet foundation.
- **Surface Base** (`--vipr-color-surface-base`, `rgba(15, 16, 22, 0.92)`): raised panel base for strong cards and page panels.
- **Scanner Black** (`--vipr-scan-page-bg`, `#050505`): camera and scanner surfaces where the active frame and live camera feed need maximum contrast.
- **QR White** (`--vipr-qr-surface-bg`, `#ffffff`): QR code backing surfaces only. Do not reuse it as app chrome or content surface.
- **Quiet Text Stack** (`--vipr-text-*`): primary, secondary, muted, soft, subtle, and faint text roles. Never choose opacity by eye in a component.
- **Vault Border** (`--vipr-color-surface-border`, `rgba(255, 255, 255, 0.08)`): default stroke for cards, panels, rows, and top controls.

### Named Rules

**The One Violet Rule.** Vault Violet is the only brand accent. Do not add extra brand hues for visual variety.

**The Signal Is Functional Rule.** Green, amber, red, and blue are status colors only. They must explain state, risk, or completion.

**The Rail Color Rule.** Bitcoin Gold and Lightning Gold identify payment rails. They are not general accent colors.

**The No Crypto Glow Rule.** Glows and radial accents must stay subtle and contextual. If the surface reads as neon-on-black Web3, it is wrong.

## 3. Typography

**Display Font:** Quasar app sans stack (`Roboto`, system UI, `Segoe UI`, sans-serif)
**Body Font:** Quasar app sans stack (`Roboto`, system UI, `Segoe UI`, sans-serif)
**Label/Mono Font:** `Courier New`, monospace for recovery words, ids, invoices, and technical values

**Character:** The type system is utilitarian and quiet. Weight and size carry hierarchy; letter spacing is usually zero, with only small uppercase eyebrow labels using `0.04em`.

### Hierarchy

- **Display** (700, `2.2rem`, `1.1`): onboarding and payment review titles where a screen needs one dominant statement.
- **Headline** (700, `1.9rem`, `1.1`): page-level titles and success titles.
- **Title** (600, `1.35rem`, `1.2`): federation summaries, modal titles, and card headings.
- **Section Title** (600, `1.05rem`, `1.25`): settings sections, flow labels, and compact page groups.
- **Amount** (700, `2.75rem` or clamped amount tokens, `1.1`): balances, payment amounts, and review totals.
- **Body** (400, `1rem`, `1.45`): explanatory text, hints, and standard copy. Keep paragraphs short and below 65 to 75 characters where possible.
- **Caption** (400, `0.9rem`, `1.45`): helper copy, QR notes, transaction subtitles, and secondary descriptions.
- **Label** (600 to 700, `0.78rem`, `1`, uppercase only for status labels): metadata labels, pills, and small operational descriptors.
- **Mono** (700, `1.1rem`, `0.04em`): recovery words and technical strings where scanning exact characters matters.

### Named Rules

**The Amount First Rule.** In money movement screens, the amount and final action outrank decorative titles.

**The Zero Tracking Rule.** Default letter spacing is `0`. Do not widen labels unless using the established eyebrow or recovery-word pattern.

## 4. Elevation

Vipr uses a hybrid of tonal layering, hairline borders, inset highlights, and a few purposeful shadows. Most cards are flat at rest; depth comes from transparent surfaces over Ledger Charcoal. Strong elevation is reserved for modals, page panels, notifications, and committed primary actions.

### Shadow Vocabulary

- **Primary Action Shadow** (`--vipr-shadow-primary: 0 12px 28px rgba(128, 0, 255, 0.24)`): high-commitment primary buttons only.
- **Primary Soft Shadow** (`--vipr-shadow-primary-soft`): default for primary-soft buttons, FABs, and slider handles.
- **Surface Inset Highlight** (`--vipr-surface-card-shadow`): strong cards and flow panels.
- **Subtle Surface Inset** (`--vipr-surface-card-shadow-subtle`): list cards and secondary surfaces.
- **Modal Shadow** (`--vipr-modal-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45)`): bottom sheets only.
- **Page Panel Shadow** (`--vipr-page-panel-shadow: 0 26px 70px rgba(0, 0, 0, 0.44)`): wizard and backup panels.
- **Notification Shadow** (`--vipr-notify-shadow: 0 18px 40px rgba(0, 0, 0, 0.38)`): transient notifications only.
- **Scanner Frame Shadow** (`--vipr-scan-frame-shadow`): scanner surfaces only, where the frame must separate from camera content.

### Named Rules

**The Tonal First Rule.** Add depth with surface tint, border, and inset highlights before drop shadows.

**The Heavy Shadow Budget Rule.** Heavy shadows belong to overlays and page panels, not ordinary list items.

## 5. Components

### Buttons

Buttons are tactile but restrained. They use shared `vipr-btn` classes rather than ad hoc Quasar utility styling.

- **Shape:** gently rounded controls (`--vipr-radius-control`, `14px`) and large actions (`--vipr-radius-button-lg`, `18px`).
- **Primary:** Vault Violet gradient, white text, 600 weight, `54px` large height, `48px` medium height.
- **Hover / Focus:** subtle border, background, and shadow transitions. Avoid layout-shifting animation.
- **Secondary:** soft transparent surface, border, and secondary text. It should feel available, not loud.

### Chips

Chips are compact status or context badges.

- **Style:** `24px` height, pill radius, translucent surface, secondary text, `0.78rem` type.
- **State:** selected or primary chips can use Vault Violet, but only when they mark active context or real status.

### Cards / Containers

Cards are functional groupings, not decoration.

- **Corner Style:** `--vipr-radius-card` (`24px`) for cards and `--vipr-radius-xl` (`32px`) for page panels.
- **Background:** translucent white layers and optional subtle gradient over Ledger Charcoal.
- **Shadow Strategy:** inset highlights by default, larger shadows only for panels and overlays.
- **Border:** `--vipr-color-surface-border` for normal surfaces, subtler borders for secondary cards.
- **Internal Padding:** usually `16px` to `24px`, with flow panels using the shared padded classes.
- **Widths:** default mobile pages cap at `--vipr-width-mobile` (`700px`), wide pages at `--vipr-width-mobile-wide` (`760px`), flow panels at `--vipr-width-flow-panel` (`560px`), and backup panels at `720px`.

### Inputs / Fields

Inputs are dark control panels with visible focus.

- **Style:** translucent background, `16px` radius, faint border, inset highlight.
- **Focus:** violet border and subtle inset focus ring.
- **Error / Disabled:** error border uses Signal Red; disabled states reduce opacity rather than changing layout.

### Navigation

Navigation is bottom-first for the app shell. The footer uses a narrow centered tab bar, transparent tab backgrounds, muted inactive labels, and Vault Violet active state. It should be predictable and quiet, with no decorative tab pills unless active state clarity requires it.

### Selection Sheets

Bottom-sheet option cards use a large touch area, icon, title, description, and chevron. They are appropriate for choosing send or receive rails because the user is choosing a payment mode, not dismissing an alert.

### QR and Scanner Surfaces

QR surfaces intentionally break the dark surface rule with `--vipr-qr-surface-bg` so QR contrast stays reliable. Scanner surfaces use `--vipr-scan-page-bg`, frame tokens, and glass-panel tokens only around the camera task; never reuse scanner styling as ordinary page decoration.

### Wizard and Backup Panels

Wizard and backup screens use larger page panels, compact mobile padding, and specific visual tokens because they carry first-run setup and recovery risk. They should feel calmer than marketing onboarding and more explicit than routine wallet navigation.

### Signature Component: Amount Entry

Amount entry pairs a large amount display with a numeric keypad. The amount display uses strong typographic hierarchy and the keypad uses consistent `44px+` touch targets. Do not shrink amount entry for visual density; payment accuracy matters more than compactness.

## 6. Do's and Don'ts

### Do:

- **Do** use shared `vipr-*` classes and CSS tokens before creating local styles.
- **Do** keep primary actions visibly tied to Vault Violet and keep secondary actions visually quieter.
- **Do** surface selected federation, amount, destination, fees, and final action before payment commitment.
- **Do** use Signal Amber for custody, backup, or federation-risk warnings.
- **Do** use Bitcoin Gold and Lightning Gold only for payment-rail identity.
- **Do** respect WCAG AA, reduced motion preferences, keyboard access, and non-color status cues.
- **Do** keep mobile edge insets aligned to `--vipr-space-4` unless scanner, modal, or QR surfaces intentionally differ.
- **Do** keep QR surfaces high-contrast even when they require a white backing surface inside the dark app.

### Don't:

- **Don't** make Vipr look like a generic crypto trading app, exchange dashboard, neon-on-black Web3 landing page, or speculative finance product.
- **Don't** use excessive glow effects, cyberpunk palettes, token-price visual language, decorative gradients, or visual drama that competes with payment comprehension.
- **Don't** make Vipr look like an enterprise banking portal with corporate blue trust-washing, dense legalese, or sterile compliance-first layout.
- **Don't** hardcode colors, radii, spacing, shadows, or typography in components when a `vipr-*` token already exists.
- **Don't** use color alone to communicate status, risk, success, or failure.
- **Don't** reuse scanner, QR, wizard, or backup special-purpose tokens as generic decoration on normal wallet screens.
- **Don't** use side-stripe borders, gradient text, decorative glassmorphism, repeated identical card grids, or modal-first solutions unless the interaction truly requires a modal.

# Vipr Design System

Vipr uses a compact dark interface built from shared CSS tokens and a small set of reusable `vipr-*` classes. The goal is consistency across mobile and desktop viewports without relying on ad hoc Quasar spacing or typography utilities in app templates.

## Tokens

Global design tokens live in `src/css/app.scss` under `:root`.

- Spacing: use `--vipr-space-*` tokens for margins, padding, gaps, and layout offsets.
- Radius: use `--vipr-radius-*` tokens for all corners. Use `--vipr-radius-round` for circular controls and avatars, and `--vipr-radius-pill` for pills.
- Text: use `--vipr-text-*` tokens for foreground colors.
- Surfaces: use `--vipr-surface-*`, `--vipr-color-surface-*`, `--vipr-list-*`, and `--vipr-row-*` tokens for cards, rows, borders, hover states, and subtle backgrounds.
- Shadows: use `--vipr-shadow-*`, `--vipr-*-shadow`, or component-specific shadow tokens instead of inline `box-shadow` values.

Hardcoded color literals and raw pixel radii should be kept inside token definitions only. Component and page styles should reference tokens.

## Template Rules

Do not use Quasar utility classes for app layout or typography in templates:

- Avoid `q-pa-*`, `q-px-*`, `q-mt-*`, `q-mb-*`, `q-gutter-*`, `q-col-*`, `row`, `column`, `flex`, `items-*`, `justify-*`.
- Avoid typography utilities such as `text-h*`, `text-body*`, `text-caption`, `text-center`, and `text-weight-*`.
- Avoid generic width helpers such as `full-width`.

Use explicit component classes instead. This keeps spacing, responsive behavior, and typography local and token-driven.

## Shared Classes

Use these shared classes before introducing a new local pattern:

- `vipr-mobile-page`: mobile-width app page shell.
- `vipr-mobile-page--wide`: wider mobile/detail page shell.
- `vipr-topbar`, `vipr-topbar__back`: standard top navigation.
- `vipr-flow-panel`: centered form or amount-entry panel.
- `vipr-flow-panel--padded`: default padded flow panel.
- `vipr-flow-center`: centered single-panel layout.
- `vipr-flow-spacer-sm|md|lg`: common vertical spacing inside flow screens.
- `vipr-flow-action`: full-width primary action in flow panels.
- `vipr-btn`, `vipr-btn--primary`, `vipr-btn--primary-soft`, `vipr-btn--secondary`, `vipr-btn--lg`, `vipr-btn--md`, `vipr-btn--compact`: button system.
- `vipr-surface-card`, `vipr-surface-card--strong`, `vipr-surface-card--subtle`, `vipr-surface-card--summary`, `vipr-surface-card--list`: card surfaces.
- `vipr-detail-row`, `vipr-detail-label`, `vipr-detail-value`: detail list rows.
- `vipr-input`: standard dark input styling.
- `vipr-selection-sheet`: bottom-sheet option layout.

## Layout Patterns

Home, list, and settings screens should keep a 16px mobile edge inset via `--vipr-space-4`. Cards should align to the same inset unless a modal, bottom nav, or full-bleed scanner surface intentionally differs.

Flow screens should use:

```html
<div class="vipr-flow-center">
  <div class="vipr-flow-panel vipr-flow-panel--padded task-card vipr-surface-card--strong">...</div>
</div>
```

Success screens should use the shared `success-*` classes in `app.scss` for title, amount, subtitle, card, actions, and close button spacing.

Transaction detail screens should use `transaction-content` and its nested classes only. Status badges should stay right-aligned in the summary row, and labels should not be truncated unless a dedicated design explicitly calls for it.

## Verification

After design-system changes:

1. Run `pnpm format`.
2. Run `pnpm final-check`.
3. For UI-affecting changes, use Playwright against the local app and inspect at least:
   - Home
   - Federations
   - Settings
   - Send Lightning
   - Receive Lightning
   - Send On-chain
   - Receive On-chain
   - Send ecash
   - Receive ecash
   - Transaction details

Screens may be opened directly by hash route with query parameters when the workflow state is not important.

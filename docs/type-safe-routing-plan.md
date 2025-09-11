# Type-Safe Routing Implementation Plan

## Overview
This document outlines the plan to enhance type safety in the unplugin-vue-router setup for the Vipr Wallet application.

## Current Issues
1. **String-based navigation** - Using hardcoded string paths like `router.push('/')` and `:to="'/'"`
2. **Missing typed imports** - Not importing from `'vue-router/auto'` for typed router/route
3. **Untyped route params** - Direct access to `route.params.id` without type checking
4. **No route meta types** - Missing proper TypeScript definitions for route meta

## Implementation Steps

### 1. Update TypeScript Configuration
**File:** `tsconfig.json`
- Add `"moduleResolution": "Bundler"` to compilerOptions
- Ensure `typed-router.d.ts` is included in the files list

### 2. Enhance Route Meta Types
**File:** `src/types/vue-router.d.ts`
```typescript
declare module 'vue-router' {
  interface RouteMeta {
    hideBottomNav?: boolean
    title?: string
  }
}
```

### 3. Update Router Imports
**Files to update:**
- `src/pages/scan.vue`
- `src/pages/send.vue`
- `src/pages/federation/[id].vue`
- `src/pages/receive-ecash.vue`
- `src/pages/sent-lightning.vue`
- `src/pages/receive.vue`
- `src/pages/received-lightning.vue`
- `src/layouts/MainLayout.vue`

**Changes:**
```typescript
// Before
import { useRouter, useRoute } from 'vue-router'

// After
import { useRouter, useRoute } from 'vue-router/auto'
```

### 4. Replace String Paths with Typed Route Names

#### Navigation Components
**Files:** All pages with navigation
```typescript
// Before
router.push('/')
router.push('/scan')
router.push({ path: '/', query: { ... } })

// After
router.push({ name: '/' })
router.push({ name: '/scan' })
router.push({ name: '/', query: { ... } })
```

#### Template Navigation
**Files:** All components with `:to` prop
```vue
<!-- Before -->
<q-btn :to="'/'" />
<q-route-tab :to="'/federations'" />

<!-- After -->
<q-btn :to="{ name: '/' }" />
<q-route-tab :to="{ name: '/federations/' }" />
```

### 5. Type-Safe Route Parameters

#### Dynamic Routes
**File:** `src/pages/federation/[id].vue`
```typescript
// Before
const federationId = route.params.id as string

// After
const route = useRoute('/federation/[id]')
const federationId = route.params.id // Now typed!
```

**File:** `src/pages/transaction/[id].vue`
```typescript
// Before
const transactionId = route.params.id

// After
const route = useRoute('/transaction/[id]')
const transactionId = route.params.id // Now typed!
```

### 6. Add Route Meta via Route Blocks

#### Pages that should hide footer
**Files to add route blocks:**
- `src/pages/scan.vue`
- `src/pages/send.vue`
- `src/pages/receive.vue`
- `src/pages/receive-ecash.vue`
- `src/pages/sent-lightning.vue`
- `src/pages/received-lightning.vue`

```vue
<route lang="json">
{
  "meta": {
    "hideBottomNav": true
  }
}
</route>
```

### 7. Update MainLayout Footer Logic
**File:** `src/layouts/MainLayout.vue`
```typescript
// Current implementation already uses route.meta
const showFooter = computed(() => route.meta?.hideBottomNav !== true)

// Update currentTab to use route names
const currentTab = computed(() => {
  switch(route.name) {
    case '/': return 'home'
    case '/federations/': return 'federations'
    case '/settings/': return 'settings'
    default: return null
  }
})
```

### 8. Create Type Helpers
**New file:** `src/utils/routing.ts`
```typescript
import type { RouteNamedMap } from 'vue-router/auto-routes'

export type RouteName = keyof RouteNamedMap
export type RouteParams<T extends RouteName> = RouteNamedMap[T]['params']

// Helper function for type-safe navigation
export function navigateTo<T extends RouteName>(
  name: T,
  params?: RouteParams<T>
) {
  return { name, params }
}
```

### 9. Add Client Type Declaration
**File:** `src/env.d.ts`
```typescript
/// <reference types="vite/client" />
/// <reference types="unplugin-vue-router/client" />
```

## Testing Plan

1. **Type Checking**
   - Run `pnpm typecheck` to ensure no TypeScript errors
   - Verify auto-completion works for route names in IDE

2. **Navigation Testing**
   - Test all navigation links work correctly
   - Verify route parameters are properly typed
   - Check footer visibility on different pages

3. **Build Testing**
   - Run `pnpm build` to ensure production build works
   - Test the built PWA for navigation functionality

## Benefits

1. **Compile-time Safety**: Catch navigation errors during development
2. **Better IDE Support**: Auto-completion for route names and parameters
3. **Refactoring Safety**: Renaming routes automatically updates all references
4. **Documentation**: Types serve as documentation for available routes
5. **Reduced Bugs**: Eliminate typos in route paths and missing parameters
6. **ESLint Enforcement**: Custom rule prevents string-based navigation at lint time

## Migration Order

1. Update TypeScript configuration
2. Add route meta types
3. Update imports in all files
4. Replace string paths with route names (one file at a time)
5. Add route blocks for meta information
6. Test each component after changes
7. Run full type check and build

## Notes

- Keep `typed-router.d.ts` committed to version control
- Run `pnpm dev` to regenerate types when adding/removing pages
- Use ESLint to enforce consistent import patterns
- Consider adding a pre-commit hook for type checking
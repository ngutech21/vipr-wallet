# ESLint Rule: Enforce Typed Navigation

## Overview
This custom ESLint rule enforces type-safe navigation by preventing the use of string-based paths in Vue Router navigation. It ensures all navigation uses the typed object syntax with route names.

## Rule: `local-rules/enforce-typed-navigation`

### Purpose
- **Prevents runtime navigation errors** by catching typos in route paths at compile time
- **Enforces consistent navigation patterns** across the entire codebase
- **Leverages TypeScript benefits** of unplugin-vue-router's generated types
- **Improves refactoring safety** when route names change

### Detected Patterns

#### ❌ Incorrect (String-based navigation)
```vue
<!-- Template navigation -->
<q-btn :to="'/path'" />
<router-link :to="'/users/123'" />

<!-- Programmatic navigation -->
<script>
router.push('/path')
router.replace('/users/123')
router.push(`/users/${id}`)  // Template literals
</script>
```

#### ✅ Correct (Object-based navigation)
```vue
<!-- Template navigation -->
<q-btn :to="{ name: '/path' }" />
<router-link :to="{ name: '/users/[id]', params: { id: '123' } }" />

<!-- Programmatic navigation -->
<script>
router.push({ name: '/path' })
router.replace({ name: '/users/[id]', params: { id: '123' } })
router.push({ name: '/path', query: { tab: 'settings' } })
</script>
```

### Error Messages

1. **String :to attribute**: "Use object syntax with name property instead of string path: :to=\"{ name: '/path' }\""
2. **String router call**: "Use object syntax with name property instead of string path: router.push({ name: '/path' })"
3. **Template literal navigation**: "Template literals in router calls are not type-safe. Use object syntax: router.push({ name: '...' })"

### Benefits

- **Type Safety**: Route names are validated against generated types
- **IDE Support**: Auto-completion for route names and parameters  
- **Refactoring Safety**: Route name changes automatically update references
- **Runtime Error Prevention**: Invalid routes caught at build time
- **Consistent Code Style**: Uniform navigation patterns across the app

### Configuration

The rule is configured in `eslint.config.js`:

```javascript
{
  plugins: {
    'local-rules': {
      rules: {
        'enforce-typed-navigation': enforceTypedNavigationRule,
      },
    },
  },
  rules: {
    'local-rules/enforce-typed-navigation': 'error',
  },
}
```

### Rule Severity

- **Current**: `error` - Fails builds and prevents commits
- **Alternative**: `warn` - Shows warnings but allows builds

### Integration

- ✅ **Development**: Shows errors in IDE during development
- ✅ **CI/CD**: Fails builds with unsafe navigation
- ✅ **Pre-commit**: Prevents commits with navigation errors
- ✅ **Hot Reload**: Shows errors immediately during development

### Related Files

- **Rule Implementation**: `eslint-rules/enforce-typed-navigation.js`
- **ESLint Config**: `eslint.config.js`
- **Type Definitions**: `typed-router.d.ts` (auto-generated)
- **Route Utilities**: `src/utils/routing.ts`

### Migration Guide

When this rule detects string-based navigation:

1. **Template Navigation**: 
   - Change `:to="'/path'"` → `:to="{ name: '/path' }"`

2. **Programmatic Navigation**:
   - Change `router.push('/path')` → `router.push({ name: '/path' })`
   - Change `router.push('/users/' + id)` → `router.push({ name: '/users/[id]', params: { id } })`

3. **Query Parameters**:
   - Change `router.push('/path?tab=settings')` → `router.push({ name: '/path', query: { tab: 'settings' } })`

4. **Dynamic Routes**:
   - Use `params` object for dynamic segments
   - Reference route names from `typed-router.d.ts`

This rule ensures your entire navigation system benefits from TypeScript's type safety and unplugin-vue-router's generated types.
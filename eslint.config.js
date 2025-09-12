import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import pluginQuasar from '@quasar/app-vite/eslint'
import vueTsEslintConfig from '@vue/eslint-config-typescript'
import prettierSkipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    /**
     * Ignore the following files.
     * Please note that pluginQuasar.configs.recommended() already ignores
     * the "node_modules" folder for you (and all other Quasar project
     * relevant folders and files).
     *
     * ESLint requires "ignores" key to be the only one in this object
     */
    // ignores: []
  },

  ...pluginQuasar.configs.recommended(),
  js.configs.recommended,

  /**
   * https://eslint.vuejs.org
   *
   * pluginVue.configs.base
   *   -> Settings and rules to enable correct ESLint parsing.
   * pluginVue.configs[ 'flat/essential']
   *   -> base, plus rules to prevent errors or unintended behavior.
   * pluginVue.configs["flat/strongly-recommended"]
   *   -> Above, plus rules to considerably improve code readability and/or dev experience.
   * pluginVue.configs["flat/recommended"]
   *   -> Above, plus rules to enforce subjective community defaults to ensure consistency.
   */
  ...pluginVue.configs['flat/essential'],

  {
    files: ['**/*.ts', '**/*.vue'],
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
    },
  },
  // https://github.com/vuejs/eslint-config-typescript
  ...vueTsEslintConfig({
    // Optional: extend additional configurations from typescript-eslint'.
    // Supports all the configurations in
    // https://typescript-eslint.io/users/configs#recommended-configurations
    extends: [
      // By default, only the 'recommendedTypeChecked' rules are enabled.
      'recommendedTypeChecked',
      // You can also manually enable the stylistic rules.
      // "stylistic",

      // Other utility configurations, such as 'eslintRecommended', (note that it's in camelCase)
      // are also extendable here. But we don't recommend using them directly.
    ],
  }),

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',

      globals: {
        ...globals.browser,
        ...globals.node, // SSR, Electron, config files
        process: 'readonly', // process.env.*
        ga: 'readonly', // Google Analytics
        cordova: 'readonly',
        Capacitor: 'readonly',
        chrome: 'readonly', // BEX related
        browser: 'readonly', // BEX related
      },
    },

    // add your custom rules here
    rules: {
      // allow debugger during development only
      'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',

      // Prevent console usage - critical for security in a wallet app
      'no-console': 'error',

      // Dead code detection rules
      'no-unreachable': 'warn',
      'no-unused-expressions': 'warn',
      'no-useless-return': 'warn',

      // Critical security rules - prevent code injection
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // XSS and DOM manipulation protection
      'no-inner-html': 'off', // Vue handles this safely
      'vue/no-v-html': 'error', // Prevent v-html usage without sanitization
      'vue/no-v-text-v-html-on-component': 'error',

      // Security best practices
      'no-var': 'error',
      'prefer-const': 'error',
      'no-with': 'error',
      'no-void': 'error',
      'no-proto': 'error',
      'no-iterator': 'error',
      'no-labels': 'error',

      // Prevent potentially dangerous operations
      'no-new-wrappers': 'error',
      'no-extend-native': 'error',
      'no-native-reassign': 'error',

      // Async/Promise best practices for wallet operations
      'no-async-promise-executor': 'error',
      'no-await-in-loop': 'warn',
      'no-promise-executor-return': 'error',
      'require-atomic-updates': 'error',
      'prefer-promise-reject-errors': 'error', // Changed from 'off' to 'error' for proper error handling

      // Critical Type Safety Rules - prevent runtime errors
      '@typescript-eslint/no-floating-promises': 'error', // Ensure promises are handled
      '@typescript-eslint/await-thenable': 'error', // Only await actual promises
      '@typescript-eslint/no-misused-promises': 'error', // Prevent promise misuse
      '@typescript-eslint/no-explicit-any': 'warn', // Discourage 'any' type
      '@typescript-eslint/no-non-null-assertion': 'warn', // Discourage non-null assertions (!)
      '@typescript-eslint/strict-boolean-expressions': [
        'warn',
        {
          allowString: false,
          allowNumber: true,
          allowNullableObject: false,
          allowNullableBoolean: true,
        },
      ],
    },
  },

  {
    files: ['src-pwa/custom-service-worker.ts'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
  },

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
    },
  },

  prettierSkipFormatting,
]

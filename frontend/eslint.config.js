import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // AuthProvider dan hook useAuth memang satu file (pola umum React context).
      'react-refresh/only-export-components': ['error', { allowExportNames: ['useAuth'] }],
    },
  },
  {
    // File konfigurasi build berjalan di Node (butuh global `process`), bukan di browser
    files: ['*.config.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
])

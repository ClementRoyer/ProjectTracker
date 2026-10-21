import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import tseslint from 'typescript-eslint';
import svelteConfig from './packages/web/svelte.config.js';

// Rules of docs/code-style.md that a tool can check (ADR 0019).

const noDefaultExport = {
  selector: 'ExportDefaultDeclaration',
  message: 'Use named exports only (docs/code-style.md).',
};

const insideCore = (folder, allowed) => {
  const forbidden = ['domain', 'usecases', 'store', 'jira'].filter(
    (name) => name !== folder && !allowed.includes(name),
  );
  return {
    files: [`packages/core/src/${folder}/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: forbidden.map((name) => ({
            group: [`../${name}`, `../${name}/*`],
            message: `core/${folder} must not import core/${name} (ADR 0014).`,
          })),
        },
      ],
    },
  };
};

export default tseslint.config(
  {
    ignores: [
      'legacy/**',
      '.claude/**',
      'node_modules/**',
      '**/dist/**',
      'packages/*/test/**/*.mjs',
      'e2e/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...svelte.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.svelte'],
      },
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: tseslint.parser, svelteConfig } },
  },
  {
    files: ['**/*.ts', '**/*.svelte'],
    rules: {
      'no-restricted-syntax': ['error', noDefaultExport],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'no-nested-ternary': 'error',
      eqeqeq: 'error',
      curly: ['error', 'multi-line'],
      'prefer-const': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      complexity: ['error', 10],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
      'max-lines': ['error', { max: 400, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['**/*.svelte'],
    // TypeScript (svelte-check) already knows every name; `let { … } = $props()` is Svelte's idiom.
    rules: { 'no-undef': 'off', 'prefer-const': 'off', 'svelte/prefer-const': 'error' },
  },
  {
    files: [
      'packages/*/test/**/*.ts',
      'packages/web/e2e/**/*.ts',
      '*.config.ts',
      'packages/*/*.config.ts',
    ],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'no-restricted-syntax': 'off',
    },
  },
  {
    files: ['**/*.js', '*.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: { 'no-console': 'error' },
  },
  {
    files: ['packages/*/src/**/*.ts'],
    ignores: ['packages/core/**', 'packages/server/**', 'packages/install/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@project-tracker/core', '@project-tracker/core/*'],
              message:
                'Only the server opens core; talk to it through contract and HTTP (ADR 0014).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/install/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@project-tracker/core(?!/(domain|store)$)',
              message: 'install opens only core/domain and core/store, to migrate V1 (ADR 0024).',
            },
          ],
        },
      ],
    },
  },
  insideCore('store', ['domain']),
  insideCore('jira', ['domain']),
  {
    files: ['packages/core/src/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['../*'], message: 'core/domain imports nothing outside itself (ADR 0014).' },
            { group: ['node:*'], message: 'core/domain is pure: no I/O (ADR 0014).' },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        noDefaultExport,
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: 'core/domain receives the time; it never reads the clock.',
        },
        {
          selector: "MemberExpression[object.name='Date'][property.name='now']",
          message: 'core/domain receives the time; it never reads the clock.',
        },
        {
          selector: "MemberExpression[object.name='Math'][property.name='random']",
          message: 'core/domain is deterministic.',
        },
      ],
    },
  },
);
